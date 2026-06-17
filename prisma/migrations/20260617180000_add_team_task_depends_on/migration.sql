-- G1 (graph topology): task dependency DAG.
-- Additive array column, default empty — no data migration, no backfill.
-- text[] of TeamTask ids this task depends on; runTeamGraph gates execution on them.
-- AlterTable
ALTER TABLE "team_tasks" ADD COLUMN "depends_on" TEXT[] DEFAULT ARRAY[]::TEXT[];
