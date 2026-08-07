/**
 * Shared helpers for the tenant knowledge-base scripts.
 *
 * A tenant's knowledge base is one markdown file at
 * `data/clinics/<tenantId>-faq.md`, and it lands in the Pinecone namespace
 * named exactly `<tenantId>`. That convention is the single source of truth —
 * the tenant list is discovered from disk rather than hardcoded, so adding a
 * clinic means adding one file and nothing else.
 */
import fs from "fs";
import path from "path";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CLINIC_DATA_DIR = resolve(__dirname, "../../data/clinics");

const FAQ_SUFFIX = "-faq.md";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  /** Question + answer, the text that actually gets embedded. */
  text: string;
  tenantId: string;
  tenantName: string;
}

/** Every tenant id that has a FAQ file on disk, sorted. */
export function discoverTenantIds(): string[] {
  if (!fs.existsSync(CLINIC_DATA_DIR)) return [];
  return fs
    .readdirSync(CLINIC_DATA_DIR)
    .filter((f) => f.endsWith(FAQ_SUFFIX))
    .map((f) => f.slice(0, -FAQ_SUFFIX.length))
    .sort();
}

export function faqPathFor(tenantId: string): string {
  return path.join(CLINIC_DATA_DIR, `${tenantId}${FAQ_SUFFIX}`);
}

/**
 * Turn CLI arguments into a tenant list.
 * `--all` (or `all`) means every tenant found on disk. Unknown ids abort
 * loudly rather than silently seeding nothing.
 */
export function resolveTenantIds(args: string[]): string[] {
  const available = discoverTenantIds();

  if (args.length === 0) return [];
  if (args.includes("--all") || args.includes("all")) return available;

  const unknown = args.filter((id) => !available.includes(id));
  if (unknown.length > 0) {
    console.error(`❌ Unknown tenant id(s): ${unknown.join(", ")}`);
    console.error(`   Expected a FAQ file at ${CLINIC_DATA_DIR}/<id>${FAQ_SUFFIX}`);
    console.error(`\n   Available: ${available.join(", ")}`);
    process.exit(1);
  }
  return args;
}

/**
 * Display name for a tenant, read from its FAQ file.
 *
 * This is used only as the source label in the knowledge-base sidebar — the
 * name the bot actually speaks comes from getClinicNameById() in the chat
 * route. Prefers the `title:` frontmatter, falls back to the `# ` heading,
 * then to the id itself.
 */
export function displayNameFor(tenantId: string, content: string): string {
  const title = content.match(/^title:\s*(.+)$/m)?.[1]?.trim();
  if (title) return title.replace(/\s+FAQ Knowledge Base$/i, "").trim();

  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) {
    return heading
      .replace(/^[^\p{L}\p{N}]+/u, "") // strip leading emoji / punctuation
      .replace(/^Knowledge Base\s*[-–—]\s*/i, "")
      .trim();
  }

  return tenantId;
}

/**
 * Parse a clinic FAQ markdown file into Q&A items.
 *
 *   "## Category"   -> category
 *   "### Q: ..."    -> question (a bare "### ..." works too)
 *   "A: ..."        -> answer, continuing until the next "###"
 */
export function parseFAQ(
  content: string,
  tenantId: string,
  tenantName: string
): FAQItem[] {
  const items: FAQItem[] = [];

  // Everything before the first "## " is frontmatter / title, not a category.
  const categoryBlocks = content.split(/^## /m).slice(1);

  for (const block of categoryBlocks) {
    const lines = block.split("\n");
    const category = lines[0].trim();

    let question = "";
    let answer = "";
    let inAnswer = false;

    const push = () => {
      if (!question || !answer.trim()) return;
      items.push({
        id: `${tenantId}-${randomUUID()}`,
        question,
        answer: answer.trim(),
        category,
        text: `${question}\n\n${answer.trim()}`,
        tenantId,
        tenantName,
      });
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("### ")) {
        push();
        question = line.replace(/^### /, "").replace(/^Q: /, "").trim();
        answer = "";
        inAnswer = true;
        continue;
      }

      if (!inAnswer) continue;

      if (line.trim().length > 0) {
        // Drop the "A: " marker on the answer's first line only.
        answer += (answer === "" ? line.replace(/^A: /, "") : line) + "\n";
      } else {
        // Keep blank lines that sit *inside* an answer, drop the trailing one.
        const nextIdx = lines.slice(i + 1).findIndex((l) => l.trim().length > 0);
        if (nextIdx >= 0 && !lines[i + nextIdx + 1]?.startsWith("### ")) {
          answer += "\n";
        }
      }
    }

    push();
  }

  return items;
}

/** Read + parse one tenant's FAQ file. Returns [] if the file is missing. */
export function loadTenantFAQ(tenantId: string): {
  name: string;
  items: FAQItem[];
} {
  const filePath = faqPathFor(tenantId);
  if (!fs.existsSync(filePath)) {
    console.error(`   ❌ FAQ file not found: ${filePath}`);
    return { name: tenantId, items: [] };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const name = displayNameFor(tenantId, content);
  return { name, items: parseFAQ(content, tenantId, name) };
}
