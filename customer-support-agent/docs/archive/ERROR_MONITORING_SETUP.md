# Error Monitoring Setup Guide

## Quick Start (5 minutes)

Error monitoring sends critical errors to your Discord/Slack channel automatically, so you know about problems before your customers complain.

### Option A: Discord Webhook (Recommended)

**Step 1: Create Discord Webhook**
1. Open your Discord server
2. Go to Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Name it "Error Monitor" (or anything you like)
5. Select channel (e.g., #errors or #alerts)
6. Click "Copy Webhook URL"

**Step 2: Add to Environment**
Add to `.env.local`:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE
```

**Step 3: Test**
```bash
npx tsx scripts/test-error-monitor.ts
```

You should see a test message in your Discord channel!

---

### Option B: Slack Webhook

**Step 1: Create Slack Webhook**
1. Go to https://api.slack.com/apps
2. Create New App → From Scratch
3. Enable "Incoming Webhooks"
4. Add New Webhook to Workspace
5. Select channel (#errors or #alerts)
6. Copy Webhook URL

**Step 2: Add to Environment**
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Step 3: Test**
```bash
npx tsx scripts/test-error-monitor.ts
```

---

## What Gets Monitored

### Critical Errors (Immediate Alert)
- ❌ Database connection failures
- ❌ Database query errors
- ❌ Non-operational errors (bugs)

### High Priority (Alert)
- ⚠️ Claude API failures
- ⚠️ Payment processing errors
- ⚠️ Security issues

### Medium Priority (Logged, not alerted)
- 🔍 RAG/Pinecone errors (fallback exists)
- 🔍 Twilio WhatsApp errors

### Rate Limiting
- Maximum 1 alert per minute (prevents spam)
- Errors are always logged locally even if not sent to webhook

---

## Alert Examples

When an error occurs, you'll get a message like:

```
🚨 CRITICAL ERROR

Message: Database Error: Connection refused

Error:
Error: connect ECONNREFUSED 127.0.0.1:5432
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1555:16)

Context:
{
  "operation": "booking.create",
  "customerId": "cust_123",
  "clinicId": "glow-clinic"
}

Error Count: 1
Time: 2024-01-15T10:30:45.123Z
```

---

## Test Script

Create `scripts/test-error-monitor.ts`:

```typescript
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { errorMonitor } from "../app/lib/error-monitor";

async function testErrorMonitor() {
  console.log("🧪 Testing error monitor webhook...\n");

  // Test basic webhook
  const webhookOk = await errorMonitor.testWebhook();

  if (!webhookOk) {
    console.error("❌ Webhook test failed!");
    console.error("Check that DISCORD_WEBHOOK_URL or SLACK_WEBHOOK_URL is set in .env.local");
    process.exit(1);
  }

  console.log("\n✅ Error monitoring is working!");
  console.log("You should have received a test message in your channel.");
}

testErrorMonitor();
```

Run with:
```bash
npx tsx scripts/test-error-monitor.ts
```

---

## Production Checklist

Before launching to customers:

- [ ] Discord/Slack webhook configured
- [ ] Webhook tested successfully
- [ ] Channel notifications enabled
- [ ] Team members added to error channel
- [ ] Rate limiting tested (send multiple errors)
- [ ] Alert format is readable

---

## Troubleshooting

### "Webhook test failed"
- Check webhook URL is correct (no spaces, full URL)
- Verify webhook hasn't been deleted in Discord/Slack
- Check internet connection
- Try regenerating the webhook

### "No alerts received"
- Check `NODE_ENV=production` in .env (monitoring only enabled in production)
- Verify error is critical/high severity
- Check rate limiting (wait 1 minute between tests)
- Look at console logs for "Failed to send error to monitor"

### "Too many alerts"
- Rate limiting should prevent spam (1 per minute)
- If still too many, adjust `rateLimitMs` in `error-monitor.ts`
- Consider grouping similar errors

---

## Cost

✅ **FREE!**
- Discord webhooks: Unlimited, free
- Slack webhooks: Free tier includes webhooks
- No subscription needed

## Upgrading to Sentry (Later)

If you want more features later:
1. Sign up for Sentry (free tier: 5,000 errors/month)
2. Install: `npm install @sentry/nextjs`
3. Configure Sentry DSN
4. Sentry provides:
   - Error grouping
   - User sessions
   - Performance monitoring
   - Release tracking

But webhook monitoring is sufficient for MVP!

---

## Need Help?

Common issues:
- **No webhook URL**: Set DISCORD_WEBHOOK_URL or SLACK_WEBHOOK_URL in .env.local
- **Webhook deleted**: Regenerate in Discord/Slack settings
- **Not in production**: Set NODE_ENV=production to enable monitoring
