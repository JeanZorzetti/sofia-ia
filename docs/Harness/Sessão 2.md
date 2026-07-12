# Sessão 2 — Kickoff: Fase 2 (Workflows → "automação que aciona Teams")

> Cole este arquivo inteiro como primeira mensagem de um chat novo. Ele re-estabelece o contexto (a sessão começa fria) e manda executar **só a Fase 2**.

---

## Contexto do programa

Projeto: **Polaris (sofia-next)** em `c:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next` (Next.js 16 + Prisma + Groq; deploy EasyPanel `polarisia.com.br`; repo `JeanZorzetti/sofia-ia`).

Programa **"Subordinação ao /teams"**: tornar **Teams a feature única e principal**; todo o resto é **Harness a serviço dela**. Decisão do usuário: subordinar **funcionalmente** (rodar os produtos concorrentes *através* do Teams, reusando a engine — **não** só reposicionar UI, **não** fazer teardown). Sequência **Threads → Workflows → WhatsApp** (menor→maior risco), **1 fase por sessão**, commit+push limpo ao concluir.

Roadmap completo (fonte de verdade): **[docs/Harness/harness.md](harness.md)** — leia a seção **"Fase 2"**. Histórico/decisões na memória: `project_polaris_teams.md` (programa "Subordinação ao /teams", 2026-06-17).

**Disciplina obrigatória (todas as fases):**
- **Coordinator `runTeam` ([src/lib/orchestration/team/team-coordinator.ts:25](../../src/lib/orchestration/team/team-coordinator.ts)) INTOCADO.** Subordinação chama a engine via *callers*/injeção, nunca altera o coordinator.
- **Reuso > código novo:** `startTeamRun` ([start-team-run.ts](../../src/lib/orchestration/team/start-team-run.ts)), `createTeamWithRoster`/`instantiateRoster`, templates SP5, `chatWithAgent`.
- **Gate local:** `npm run typecheck` limpo (pre-commit husky roda isso). **jest NÃO roda local** (OneDrive errno -4094) e **`next build` é flaky local** → gate real = EasyPanel + E2E autenticado em prod. Bugs recorrentes a checar: params `Promise`+`await` no Next 16; `auth.id` (NÃO `auth.userId`).
- **Buscas recursivas (Glob/ripgrep) estouram timeout** nesta máquina (OneDrive) → preferir listar diretórios rasos (PowerShell `Get-ChildItem`) e ler por caminho conhecido.
- **Migração de schema:** a Fase 2 **NÃO tem schema** (sem migração). Se em algum momento precisar, lembrar: standalone do Next não aplica migração no deploy → `migrate deploy` manual no host real **`sofia_db@2.24.207.200:5435`** ANTES do push.
- **Não encadear:** fazer **só a Fase 2** e parar; não emendar a Fase 3 sem instrução.

## Fase 1 (Threads) — JÁ ENTREGUE (commit `b5e9862` na `main`, migração aplicada em prod)

Threads virou um Team de conteúdo: campanha tem `teamId`, botão **"Planejar com IA"** instancia um time (template **`threads-campaign`**, que emite os posts como **JSON na consolidação do líder**) e a ingestão (`src/lib/threads/campaign-ingest.ts`) cria os posts no calendário. **E2E em prod ainda pendente** com o usuário (criar campanha → Planejar com IA → ver posts no calendário).

⚠️ A Fase 1 *as-built* **divergiu** do que está escrito na seção "Fase 1" do `harness.md` (que é o plano original): usei um **template dedicado `threads-campaign`** (não o `marketing-content`), a geração roda no **"Planejar com IA"** (não no "ativar"), e a ingestão é **same-process via hook `onComplete` no `startTeamRun`** (não webhook-pra-si-mesmo). O registro real está na memória `project_polaris_teams.md`. **Isso importa para a Fase 2** porque o `startTeamRun` agora tem um parâmetro novo `onComplete?(runId)` (opcional, retrocompatível) que você pode reusar.

---

## TAREFA DESTA SESSÃO: Fase 2 — Workflows vira "automação que aciona Teams"

**Estado atual (~60%):** o node de workflow **`action_team` já existe** em [src/lib/flow-engine/nodes/actions.ts:337-426](../../src/lib/flow-engine/nodes/actions.ts) **mas roda um loop PRÓPRIO de `chatWithAgent`** (carrega Team+members e itera ele mesmo) — **não** usa a engine real (`runTeam`). Workflows é um builder de DAG com ~24 node types; Teams é só 1 ação entre eles.

**Alvo:** o node de team passa a usar a **engine real** (um `TeamRun` de verdade, com tasks/messages persistidos via coordinator), e Workflows se reposiciona como **camada de trigger/composição de teams** — os outros node types (http/if/loop/transform/…) viram **encanamento a serviço de team runs**, não um motor concorrente. **NÃO remover os outros node types** (são harness legítimo de automação).

**Passos (ver detalhe em [harness.md](harness.md) §Fase 2):**
1. **Religar `action_team` à engine real.** O node precisa do resultado **inline** (pra alimentar o próximo node), mas `startTeamRun` no modo chat roda em background (`after()`). Criar um helper síncrono fino **`runTeamAndWait(teamId, input)`** (cria a run e aguarda/poll até `completed`/`failed`, com timeout limitado) **sem alterar `runTeam`**. Substituir o loop bespoke do node por esse helper → passa a persistir um `TeamRun` real.
2. **Triggers → team runs:** confirmar/documentar que os triggers existentes (manual/webhook/cron/event) acionam o node.
3. **Reposicionamento leve (copy/UX):** rotular a surface como automação de teams e dar destaque ao node de team na paleta ([src/components/flows/node-palette.tsx](../../src/components/flows/)). Sem remover node types.

**Antes de codar:** como é mudança de comportamento de um sistema existente (regra do usuário: confirmar abordagem em tarefas de estratégia/sistema), **explore primeiro** o `flow-engine` (como `execute` roda os nodes, de onde vêm os inputs/outputs entre nodes, como erros de node são tratados) e o estado atual do `action_team`, depois **descreva a abordagem em 1-2 frases e confirme com o usuário** (especialmente a semântica do `runTeamAndWait`: timeout, o que fazer se a run falhar/estourar, e o shape do output que vai pro próximo node). Use plan mode se fizer sentido.

**Verificação:** montar um workflow com node de team, rodar, confirmar que cria um `TeamRun` real (aparece em `/dashboard/teams`, com tasks/messages) e que o output alimenta o node seguinte. `npm run typecheck` limpo. Commit + push ao concluir (`feat(workflows): run the team node through the real engine (Phase 2 of Teams subordination)`), depois parar.

**Próximo (NÃO nesta sessão):** Fase 3 — WhatsApp atendido por "Team em modo conversa" (modelo escolhido: agente líder delegando via `delegate_to_agent` dentro de uma resposta; tem schema → migração).
