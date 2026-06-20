-- V2.2 S6: image/media attachments on team messages (vision).
-- Nullable JSONB → existing rows stay text-only (legacy behavior byte-identical).
ALTER TABLE "team_messages" ADD COLUMN "attachments" JSONB;
