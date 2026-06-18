-- Teams V2 (S1.1 — Tema A): per-member tool-capability policy.
-- Additive nullable JSONB column, no default/backfill — an absent (NULL) policy
-- means "legacy behavior" (the coder-model tool gate in chatWithAgent decides).
-- Shape: { tools?: boolean, mcpAllowlist?: string[], toolSkills?: boolean, filesystem?: boolean }.
-- AlterTable
ALTER TABLE "team_members" ADD COLUMN "capabilities" JSONB;
