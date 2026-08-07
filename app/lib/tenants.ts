/**
 * Tenant (clinic) registry — the single source of truth for per-clinic data.
 *
 * This used to live as five separate maps keyed by clinicId inside
 * app/api/chat/route.ts: a name map, a contact map, a basics map, a
 * strict-scope Set, and a hardcoded `activeClinicId === "lumina-medspa"`
 * check. Adding or renaming a clinic meant editing all five and hoping none
 * were missed — and a duplicate key in one of them was a silent override
 * rather than an error.
 *
 * One entry per tenant now. Everything optional falls back to the defaults
 * below, which is why most tenants need only a `name`.
 */

export interface TenantContact {
  /** Public WhatsApp number shown for bookings and complaints. */
  whatsapp: string;
  /** Number given for medical escalations. Usually the same as whatsapp. */
  emergency: string;
}

export interface Tenant {
  /** Full display name. This is the name the bot speaks. */
  name: string;

  /** Escalation contacts. Falls back to DEFAULT_CONTACT when absent. */
  contact?: TenantContact;

  /**
   * Location / hours / payment facts injected into the system prompt so the
   * bot answers the first questions people try without falling back to
   * "not in my knowledge base". Receives the tenant's own resolved contact.
   */
  basics?: (contact: TenantContact) => string;

  /**
   * Hard scope guard in the prompt: answer only for this clinic, never name or
   * invent another brand, and base every factual answer on retrieved context.
   *
   * ON by default — set `false` to opt out. It used to be opt-in, which is how
   * Airin Skin Clinic ended up reciting Glow's address and price list: nothing
   * told the model to stay inside Airin's retrieved context, and the prompt
   * handed it Glow's facts. Only tenants whose facts live in the prompt rather
   * than in a knowledge base should opt out.
   */
  strictScope?: boolean;

  /**
   * The WhatsApp Business number that routes to THIS tenant — i.e. the number
   * customers message, which arrives as Twilio's `To` field on the webhook.
   *
   * Not the same thing as `contact.whatsapp`, which is the number shown to
   * customers inside an answer and may be a clinic's ordinary line (or, for
   * demo tenants, a fictional one).
   *
   * Left unset while every demo shares one Twilio sandbox number: with no
   * mapping, the webhook falls back to keyword detection and the env override.
   * Set it once a clinic gets its own WABA sender.
   */
  whatsappNumber?: string;

  /**
   * Present only for prompt-only demo tenants: those carrying their entire
   * service menu, pricing and persona in the prompt itself, with no database
   * seed behind them.
   *
   * Its presence is what marks a tenant prompt-only — the chat route derives
   * that from this field rather than keeping a separate boolean, so the flag
   * and the prompt cannot drift apart. Prompt-only tenants must not receive
   * the IDR catalog or the booking tools; either would drag answers back to
   * Rupiah and to a database that has no rows for them.
   */
  promptOnlyIntro?: (name: string) => string;
}

/** Tenant used when a request arrives without a clinicId. */
export const DEFAULT_TENANT_ID = "glow-clinic";

/** Name for clinicIds absent from the registry. Unchanged legacy behavior. */
export const FALLBACK_TENANT_NAME =
  "Klinik Kecantikan & Gigi (Beauty & Dental Clinic)";

/** Contacts for tenants without their own. Unchanged legacy behavior. */
export const DEFAULT_CONTACT: TenantContact = {
  whatsapp: "+62 812-8888-5555",
  emergency: "+62 811-9999-5555",
};

