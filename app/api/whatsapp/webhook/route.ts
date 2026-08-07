import { NextRequest, NextResponse } from 'next/server';
import {
  sendWhatsAppMessage,
  sendWhatsAppMessageWithQuestions,
} from '@/app/lib/twilio-client';
import {
  getSession,
  addUserMessage,
  addAssistantMessage,
} from '@/app/lib/whatsapp-session';
import {
  updateConversationMetadata,
  redirectConversation,
} from '@/app/lib/db-service';
import {
  logError,
  DatabaseError,
  TwilioError,
  getEmergencyResponse,
} from '@/app/lib/error-handler';
import { detectKnowledgeBase } from '@/app/lib/utils';
import {
  DEFAULT_TENANT_ID,
  getTenantIdByWhatsAppNumber,
  getTenantName,
} from '@/app/lib/tenants';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Work out which clinic an inbound WhatsApp message belongs to.
 *
 * The chat route overwrites knowledgeBaseId from whatever clinicId it is given
 * (defaulting to DEFAULT_TENANT_ID), so a webhook that sends no clinicId has
 * its knowledge-base detection silently discarded. Resolving it here is what
 * makes that detection count.
 *
 * Priority, most to least specific:
 *   1. The number the customer messaged, when a tenant owns it outright.
 *   2. A clinic named in this message.
 *   3. The clinic this conversation already settled on — so a follow-up like
 *      "berapa harganya?" stays with the clinic being discussed.
 *   4. WHATSAPP_DEMO_CLINIC_ID, for a shared sandbox sender.
 *   5. The default tenant.
 */
async function resolveClinicId(
  toNumber: string,
  body: string,
  conversationId?: string
): Promise<{ clinicId: string; reason: string }> {
  const byNumber = toNumber ? getTenantIdByWhatsAppNumber(toNumber) : undefined;
  if (byNumber) return { clinicId: byNumber, reason: `dedicated number ${toNumber}` };

  const detected = detectKnowledgeBase(body);
  if (detected?.clinicId) {
    return { clinicId: detected.clinicId, reason: 'keyword in message' };
  }

  if (conversationId) {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { metadata: true },
      });
      const saved = (conversation?.metadata as any)?.lastDetectedClinicId;
      if (saved) return { clinicId: saved, reason: 'saved on conversation' };
    } catch (error) {
      console.error('Error reading saved clinic from conversation:', error);
    }
  }

  const fromEnv = process.env.WHATSAPP_DEMO_CLINIC_ID;
  if (fromEnv) return { clinicId: fromEnv, reason: 'WHATSAPP_DEMO_CLINIC_ID' };

  return { clinicId: DEFAULT_TENANT_ID, reason: 'default tenant' };
}

/**
 * WhatsApp Webhook - Receives incoming WhatsApp messages from Twilio
 * POST /api/whatsapp/webhook
 */
