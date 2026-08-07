-- Multi-tenant auto-learning: record which clinic a learned Q&A belongs to.
--
-- Before this, learning read and wrote Pinecone without a namespace, so every
-- learned Q&A landed in the unnamed default namespace where no clinic-scoped
-- query could ever reach it. The namespace is the clinic id, so the row has to
-- carry one.
--
-- Nullable on purpose: rows created before this cannot be attributed to a
-- clinic after the fact, and guessing would put one clinic's Q&A into another
-- clinic's namespace. They stay unsynced until a clinic is set explicitly.

-- AlterTable
DO $$ BEGIN
    ALTER TABLE "learned_qa_pairs" ADD COLUMN "clinic_id" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learned_qa_pairs_clinic_id_idx" ON "learned_qa_pairs"("clinic_id");
