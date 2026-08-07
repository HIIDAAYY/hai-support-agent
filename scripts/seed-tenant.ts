/**
 * Seed one or more tenants' knowledge bases into Pinecone.
 *
 *   npm run kb:seed -- glow-clinic
 *   npm run kb:seed -- glow-clinic ira-skincare
 *   npm run kb:seed -- --all
 *   npm run kb:seed -- --list
 *
 * Reads data/clinics/<id>-faq.md and writes to the Pinecone namespace <id>.
 * Idempotent: each namespace is cleared before re-upload, so running it twice
 * does not duplicate vectors (item ids are random UUIDs, so upsert alone would
 * accumulate copies).
 *
 * Embeddings go through lib/pinecone (Pinecone Inference, multilingual-e5-large,
 * "passage" mode) — the same model the chat route queries with. Seeding through
 * any other embedding provider would put vectors in a different space and
 * silently break retrieval.
 *
 * Replaces the old per-tenant uploaders (upload-hijab, upload-vorta-faq,
 * upload-batch2, upload-5-clinics, upload-multi-clinic-faq, …).
 */
import "./lib/env";
import { loadTenantFAQ, resolveTenantIds, discoverTenantIds } from "./lib/faq";
import { getPineconeIndex, upsertTextsToNamespace } from "../lib/pinecone";

interface SeedResult {
  tenantId: string;
  name: string;
  count: number;
  ok: boolean;
}

async function seedTenant(tenantId: string): Promise<SeedResult> {
  console.log(`\n${"=".repeat(70)}`);
  const { name, items } = loadTenantFAQ(tenantId);
  console.log(`🏥 ${name}  (namespace: ${tenantId})`);
  console.log("=".repeat(70));

  if (items.length === 0) {
    console.warn(`⚠️  No Q&A parsed — skipping (namespace left untouched).`);
    return { tenantId, name, count: 0, ok: false };
  }

  console.log(`📖 Parsed ${items.length} Q&A pairs`);

  // Clear first so re-runs replace rather than accumulate.
  try {
    await getPineconeIndex().namespace(tenantId).deleteAll();
    console.log(`🧹 Cleared existing vectors in "${tenantId}"`);
  } catch {
    // deleteAll 404s when the namespace does not exist yet — that is fine.
    console.log(`(namespace "${tenantId}" was empty or new)`);
  }

  const payload = items.map((item) => ({
    id: item.id,
    text: item.text,
    metadata: {
      question: item.question,
      answer: item.answer,
      category: item.category,
      clinicId: item.tenantId,
      clinicName: item.tenantName,
      source: "clinic",
    },
  }));

  console.log(`📤 Uploading ${payload.length} vectors...`);
  const result = await upsertTextsToNamespace(payload, tenantId);
  console.log(`✅ Uploaded ${result.count} vectors to namespace "${result.namespace}"`);

  return { tenantId, name, count: result.count, ok: true };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list")) {
    const ids = discoverTenantIds();
    console.log(`\n📋 ${ids.length} tenant(s) with a FAQ file:\n`);
    ids.forEach((id) => console.log(`   ${id}`));
    console.log("");
    return;
  }

  const tenantIds = resolveTenantIds(args);

  if (tenantIds.length === 0) {
    console.error("Usage: npm run kb:seed -- <tenantId> [tenantId...]");
    console.error("       npm run kb:seed -- --all");
    console.error("       npm run kb:seed -- --list");
    process.exit(1);
  }

  console.log(`\n🚀 Seeding ${tenantIds.length} tenant(s) into Pinecone`);

  const results: SeedResult[] = [];
  for (const tenantId of tenantIds) {
    try {
      results.push(await seedTenant(tenantId));
    } catch (error) {
      console.error(`❌ Failed to seed ${tenantId}:`, error);
      results.push({ tenantId, name: tenantId, count: 0, ok: false });
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("📈 SUMMARY");
  console.log("=".repeat(70));
  results.forEach((r) =>
    console.log(`   ${r.ok ? "✅" : "❌"} ${r.tenantId}: ${r.count} vectors`)
  );

  const total = results.reduce((sum, r) => sum + r.count, 0);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n📊 Total vectors uploaded: ${total}`);
  console.log(`🌐 Try one: http://localhost:3000?clinicId=${results[0]?.tenantId ?? ""}\n`);

  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
