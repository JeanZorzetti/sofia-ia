-- Migration: add_workflow_versioning
-- Task DB-01: Adicionar WorkflowVersion e atualizar Workflow

-- AlterTable: Adicionar novos campos ao modelo Workflow
ALTER TABLE "workflows" ADD COLUMN     "current_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "execution_mode" VARCHAR(20) NOT NULL DEFAULT 'manual',
ADD COLUMN     "retry_policy" JSONB,
ADD COLUMN     "schedule" JSONB,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable: Criar tabela workflow_versions
CREATE TABLE "workflow_versions" (
    "id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changed_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Índice composto workflowId + version
CREATE INDEX "workflow_versions_workflow_id_version_idx" ON "workflow_versions"("workflow_id", "version");

-- AddForeignKey: FK com Cascade Delete
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
