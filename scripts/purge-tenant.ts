/**
 * Delete a tenant's vectors from Pinecone by dropping its namespace.
 *
 *   npm run kb:purge -- vorta-clinic          # dry run: shows what would go
 *   npm run kb:purge -- vorta-clinic --yes    # actually deletes
 *   npm run kb:purge -- --all --yes           # every namespace in the index
 *
 * Deletion is a dry run unless --yes is passed. The scripts this replaces
 * (delete-all-vectors, delete-clinic-vectors, delete-old-clinic-vectors,
 * delete-urbanstyle-vectors, cleanup-pinecone-clinics, clear-pinecone) all
 * deleted immediately on run, with hardcoded targets and no confirmation.
 *
 * Namespaces are read from the live index, not from data/clinics — that is the
 * point of a purge tool: it has to reach tenants whose files are already gone.
 */
import "./lib/env";
import { getPineconeIndex } from "../lib/pinecone";

async function listNamespaces(): Promise<Record<string, number>> {
  const stats = await getPineconeIndex().describeIndexStats();
  const out: Record<string, number> = {};
  for (const [name, info] of Object.entries(stats.namespaces ?? {})) {
    out[name || "(default)"] = (info as any)?.recordCount ?? 0;
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const confirmed = args.includes("--yes");
  const wantsAll = args.includes("--all");
  const targets = args.filter((a) => !a.startsWith("--"));

  const live = await listNamespaces();
  const liveNames = Object.keys(live).filter((n) => n !== "(default)");

  if (args.includes("--list") || args.length === 0) {
    console.log(`\n📋 Namespaces currently in the index:\n`);
    if (liveNames.length === 0) console.log("   (none)");
    liveNames.forEach((n) => console.log(`   ${n.padEnd(28)} ${live[n]} vectors`));
    console.log("\nUsage: npm run kb:purge -- <tenantId> [--yes]");
    console.log("       npm run kb:purge -- --all --yes\n");
    return;
  }

  const toDelete = wantsAll ? liveNames : targets;

  const missing = toDelete.filter((n) => !liveNames.includes(n));
  if (missing.length > 0) {
    console.error(`❌ Not present in the index: ${missing.join(", ")}`);
    console.error(`   Available: ${liveNames.join(", ") || "(none)"}`);
    process.exit(1);
  }

  if (toDelete.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  const total = toDelete.reduce((sum, n) => sum + (live[n] ?? 0), 0);
  console.log(`\n🗑️  ${toDelete.length} namespace(s), ${total} vectors:\n`);
  toDelete.forEach((n) => console.log(`   ${n.padEnd(28)} ${live[n]} vectors`));

  if (!confirmed) {
    console.log(`\n⚠️  DRY RUN — nothing deleted.`);
    console.log(`   Re-run with --yes to actually delete.\n`);
    return;
  }

  console.log("");
  for (const namespace of toDelete) {
    await getPineconeIndex().namespace(namespace).deleteAll();
    console.log(`   ✅ Deleted namespace "${namespace}"`);
  }

  const after = await listNamespaces();
  const remaining = Object.keys(after).filter((n) => n !== "(default)");
  console.log(`\n📊 Namespaces remaining: ${remaining.length}`);
  console.log(`   Re-seed any of them with: npm run kb:seed -- <tenantId>\n`);
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
