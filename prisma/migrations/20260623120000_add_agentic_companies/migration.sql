-- 005-agentic-companies — Empresas Agênticas
-- 4 tabelas novas. Sem drops. A back-relation Agent.companyRole é virtual (a FK vive
-- em company_roles.agent_id) → a tabela `agents` NÃO é alterada.
-- Aplicar com `prisma migrate deploy` MANUAL no host real 2.24.207.200:5435 ANTES do push (Princípio III).

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "niche" VARCHAR(100) NOT NULL,
    "typology" VARCHAR(20) NOT NULL DEFAULT 'hybrid',
    "description" TEXT,
    "raci" JSONB NOT NULL DEFAULT '{}',
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_roles" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "layer" VARCHAR(20) NOT NULL,
    "department" VARCHAR(100),
    "agent_id" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_runs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "mission" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "current_phase" VARCHAR(30),
    "output" TEXT,
    "error" TEXT,
    "created_by" UUID NOT NULL,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_phase_runs" (
    "id" UUID NOT NULL,
    "company_run_id" UUID NOT NULL,
    "phase" VARCHAR(30) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "team_run_id" UUID,
    "input_artifact" TEXT,
    "output_artifact" TEXT,
    "error" TEXT,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_phase_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_created_by_idx" ON "companies"("created_by");

-- CreateIndex
CREATE INDEX "companies_niche_idx" ON "companies"("niche");

-- CreateIndex
CREATE UNIQUE INDEX "company_roles_agent_id_key" ON "company_roles"("agent_id");

-- CreateIndex
CREATE INDEX "company_roles_company_id_idx" ON "company_roles"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_roles_company_id_key_key" ON "company_roles"("company_id", "key");

-- CreateIndex
CREATE INDEX "company_runs_company_id_idx" ON "company_runs"("company_id");

-- CreateIndex
CREATE INDEX "company_runs_status_idx" ON "company_runs"("status");

-- CreateIndex
CREATE INDEX "company_phase_runs_company_run_id_idx" ON "company_phase_runs"("company_run_id");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_roles" ADD CONSTRAINT "company_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_roles" ADD CONSTRAINT "company_roles_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_runs" ADD CONSTRAINT "company_runs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_phase_runs" ADD CONSTRAINT "company_phase_runs_company_run_id_fkey" FOREIGN KEY ("company_run_id") REFERENCES "company_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
