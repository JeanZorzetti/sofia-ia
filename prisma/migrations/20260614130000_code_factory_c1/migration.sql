-- Sub-projeto C (Code Factory) · Fatia C1 — Git → Pull Request
-- The worker clones a repo, works on a branch, and opens a PR on success.
-- Token is NEVER stored in the DB (lives only in the worker env: GITHUB_TOKEN).

-- AlterTable
ALTER TABLE "team_runs" ADD COLUMN "repo_url" TEXT;
ALTER TABLE "team_runs" ADD COLUMN "base_branch" VARCHAR(255);
ALTER TABLE "team_runs" ADD COLUMN "branch" VARCHAR(255);
ALTER TABLE "team_runs" ADD COLUMN "commit_sha" VARCHAR(64);
ALTER TABLE "team_runs" ADD COLUMN "pr_url" TEXT;
ALTER TABLE "team_runs" ADD COLUMN "pr_number" INTEGER;
ALTER TABLE "team_runs" ADD COLUMN "changed_files" JSONB;
