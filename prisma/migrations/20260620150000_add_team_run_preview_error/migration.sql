-- Preview mode: surface WHY a preview failed (install/dev/static log tail) instead of an
-- opaque 'failed'. Nullable TEXT → existing rows + non-failed previews unaffected.
ALTER TABLE "team_runs" ADD COLUMN "preview_error" TEXT;
