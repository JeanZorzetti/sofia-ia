-- Sub-projeto C (Code Factory) · Fatia C0
-- Code-run discriminator + sandbox id on runs; command-log artifacts on tasks.

-- AlterTable
ALTER TABLE "team_runs" ADD COLUMN "mode" VARCHAR(20) NOT NULL DEFAULT 'chat';
ALTER TABLE "team_runs" ADD COLUMN "sandbox_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "team_tasks" ADD COLUMN "artifacts" JSONB;
