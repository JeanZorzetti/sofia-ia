-- Teams V2 (S3.1): per-run git delivery mode.
-- 'pr' (default/legacy: working branch + draft PR) | 'direct' (commit straight to the
-- base branch, no PR). Nullable, no backfill: NULL = legacy = 'pr' (handled in the app
-- via planGitDelivery). Only affects code-runs bound to a repo; inert otherwise.
-- AlterTable
ALTER TABLE "team_runs" ADD COLUMN "git_mode" VARCHAR(20);
