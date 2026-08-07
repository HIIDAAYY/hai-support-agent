/**
 * Inspect the Pinecone knowledge base.
 *
 *   npm run kb:inspect                  # index totals + every namespace
 *   npm run kb:inspect -- glow-clinic   # drill into one tenant, sample its Q&A
 *   npm run kb:inspect -- --drift       # compare data/clinics/ against the index
 *
 * Replaces check-pinecone-data, check-uploaded-data, list-all-data,
 * list-pinecone-vectors and analyze-pinecone-data, which each printed a
 * slightly different slice of the same two API calls.
 */
import "./lib/env";
import { getPineconeIndex } from "../lib/pinecone";
import { discoverTenantIds, loadTenantFAQ } from "./lib/faq";

/** Per-tenant namespaces only — the unnamed default is reported separately. */
async function namespaceCounts(): Promise<Record<string, number>> {
  const stats = await getPineconeIndex().describeIndexStats();
  const out: Record<string, number> = {};
  for (const [name, info] of Object.entries(stats.namespaces ?? {})) {
    if (!name) continue;
    out[name] = (info as any)?.recordCount ?? 0;
  }
  return out;
}

/**
 * Vectors sitting in the unnamed default namespace.
 *
 * Nothing should live here. Namespaced queries never reach it, so its contents
 * are invisible to the normal retrieval path — but the legacy fallback branches
 * in app/lib/utils.ts (a "clinic" filter with no clinicId) DO query it, and
 * anything found there is unisolated: one query can pull several clinics' Q&A
 * at once. Reporting it separately is deliberate; hiding it is how 358 stale
 * vectors went unnoticed.
 */
async function defaultNamespaceCount(): Promise<number> {
  const stats = await getPineconeIndex().describeIndexStats();
  const entry = Object.entries(stats.namespaces ?? {}).find(([name]) => !name);
  return (entry?.[1] as any)?.recordCount ?? 0;
}

async function overview() {
  const index = getPineconeIndex();
  const stats = await index.describeIndexStats();
  const counts = await namespaceCounts();
  const names = Object.keys(counts).sort();
  const tenantTotal = names.reduce((sum, n) => sum + counts[n], 0);
  const orphaned = await defaultNamespaceCount();

  console.log(`\n${"=".repeat(70)}`);
  console.log(`📊 PINECONE INDEX: ${process.env.PINECONE_INDEX_NAME}`);
  console.log("=".repeat(70));
  console.log(`   Dimension:     ${stats.dimension}`);
  console.log(`   Total vectors: ${stats.totalRecordCount ?? 0}`);
  console.log(`   Namespaces:    ${names.length}\n`);

  names.forEach((n) => console.log(`   ${n.padEnd(28)} ${counts[n]} vectors`));
  console.log(`\n   ${"in tenant namespaces".padEnd(28)} ${tenantTotal} vectors`);

  if (orphaned > 0) {
    console.log(`   ${"in DEFAULT namespace".padEnd(28)} ${orphaned} vectors  ⚠️`);
    console.log(
      `\n   ⚠️  ${orphaned} vectors sit outside any tenant namespace. They predate`
    );
    console.log(
      `      namespace isolation, so a query that reaches them is not scoped to`
    );
    console.log(`      one clinic.`);
    console.log(
      `      kb:purge will NOT remove them: kb:seed cannot rebuild the default`
    );
    console.log(`      namespace, so clearing it is irreversible. Decide manually.`);
  }
  console.log("");
}

async function drift() {
  const counts = await namespaceCounts();
  const onDisk = discoverTenantIds();
  const inIndex = Object.keys(counts);

  const notSeeded = onDisk.filter((id) => !inIndex.includes(id));
  const orphaned = inIndex.filter((id) => !onDisk.includes(id));

  console.log(`\n${"=".repeat(70)}`);
  console.log("🔍 DRIFT: data/clinics/ vs Pinecone");
  console.log("=".repeat(70));
  console.log(`   FAQ files on disk:    ${onDisk.length}`);
  console.log(`   Namespaces in index:  ${inIndex.length}\n`);

  if (notSeeded.length > 0) {
    console.log(`   ⚠️  Has a FAQ file but no vectors (${notSeeded.length}):`);
    notSeeded.forEach((id) => console.log(`      ${id}`));
    console.log(`      Fix: npm run kb:seed -- ${notSeeded.join(" ")}\n`);
  }

  if (orphaned.length > 0) {
    console.log(`   ⚠️  In the index but no FAQ file (${orphaned.length}):`);
    orphaned.forEach((id) => console.log(`      ${id.padEnd(28)} ${counts[id]} vectors`));
    console.log(`      Fix: npm run kb:purge -- ${orphaned.join(" ")} --yes\n`);
  }

  // Count drift catches vectors left behind by the old non-idempotent
  // uploaders: item ids are random UUIDs, so re-running one of those simply
  // added a second copy of every Q&A instead of replacing it. Duplicates are
  // invisible in a namespace listing but they crowd out real hits at query time.
  const mismatched: Array<{ id: string; file: number; index: number }> = [];
  for (const id of onDisk) {
    if (!inIndex.includes(id)) continue;
    const file = loadTenantFAQ(id).items.length;
    const index = counts[id] ?? 0;
    if (file !== index) mismatched.push({ id, file, index });
  }

  if (mismatched.length > 0) {
    console.log(`   ⚠️  Vector count does not match the FAQ file (${mismatched.length}):`);
    mismatched.forEach((m) => {
      const ratio = m.file > 0 ? (m.index / m.file).toFixed(1) : "?";
      console.log(
        `      ${m.id.padEnd(28)} file ${String(m.file).padStart(3)}  index ${String(m.index).padStart(3)}  (${ratio}×)`
      );
    });
    console.log(
      `      Fix: npm run kb:seed -- ${mismatched.map((m) => m.id).join(" ")}\n`
    );
  }

  if (notSeeded.length === 0 && orphaned.length === 0 && mismatched.length === 0) {
    console.log("   ✅ In sync — every FAQ file has a namespace, and counts match.\n");
  }
}

async function detail(tenantId: string) {
  const counts = await namespaceCounts();
  const { name, items } = loadTenantFAQ(tenantId);

  console.log(`\n${"=".repeat(70)}`);
  console.log(`🏥 ${name}  (${tenantId})`);
  console.log("=".repeat(70));
  console.log(`   Q&A pairs in file:  ${items.length}`);
  console.log(`   Vectors in index:   ${counts[tenantId] ?? 0}`);

  if (items.length !== (counts[tenantId] ?? 0)) {
    console.log(`   ⚠️  Mismatch — re-seed with: npm run kb:seed -- ${tenantId}`);
  }

  const categories = [...new Set(items.map((i) => i.category))];
  console.log(`\n   Categories (${categories.length}):`);
  categories.forEach((c) => {
    const n = items.filter((i) => i.category === c).length;
    console.log(`      ${c} — ${n}`);
  });

  console.log(`\n   Sample Q&A:`);
  items.slice(0, 3).forEach((i) => {
    console.log(`      Q: ${i.question}`);
    console.log(`      A: ${i.answer.split("\n")[0].slice(0, 90)}...\n`);
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--drift")) {
    await drift();
    return;
  }

  const tenantId = args.find((a) => !a.startsWith("--"));
  if (tenantId) {
    await detail(tenantId);
    return;
  }

  await overview();
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
