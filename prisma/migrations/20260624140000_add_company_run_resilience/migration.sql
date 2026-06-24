-- 007-company-run-resilience — Resiliência a esgotamento + observabilidade de consumo.
-- 2 colunas novas (nullable, inertes para o fluxo legado) + 1 índice. Sem drops.
-- Aplicar com `prisma migrate deploy` MANUAL no host real 2.24.207.200:5435 ANTES do push (Princípio III).

-- AlterTable: horário (UTC) de reset quando a CompanyRun fica 'blocked' por esgotamento do pool.
ALTER TABLE "company_runs" ADD COLUMN "reset_at" TIMESTAMPTZ;

-- AlterTable: proxy de consumo por fase ({ turns, durationMs, byModel, weightedUnits, blocked }).
ALTER TABLE "company_phase_runs" ADD COLUMN "usage" JSONB;

-- CreateIndex: o cron resume-blocked-companies filtra status='blocked' AND reset_at<=now.
CREATE INDEX "company_runs_status_reset_at_idx" ON "company_runs"("status", "reset_at");