export const TENANTS: Record<string, Tenant> = {
  // ── English / USD demo tenant ────────────────────────────────────────────
  "lumina-medspa": {
    name: "Lumina Medspa",
    contact: { whatsapp: "+1 (415) 555-0142", emergency: "+1 (415) 555-0142" },
    // Facts live in promptOnlyIntro, not in a knowledge base, so the
    // answer-only-from-retrieved-context guard would gag it.
    strictScope: false,
    basics: () => `- Location: 340 Union Street, Suite 200, San Francisco, CA 94133.
- Opening hours: Mon–Fri 9:00 AM–7:00 PM, Sat 10:00 AM–5:00 PM. Closed Sundays & public holidays.
- Contact: text/call +1 (415) 555-0142 · you can also book right here in this chat.
- Booking & reschedule: booking is free; reschedule or cancel up to 24h before your appointment at no charge.
- Payment: all major cards, Apple Pay, and HSA/FSA accepted. Prices in USD.
- Lead provider: Dr. Emily Carter, MD (board-certified).`,
    promptOnlyIntro: (
      clinicName
    ) => `You are Ava, the friendly virtual assistant for ${clinicName}, a modern medical spa in San Francisco. You help clients with treatment info, pricing, availability, and booking requests.

  **Voice & style:**
  - Warm, polished, and concise — like a great front-desk concierge, not a robot.
  - Always reply in English.
  - Use the client's name once they share it. Light, tasteful emoji is fine (not every line).
  - Never say "As an AI" or "As a virtual assistant."

  **Service menu (prices in USD — you HAVE this list, so quote it directly; never say you need to check or defer pricing to a call):**
  - ✨ Signature HydraFacial — $199 (60 min) — deep cleanse + hydration glow.
  - 💧 Custom Facial — $149 (50 min) — tailored to your skin concern.
  - 🎯 Acne Clear Treatment — $179 (60 min) — for active breakouts.
  - 💎 Microneedling — $299 (75 min) — texture, scars & fine lines.
  - 🌟 Chemical Peel — $175 (45 min) — brightening & renewal.
  - 👑 Botox — from $12/unit · Dermal Fillers — from $650/syringe (consult required).

  **When asked about prices or the menu, LIST the relevant items with their USD prices immediately.** Example:
  Client: "What facials do you have and how much?"
  You: "Happy to help! ✨ Here are our facials:
  • Signature HydraFacial — $199 (60 min)
  • Custom Facial — $149 (50 min)
  • Acne Clear Treatment — $179 (60 min)
  Want me to recommend one for your skin, or shall I get you booked in?"

  **Booking (DEMO — lead capture, no live database):**
  - When a client wants to book, act as a concierge collecting: (1) full name, (2) best phone or email, (3) preferred treatment, date & time.
  - Then confirm warmly: "Thanks {Name}! I've noted your request for {treatment} on {date}. Our team will text {contact} shortly to confirm. Anything else I can help with? 😊"

  **Safety:** For medical questions (pregnancy, medications, skin conditions), do NOT give definitive medical advice — recommend a consultation with Dr. Emily Carter and offer to book one.

  **Scope:** Only answer for ${clinicName}. If asked about other businesses or unrelated topics, politely redirect back to how you can help with ${clinicName}.`,
  },

  // ── Indonesian / IDR default tenant ──────────────────────────────────────
  "glow-clinic": {
    name: "Klinik Glow Aesthetics",
    contact: { whatsapp: "+62 811-1900-042", emergency: "+62 811-1900-042" },
    basics: (contact) => `- Location: Jl. Senopati No. 42, Kebayoran Baru, South Jakarta (near Senopati / Blok M).
- Opening hours: Mon–Sat 09:00–20:00, Sun 10:00–18:00 (WIB). Closed on public holidays.
- Contact: WhatsApp ${contact.whatsapp} · appointments can also be booked directly in this chat.
- Booking & reschedule: booking is free; reschedule/cancel up to 24h before your slot at no charge.
- Payment: cards, bank transfer, and e-wallets (GoPay/OVO/QRIS) accepted.
- Lead doctor: dr. Amanda Kusuma.`,
  },

  // ── Tenants demoed to real prospects (own escalation contacts) ───────────
  "vorta-clinic": {
    name: "Vorta Beauty Clinic",
    contact: { whatsapp: "+62 811-8883-318", emergency: "+62 811-8883-318" },
  },
  "ira-skincare": {
    name: "dr. Ira Skin Care & Slimming",
    contact: { whatsapp: "0821-3191-6900", emergency: "0821-3191-6900" },
  },
  "beauty-palace": {
    name: "Beauty Palace Aesthetic & Hair Transplant Center",
    contact: { whatsapp: "+62 852-8088-8118", emergency: "+62 852-8088-8118" },
  },
  "drkhe-co": {
    name: "dr. Khé & Co",
    contact: { whatsapp: "0813-8748-6516", emergency: "0813-8748-6516" },
  },
  "estetika-dental": {
    name: "Estetika Dental Clinic",
    contact: { whatsapp: "0812-1263-1323", emergency: "0812-1263-1323" },
  },
  "eva-mulia": {
    name: "Eva Mulia Clinic",
    contact: { whatsapp: "0878-4851-6888", emergency: "0878-4851-6888" },
  },
  "beautylosophy-clinic": {
    name: "The Clinic Beautylosophy",
    contact: { whatsapp: "+62 896-0807-6000", emergency: "+62 896-0807-6000" },
  },
  nanoglow: {
    name: "NanoGlow Aesthetic Clinic",
    contact: { whatsapp: "0851-1132-0929", emergency: "0851-1132-0929" },
  },
  "e3a-emily": {
    name: "E3A Emily Aesthetics & Anti Aging Clinic",
    contact: { whatsapp: "0817-9988-322", emergency: "0817-9988-322" },
  },
  "dc-beauty": {
    name: "DC Beauty Clinic",
    contact: { whatsapp: "0816-971-169", emergency: "0816-971-169" },
  },
  "dr-yustini": {
    name: "Klinik dr. Yustini",
    contact: { whatsapp: "0812-8045-6625", emergency: "0812-8045-6625" },
  },
  farla: {
    name: "Farla Aesthetic Clinic",
    contact: { whatsapp: "0812-1108-5805", emergency: "0812-1108-5805" },
  },

  // ── Research tenants (name only; defaults cover the rest) ────────────────
  "airin-skin": { name: "Airin Skin Clinic" },
  "beyoutiful-clinic": { name: "Beyoutiful Clinic" },
  "b-clinic": { name: "B Clinic Multi Medika" },
  "click-house": { name: "Click House" },
  "derma-express": { name: "Derma Express" },
  "dermies-max": { name: "Dermies Max" },
  euroskinlab: { name: "Euroskinlab" },
  "gloskin-aesthetic": { name: "Gloskin Aesthetic" },
  "jakarta-aesthetic": { name: "Jakarta Aesthetic Clinic" },
  "jasper-skincare": { name: "Jasper Skincare" },
  "kusuma-beauty": { name: "Kusuma Beauty Clinic" },
  "maharis-clinic": { name: "Maharis Clinic" },
  "nmw-skincare": { name: "NMW Skin Care" },
  "ovela-clinic": { name: "Ovela Clinic" },
  "promec-clinic": { name: "Promec Clinic" },
  "queen-plastic": { name: "Queen Plastic Surgery" },
  "sozo-skin": { name: "Sozo Skin Clinic" },
  "youth-beauty": { name: "Youth & Beauty Clinic" },
  "zap-premiere": { name: "ZAP Premiere" },

  // ── Sample verticals (non-clinic demos) ──────────────────────────────────
  "sample-ortodonti": { name: "Klinik Ortodonti & Behel Gigi" },
  "sample-spkk": { name: "Klinik Spesialis Kulit & Kelamin (SpKK)" },
  "sample-spgk": { name: "Klinik Spesialis Gizi Klinik (SpGK)" },
  "sample-hijab-shop": { name: "UrbanStyle Hijab Shop" },
};

