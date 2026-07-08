-- 011-byos-claude-token — Token de assinatura Claude por usuário (BYOS)
-- 1 tabela nova, 1:1 com `users`, cascade delete. Sem drops, `users` NÃO é alterada.
-- Aplicar com `prisma migrate deploy` MANUAL no host real 2.24.207.200:5435 ANTES do push (Princípio III).

-- CreateTable
CREATE TABLE "user_claude_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "mask" VARCHAR(32) NOT NULL,
    "last_verified_at" TIMESTAMPTZ NOT NULL,
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_claude_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_claude_tokens_user_id_key" ON "user_claude_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "user_claude_tokens" ADD CONSTRAINT "user_claude_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
