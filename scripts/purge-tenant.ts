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

/** Pinecone reports the unnamed default namespace under the empty-string key. */
const DEFAULT_NS = "";
const DEFAULT_LABEL = "(default)";

async function listNamespaces(): Promise<Record<string, number>> {
  const stats = await getPineconeIndex().describeIndexStats();
  const out: Record<string, number> = {};
  for (const [name, info] of Object.entries(stats.namespaces ?? {})) {
    out[name || DEFAULT_LABEL] = (info as any)?.recordCount ?? 0;
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const confirmed = args.includes("--yes");
  const wantsAll = args.includes("--all");
  // --default targets the unnamed namespace, which holds pre-namespace leftovers
  // and cannot be named on the command line any other way.
  const wantsDefault = args.includes("--default");
  const targets = args.filter((a) => !a.startsWith("--"));

  const live = await listNamespaces();
  const liveNames = Object.keys(live).filter((n) => n !== DEFAULT_LABEL);
  const defaultCount = live[DEFAULT_LABEL] ?? 0;

  if (args.includes("--list") || args.length === 0) {
    console.log(`\n📋 Namespaces currently in the index:\n`);
    if (liveNames.length === 0) console.log("   (none)");
    liveNames.forEach((n) => console.log(`   ${n.padEnd(28)} ${live[n]} vectors`));
    if (defaultCount > 0) {
      console.log(`\n   ${DEFAULT_LABEL.padEnd(28)} ${defaultCount} vectors  ⚠️ unisolated`);
      console.log(`   Pre-namespace leftovers. This tool will not delete them —`);
      console.log(`   kb:seed cannot rebuild the default namespace, so removal is`);
      console.log(`   irreversible and needs a deliberate decision.`);
    }
    console.log("\nUsage: npm run kb:purge -- <tenantId> [--yes]");
    console.log("       npm run kb:purge -- --all --yes\n");
    return;
  }

  // --all covers tenant namespaces only; it never touches the default one.
  const toDelete = wantsAll ? [...liveNames] : [...targets];

  // Clearing the default namespace is NOT implemented here on purpose. Unlike a
  // tenant namespace, it cannot be rebuilt by `kb:seed` — no FAQ file maps to
  // it — so the delete would be unrecoverable. Inspect it and decide manually.
  if (wantsDefault) {
    console.error(`\n⚠️  --default is not implemented.`);
    console.error(
      `   The default namespace currently holds ${defaultCount} vectors.`
    );
    console.error(
      `   kb:seed cannot rebuild it (no FAQ file maps to it), so clearing it is`
    );
    console.error(`   irreversible. Review the contents before removing anything.\n`);
    process.exit(1);
  }

  const missing = toDelete.filter(
    (n) => n !== DEFAULT_LABEL && !liveNames.includes(n)
  );
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
