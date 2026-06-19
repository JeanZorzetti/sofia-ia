-- Teams V2.1 (S2.1 — Tema E): append-only per-task lifecycle timeline.
-- Additive nullable JSONB column, no default/backfill — a NULL column means a
-- "legacy task" with no recorded events (run behavior is byte-identical to before).
-- Shape: [{ type, actor, at, detail? }] where
--   type ∈ {task_created, status_changed, owner_changed, review_requested,
--           review_approved, review_changes_requested},
--   actor = TeamMember id or a role sentinel ('lead'/'reviewer'),
--   at = ISO-8601 timestamp, detail = transition payload (e.g. {from,to}).
-- AlterTable
ALTER TABLE "team_tasks" ADD COLUMN "history_events" JSONB;
