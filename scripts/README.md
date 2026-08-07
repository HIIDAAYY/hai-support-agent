# scripts/

Every script here is reachable through an `npm run` entry. If you find yourself
writing a one-off `upload-<newclinic>.ts`, add the FAQ file instead — the
tooling discovers tenants from disk.

## Knowledge base (Pinecone)

A tenant's knowledge base is one file, `data/clinics/<tenantId>-faq.md`, and it
lives in the Pinecone namespace named exactly `<tenantId>`. Adding a clinic
means adding that one file; nothing else needs editing.

| Command | Purpose |
| --- | --- |
| `npm run kb:inspect` | Index totals and per-namespace vector counts |
| `npm run kb:inspect -- <tenantId>` | Drill into one tenant: categories, sample Q&A, count check |
| `npm run kb:inspect -- --drift` | Compare `data/clinics/` against the index (missing, orphaned, duplicated) |
| `npm run kb:seed -- <tenantId>` | Seed/re-seed one tenant |
| `npm run kb:seed -- --all` | Seed every tenant found on disk |
| `npm run kb:seed -- --list` | List tenant ids discoverable on disk |
| `npm run kb:purge -- <tenantId>` | Dry run: show what deletion would remove |
| `npm run kb:purge -- <tenantId> --yes` | Actually drop that namespace |

`kb:seed` is idempotent — it clears the namespace before uploading. This
matters: Q&A ids are random UUIDs, so a plain upsert *adds* a second copy of
every item rather than replacing it. Duplicated vectors are invisible in a
namespace listing but crowd out real hits at query time. `kb:inspect --drift`
is what catches that.

`kb:purge` refuses to delete without `--yes`.

Embeddings go through `lib/pinecone` (Pinecone Inference,
`multilingual-e5-large`, 1024-dim) in `passage` mode — the same model the chat
route queries with. Seeding through any other embedding provider puts vectors
in a different space and silently breaks retrieval.

## Other tooling

| Command | Purpose |
| --- | --- |
| `npm run whatsapp` | WhatsApp demo bot via QR scan (`whatsapp-qr.ts`) |
| `npm run kb:learn -- --help` | Auto-learning: review, approve, promote Q&A candidates |
| `npm run demo:screenshots` | Puppeteer screenshots for outreach decks |

For database inspection use `npx prisma studio`, and for seeding use
`prisma/seed.ts` — no bespoke scripts needed.

## Note on tests

There is no test runner in this project. The `test-*.ts` scripts that used to
live here were ad-hoc manual probes, not a suite, and several referenced
tenants and files that no longer existed. They were removed rather than left to
imply a safety net that was not there. If you add real tests, wire up a runner
and a `npm test` entry so they actually run.
