-- Sprint 4 (item 1): drop legacy orphan models — Campaign, WhatsappInstance, Workspace, ComplianceLog.
-- All four tables were empty in prod at drop time (see docs/superpowers/backups/2026-06-17-orphan-models-pre-drop.json).
-- Also drops the legacy users.workspace_id FK column (all 21 users had it NULL).

-- Campaign: its only FK (created_by -> users.id) lives on this table and drops with it.
DROP TABLE "campaigns";

-- WhatsappInstance: instances come from the Evolution API + AgentChannel.config, not this table.
DROP TABLE "whatsapp_instances";

-- ComplianceLog: dead UI debt (the /api/settings/compliance/* routes were never created).
DROP TABLE "compliance_logs";

-- Workspace (legacy, superseded by Organization): remove the inbound FK on users first.
-- Dropping the column also drops users_workspace_id_fkey and users_workspace_id_idx, but be explicit.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_workspace_id_fkey";
DROP INDEX IF EXISTS "users_workspace_id_idx";
ALTER TABLE "users" DROP COLUMN "workspace_id";

DROP TABLE "workspaces";
