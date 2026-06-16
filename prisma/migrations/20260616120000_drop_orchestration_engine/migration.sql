-- SP6g: aposenta a engine de Orquestrações — dropa as 3 tabelas legadas.
-- Sem migração de dados (não há orquestrações reais em produção; o Teams é o sucessor).
-- Ordem: tabelas-filhas (FK → agent_orchestrations) primeiro, depois a tabela-pai.

-- DropTable
DROP TABLE IF EXISTS "orchestration_executions";
DROP TABLE IF EXISTS "scheduled_executions";
DROP TABLE IF EXISTS "agent_orchestrations";
