/**
 * Copy for the chat chrome — the opening screen, the quick-reply chips and the
 * composer placeholder.
 *
 * These are the only strings a visitor reads before typing anything, so they
 * cannot follow the visitor's language the way the model's answers do: they
 * render first. Hardcoding them in English meant an Indonesian prospect opening
 * the plain URL was greeted with "Here's how I can help" and saw Indonesian
 * only after they had already sent a message.
 *
 * Keyed by the tenant's locale (app/lib/tenants.ts) rather than by clinicId, so
 * a newly added Indonesian clinic inherits the right copy by declaring nothing.
 */

import {
  DEFAULT_TENANT_ID,
  getTenantLocale,
  type TenantLocale,
} from "@/app/lib/tenants";

export interface UiCopy {
  /** Heading on the empty-conversation screen. */
  welcomeHeading: string;
  /** The three capability lines under the heading, in render order. */
  welcomeBullets: [string, string, string];
  /**
   * Quick-reply chips. Each label is also the message sent on click, so these
   * must read as something a customer would actually type, not as a button
   * caption. "Bicara dengan orang" is one of the handoff keywords the system
   * prompt lists, so the Indonesian chip reaches the same escalation path the
   * English "Talk to a human" does.
   */
  quickReplies: [string, string, string];
  inputPlaceholder: string;
}

const COPY: Record<TenantLocale, UiCopy> = {
  id: {
    welcomeHeading: "Ini yang bisa saya bantu",
    welcomeBullets: [
      "Tanya soal layanan, harga, atau jadwal — saya jawab langsung, 24/7.",
      "Saya hanya menjawab dari informasi asli klinik ini — tidak mengarang.",
      "Mau booking? Saya bisa buatkan janjinya, dan menghubungkan ke tim kapan saja.",
    ],
    quickReplies: ["Layanan & harga", "Buat janji", "Bicara dengan orang"],
    inputPlaceholder: "Tulis pesan Anda di sini...",
  },
  en: {
    welcomeHeading: "Here's how I can help",
    welcomeBullets: [
      "Ask about our services, prices, or availability — I answer instantly, 24/7.",
      "I answer only from this business's real information — no made-up details.",
      "Ready to book? I can schedule appointments and hand off to a human anytime.",
    ],
    quickReplies: [
      "Services & prices",
      "Book an appointment",
      "Talk to a human",
    ],
    inputPlaceholder: "Type your message here...",
  },
};

/** Chrome copy for a tenant. Unregistered ids fall back to the default tenant. */
export function getUiCopy(clinicId: string | null): UiCopy {
  return COPY[getTenantLocale(clinicId ?? DEFAULT_TENANT_ID)];
}
