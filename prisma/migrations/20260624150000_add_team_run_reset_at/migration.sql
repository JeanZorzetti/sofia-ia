-- 008-team-run-resilience — reset (UTC) por TeamRun esgotado + índice p/ o cron de auto-resume.
-- 1 coluna nullable (inerte para o fluxo legado) + 1 índice. Sem drops.
-- Aplicar com `prisma migrate deploy` MANUAL no host real 2.24.207.200:5435 ANTES do push (Princípio III).

-- AlterTable: horário de reset quando o TeamRun fica 'rate_limited' por esgotamento.
ALTER TABLE "team_runs" ADD COLUMN "reset_at" TIMESTAMPTZ;

-- CreateIndex: o cron resume-blocked-teams filtra status='rate_limited' AND reset_at<=now.
CREATE INDEX "team_runs_status_reset_at_idx" ON "team_runs"("status", "reset_at");
