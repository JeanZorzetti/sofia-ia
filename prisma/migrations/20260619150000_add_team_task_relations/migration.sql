-- V2.1 S3.2 (Tema F2): free cross-link relations on team tasks.
-- `related` is a DISPLAY-only cross-link set populated by the Lead's `@TASK [related:#n]`
-- directive (mirrors `[after:#n]` for dependsOn). The DAG/agenda never reads it —
-- `depsSatisfied` gates only on `dependsOn`. `blocks` is DERIVED read-side (inverse of
-- dependsOn), so it has NO column. Default '{}' → existing tasks are relation-free =
-- the board renders exactly as before this migration (regression-safe).
ALTER TABLE "team_tasks" ADD COLUMN "related" TEXT[] NOT NULL DEFAULT '{}';