export function getTenant(clinicId: string): Tenant | undefined {
  return TENANTS[clinicId];
}

/** Display name, or the generic fallback for unregistered ids. */
export function getTenantName(clinicId: string): string {
  return TENANTS[clinicId]?.name ?? FALLBACK_TENANT_NAME;
}

export function getTenantContact(clinicId: string): TenantContact {
  return TENANTS[clinicId]?.contact ?? DEFAULT_CONTACT;
}

/**
 * Business basics for the system prompt: address, hours, payment, lead doctor.
 *
 * Returns "" for a tenant that has none of its own. It used to fall back to the
 * default tenant's text, which put Glow's Senopati address and Glow's opening
 * hours into every other clinic's prompt — under a heading telling the model
 * these facts are "always known, use them directly". Airin Skin Clinic then
 * answered a location question with Glow's address while Airin's own knowledge
 * base sat unused in the retrieved context.
 *
 * An empty string is the honest answer: the caller omits the block entirely and
 * the bot falls back to the knowledge base, which is where that clinic's real
 * address lives.
 */
export function getTenantBasics(clinicId: string): string {
  const basics = TENANTS[clinicId]?.basics;
  return basics ? basics(getTenantContact(clinicId)) : "";
}

/**
 * Strict scope is the default: answer only for this clinic, and only from its
 * knowledge base. Opt OUT by setting strictScope: false — currently only the
 * two prompt-driven demo tenants do, since their facts live in the prompt
 * rather than in retrieved context.
 */
export function isStrictScopeTenant(clinicId: string): boolean {
  return TENANTS[clinicId]?.strictScope !== false;
}

/**
 * Reduce a phone number to digits so the same line matches however it is
 * written. Twilio sends "whatsapp:+14155238886"; a tenant may store
 * "+1 (415) 523-8886".
 */
function normalizePhone(raw: string): string {
  return raw.replace(/^whatsapp:/i, "").replace(/\D/g, "");
}

/**
 * Which tenant owns an inbound WhatsApp number (Twilio's `To` field).
 *
 * Returns undefined while tenants share a single sandbox sender — that is the
 * expected case today, not an error. Callers must have a fallback.
 */
export function getTenantIdByWhatsAppNumber(
  toNumber: string
): string | undefined {
  const target = normalizePhone(toNumber);
  if (!target) return undefined;

  return Object.entries(TENANTS).find(
    ([, tenant]) =>
      tenant.whatsappNumber && normalizePhone(tenant.whatsappNumber) === target
  )?.[0];
}

/**
 * Prompt-only tenants run tool-free and self-contained. Derived from the
 * presence of promptOnlyIntro so there is no separate flag to fall out of sync.
 */
export function isPromptOnlyTenant(clinicId: string): boolean {
  return typeof TENANTS[clinicId]?.promptOnlyIntro === "function";
}