export async function POST(req: NextRequest) {
  let from = '';

  try {
    // Parse form data from Twilio
    const formData = await req.formData();
    from = formData.get('From') as string; // Sender's WhatsApp number
    const to = (formData.get('To') as string) || ''; // OUR number they messaged
    const body = formData.get('Body') as string; // Message text
    const messageSid = formData.get('MessageSid') as string;

    console.log('=== Incoming WhatsApp Message ===');
    console.log('From:', from);
    console.log('Message:', body);
    console.log('MessageSid:', messageSid);

    // Validate required fields
    if (!from || !body) {
      console.error('Missing required fields: From or Body');
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Get or create session for this phone number (now async)
    let session = await getSession(from);

    // Add user message to session (now async)
    await addUserMessage(from, body);

    // IMPORTANT: Refresh session to get updated messages array after adding new message
    session = await getSession(from);

    console.log(
      `Session for ${from} has ${session.messages.length} messages. Conversation ID: ${session.conversationId}`
    );

    // ============================================
    // BUSINESS DETECTION for Booking System
    // ============================================
    // Check if the incoming number belongs to a Business (beauty clinic or travel agency)
    // This allows the bot to know which business context it's operating in
    let businessContext: any = null;
    try {
      const business = await prisma.business.findUnique({
        where: { phoneNumber: from },
        include: {
          settings: true,
        },
      });

      if (business) {
        businessContext = {
          businessId: business.id,
          businessName: business.name,
          businessType: business.type,
          settings: business.settings,
        };
        console.log(`🏢 Business detected: ${business.name} (${business.type})`);
      } else {
        console.log(`👤 Customer number detected (not a business): ${from}`);
      }
    } catch (error) {
      console.error('Error detecting business:', error);
      // Continue without business context
    }

    // Resolve which clinic this message is for. Sending clinicId is what makes
    // it stick: the chat route derives knowledgeBaseId from clinicId and
    // ignores any knowledgeBaseId passed alongside it.
    const { clinicId, reason } = await resolveClinicId(
      to,
      body,
      session.conversationId
    );
    console.log(
      `🏥 WhatsApp routed to ${getTenantName(clinicId)} (${clinicId}) — via ${reason}`
    );

    // Remember the clinic so later messages in this thread stay with it even
    // when they contain no clinic keyword ("berapa harganya?").
    if (session.conversationId) {
      try {
        await updateConversationMetadata(session.conversationId, {
          lastDetectedClinicId: clinicId,
        });
      } catch (error) {
        console.error('Error saving clinic context to conversation:', error);
      }
    }

    // Call existing chat API with session history
    const chatResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: session.messages,
          model: 'claude-haiku-4-5-20251001', // Use Haiku for fast responses
          clinicId, // Drives knowledgeBaseId + namespace isolation in /api/chat
          businessContext, // Pass business context to chat API
          customerId: session.customerId, // IMPORTANT: Pass customerId for tool execution (booking, etc)
          sessionId: session.conversationId, // Session ID for persistence
        }),
      }
    );

    if (!chatResponse.ok) {
      console.error('Chat API error:', chatResponse.statusText);
      throw new Error('Failed to get response from chat API');
    }

    const chatData = await chatResponse.json();
    console.log('Chat API response:', chatData);

    // Helper function to extract actual response from nested JSON
    const extractActualResponse = (responseStr: string): string => {
      if (!responseStr) return '';

      let result = responseStr.trim();

      // Check if response is a JSON code block
      const codeBlockMatch = result.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
      if (codeBlockMatch) {
        result = codeBlockMatch[1].trim();
        console.log('🔧 WhatsApp: Extracted from code block');
      }

      // Check if the content is JSON with a 'response' field
      if (result.startsWith('{')) {
        try {
          const innerParsed = JSON.parse(result);
          if (innerParsed.response && typeof innerParsed.response === 'string') {
            console.log('🔧 WhatsApp: Extracted nested response field');
            // Recursively extract in case of multiple nesting
            return extractActualResponse(innerParsed.response);
          }
        } catch (e) {
          // Not valid JSON, return as-is
        }
      }

      return result;
    };

    // Extract response parts
    const responseText = extractActualResponse(chatData.response) || 'Maaf, terjadi kesalahan.';
    const suggestedQuestions = chatData.suggested_questions || [];
    const shouldRedirect = chatData.redirect_to_agent?.should_redirect || false;
    const userMood = chatData.user_mood;
    const categories = chatData.matched_categories || [];
    const contextUsed = chatData.debug?.context_used || false;

    // Add assistant message to session (now async)
    await addAssistantMessage(from, responseText);

    // Save conversation metadata to database
    if (session.conversationId) {
      try {
        await updateConversationMetadata(session.conversationId, {
          userMood,
          categories,
          contextUsed,
          wasRedirected: shouldRedirect,
          redirectReason: chatData.redirect_to_agent?.reason,
        });
        console.log(`Saved metadata for conversation ${session.conversationId}`);
      } catch (metadataError) {
        // Log but don't fail the request if metadata save fails
        logError(metadataError as Error, {
          conversationId: session.conversationId,
          phoneNumber: from,
        });
      }
    }

    // Send response via WhatsApp
    if (shouldRedirect) {
      // Mark conversation as redirected in database
      if (session.conversationId) {
        try {
          await redirectConversation(
            session.conversationId,
            chatData.redirect_to_agent?.reason || 'User requested human agent'
          );
        } catch (redirectError) {
          logError(redirectError as Error, {
            conversationId: session.conversationId,
          });
        }
      }

      // Handle redirect to human agent
      const redirectMessage = `${responseText}\n\n🙋 *Butuh bantuan lebih lanjut?*\nTim customer service kami siap membantu Anda. Silakan hubungi kami melalui:\n📞 WhatsApp: +62 812-9876-5432\n📧 Email: info@klinikkecantikangigi.com`;

      console.log('📤 Sending redirect message to WhatsApp:', redirectMessage.substring(0, 200));
      await sendWhatsAppMessage(from, redirectMessage);
      console.log('✅ Redirect message sent');
    } else if (suggestedQuestions.length > 0) {
      // Send with suggested questions
      await sendWhatsAppMessageWithQuestions(
        from,
        responseText,
        suggestedQuestions
      );
    } else {
      // Send plain response
      await sendWhatsAppMessage(from, responseText);
    }

    console.log('✅ WhatsApp response sent successfully');

    // Return TwiML response (required by Twilio)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    logError(error as Error, { from, messageBody: 'truncated for security' });

    // Try to send error message to user
    try {
      if (from) {
        const errorResponse = getEmergencyResponse('id');
        await sendWhatsAppMessage(from, errorResponse.response);
      }
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
      logError(sendError as Error, { from });
    }

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  }
}

/**
 * GET endpoint for webhook verification (optional)
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'WhatsApp webhook is active',
    endpoint: '/api/whatsapp/webhook',
  });
}
