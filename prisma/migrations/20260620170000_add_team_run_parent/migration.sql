-- Iteration (Lovable-style follow-ups): a continuation run reuses the parent's live
-- sandbox + branch + preview and commits the incremental diff. Nullable → existing rows
-- and fresh top-level runs are unaffected (parent_run_id NULL).
ALTER TABLE "team_runs" ADD COLUMN "parent_run_id" UUID;
CREATE INDEX "team_runs_parent_run_id_idx" ON "team_runs"("parent_run_id");
