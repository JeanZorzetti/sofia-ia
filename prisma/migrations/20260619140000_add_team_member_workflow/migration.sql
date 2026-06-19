-- Teams V2.1 (S3.1 — Tema F1): per-member custom workflow instruction.
-- Additive nullable TEXT column, no default/backfill — a NULL column means a
-- "legacy member" whose system prompt is only the Agent's own (run behavior is
-- byte-identical to before). The value is concatenated to the Agent's system
-- prompt ONLY within the team that defines it (see appendMemberWorkflow).
-- AlterTable
ALTER TABLE "team_members" ADD COLUMN "workflow" TEXT;
