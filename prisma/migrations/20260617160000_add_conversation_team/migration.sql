-- Phase 3 (Teams subordination): let a WhatsApp/Conversation be answered by a Team
-- in "conversation mode" (the team lead replies and can delegate to specialists).
-- Additive: nullable column + FK + index. Coexists with agent_id. No backfill.
-- Apply MANUALLY via `prisma migrate deploy` on the real prod host BEFORE pushing
-- (the Next standalone build does NOT apply migrations on deploy).

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "team_id" UUID;

-- CreateIndex
CREATE INDEX "conversations_team_id_idx" ON "conversations"("team_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
