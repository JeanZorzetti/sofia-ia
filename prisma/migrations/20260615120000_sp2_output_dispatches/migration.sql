-- SP2: persist output-webhook dispatch records on a Team run.
-- Additive, nullable column — no data migration, no backfill.
-- AlterTable
ALTER TABLE "team_runs" ADD COLUMN "output_dispatches" JSONB;
