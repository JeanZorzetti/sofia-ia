-- Preview mode (Lovable-style) for code-runs.
-- After a code-run completes, the worker keeps the E2B sandbox alive, starts the
-- project's dev server and exposes a public URL embedded in an iframe. These fields
-- drive the preview lifecycle (start/extend/stop/reap); `sandbox_id` (existing) is
-- reused to connect/kill. All nullable + boolean default false → existing rows and
-- non-preview runs behave exactly as before.
ALTER TABLE "team_runs" ADD COLUMN "preview_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "team_runs" ADD COLUMN "preview_status" VARCHAR(20);
ALTER TABLE "team_runs" ADD COLUMN "preview_url" TEXT;
ALTER TABLE "team_runs" ADD COLUMN "preview_port" INTEGER;
ALTER TABLE "team_runs" ADD COLUMN "preview_expires_at" TIMESTAMPTZ;
