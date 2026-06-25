-- 009-usecase-squads: squad = Team de uma empresa (companyId setado).
-- null = Time avulso (legado) — comportamento byte-idêntico preservado.
-- Coluna nullable, sem DROP, sem default — zero precheck de dados.
-- APLICAR MANUALMENTE: psql postgresql://<user>:<pass>@2.24.207.200:5435/<db> -f migration.sql

ALTER TABLE "teams" ADD COLUMN "company_id" UUID;

ALTER TABLE "teams"
  ADD CONSTRAINT "teams_company_id_fkey"
  FOREIGN KEY ("company_id")
  REFERENCES "companies"("id")
  ON DELETE SET NULL;

CREATE INDEX "teams_company_id_idx" ON "teams"("company_id");
