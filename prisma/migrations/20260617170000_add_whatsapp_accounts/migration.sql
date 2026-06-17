-- WABA migration (Fase 1): per-tenant WhatsApp Business Cloud API credentials,
-- routed by phone_number_id. Adds whatsapp_accounts + conversations.last_inbound_at
-- (the 24h customer-service-window gate used by proactive crons in Fase 3).
-- Additive: new table + nullable column + FKs/indexes. No data migration, no backfill.
-- Apply MANUALLY via `prisma migrate deploy` on the real prod host BEFORE pushing
-- (the Next standalone build does NOT apply migrations on deploy).

-- CreateTable
CREATE TABLE "whatsapp_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "agent_id" UUID,
    "waba_id" VARCHAR(64) NOT NULL,
    "phone_number_id" VARCHAR(64) NOT NULL,
    "display_phone_number" VARCHAR(32),
    "verified_name" VARCHAR(255),
    "access_token" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'connected',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_accounts_phone_number_id_key" ON "whatsapp_accounts"("phone_number_id");
CREATE INDEX "whatsapp_accounts_user_id_idx" ON "whatsapp_accounts"("user_id");
CREATE INDEX "whatsapp_accounts_agent_id_idx" ON "whatsapp_accounts"("agent_id");

-- AddForeignKey
ALTER TABLE "whatsapp_accounts" ADD CONSTRAINT "whatsapp_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_accounts" ADD CONSTRAINT "whatsapp_accounts_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "last_inbound_at" TIMESTAMPTZ;
