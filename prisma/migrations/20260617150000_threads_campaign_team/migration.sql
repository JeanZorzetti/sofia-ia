-- Phase 1 (Teams subordination): link a Threads campaign to a content Team.
-- Additive: nullable column + FK + index. No data migration, no backfill.
-- Apply MANUALLY via `prisma migrate deploy` on the real prod host BEFORE pushing
-- (the Next standalone build does NOT apply migrations on deploy).

-- AlterTable
ALTER TABLE "threads_campaigns" ADD COLUMN "team_id" UUID;

-- CreateIndex
CREATE INDEX "threads_campaigns_team_id_idx" ON "threads_campaigns"("team_id");

-- AddForeignKey
ALTER TABLE "threads_campaigns" ADD CONSTRAINT "threads_campaigns_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
