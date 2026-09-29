-- 013-cobranca-stripe — Stripe billing replaces Mercado Pago.
-- Adds 5 nullable columns to `subscriptions` and 2 new tables. No drops: mercadopago_* and
-- trial_ends_at stay unused. Apply with `prisma migrate deploy` MANUALLY on the real host
-- 2.24.207.200:5435 BEFORE the push (Principle III).

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "stripe_customer_id" VARCHAR(255),
ADD COLUMN "stripe_subscription_id" VARCHAR(255),
ADD COLUMN "stripe_price_id" VARCHAR(255),
ADD COLUMN "started_at" TIMESTAMPTZ,
ADD COLUMN "cancel_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_acceptances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "content_hash" CHAR(64) NOT NULL,
    "ip" VARCHAR(64),
    "user_agent" TEXT,
    "accepted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_customer_id_key" ON "subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "terms_acceptances_user_id_idx" ON "terms_acceptances"("user_id");

-- AddForeignKey
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
