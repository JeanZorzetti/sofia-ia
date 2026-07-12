# Sessão 4 — Kickoff: Fase 4 (Realinhar a arquitetura de informação ao Teams — leve/fechamento)

> Cole este arquivo inteiro como primeira mensagem de um chat novo. Ele re-estabelece o contexto (a sessão começa fria) e manda executar **só a Fase 4** — a última, leve e de fechamento do programa.

---

## Contexto do programa

Projeto: **Polaris (sofia-next)** em `c:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\sofia-next` (Next.js 16 + Prisma + Groq; deploy EasyPanel `polarisia.com.br`; repo `JeanZorzetti/sofia-ia`).

Programa **"Subordinação ao /teams"**: tornar **Teams a feature única e principal**; todo o resto é **Harness a serviço dela**. Decisão do usuário: subordinar **funcionalmente** (rodar os produtos concorrentes *através* do Teams, reusando a engine). Sequência **Threads → Workflows → WhatsApp** (menor→maior risco) **JÁ CONCLUÍDA** (Fases 1-3). Resta a **Fase 4 — leve, de fechamento**: realinhar a *arquitetura de informação* (Sidebar/onboarding/enquadramento visual) ao novo paradigma. **1 fase por sessão**, commit+push limpo ao concluir.

Roadmap completo (fonte de verdade): **[docs/Harness/harness.md](harness.md)** — leia a seção **"Fase 4"**. Histórico/decisões na memória: `project_polaris_teams.md` (programa "Subordinação ao /teams", 2026-06-17, Fases 1-3 entregues).

**Disciplina obrigatória:**
- **Coordinator `runTeam` ([src/lib/orchestration/team/team-coordinator.ts:25](../../src/lib/orchestration/team/team-coordinator.ts)) INTOCADO.** A Fase 4 é **UI/copy/IA pura** — não deve tocar engine, rotas de execução, nem lógica de negócio.
- **A Fase 4 NÃO TEM schema → NÃO TEM migração.** Diferente das Fases 1 e 3. Sem passo de DB em prod. Risco baixo.
- **Gate local:** `npm run typecheck` limpo (pre-commit husky roda isso). **jest NÃO roda local** (OneDrive errno -4094) e **`next build` é flaky local** → gate real = EasyPanel + visualização autenticada em prod. Bugs recorrentes a checar se mexer em rotas: params `Promise`+`await` no Next 16; `auth.id` (NÃO `auth.userId`).
- **Buscas recursivas (Glob/ripgrep) estouram timeout** nesta máquina (OneDrive) → preferir listar diretórios rasos (PowerShell `Get-ChildItem`) e ler por caminho conhecido.
- **Antes de codar:** como é **design/conteúdo** (regra do usuário: confirmar abordagem em tarefas de UI/estratégia), **descreva a abordagem de IA em 1-2 frases e confirme com o usuário** — especialmente a reorganização da Sidebar (ver decisões abertas abaixo). Considere a skill `frontend-design`. Use plan mode se fizer sentido.
- **Não encadear:** fazer **só a Fase 4** e parar. Depois dela o programa **"Subordinação ao /teams" está completo** — não há Fase 5.

## Fases 1, 2 e 3 — JÁ ENTREGUES (commits na `main`)

- **Fase 1 (Threads vira Team de conteúdo) — commit `b5e9862`, migração aplicada em prod.** Campanha de Threads tem `teamId`; "Planejar com IA" instancia um time (template `threads-campaign`, líder emite os posts como JSON na consolidação) e `campaign-ingest.ts` cria os posts no calendário. UI já mostra chip **"Time vinculado"**.
- **Fase 2 (Workflows vira automação que aciona Teams) — commit `59c6e86`, sem schema.** O node `action_team` usa a engine real via `runTeamAndWait` (cria `TeamRun` de verdade, roda `runTeam` inline). Paleta de nodes já destaca o node de Time com badge **"Principal"**; subtítulo da página = "automação que aciona seus Times".
- **Fase 3 (Conversas/WhatsApp atendidas por Team em modo conversa) — commit `1886dc2`, migração aplicada em prod.** Conversa pode ser atendida pelo **agente líder** de um time, que delega a especialistas por **protocolo de texto** (`DELEGATE: <agentId> | <msg>`, provider-agnostic — funciona inclusive no Claude CLI por subscription). UI já tem badge **"Team"** + seletor "Atendimento" nas conversas e seletor Single/Team na config do canal do agente.

> **Padrão dos três:** cada surface já ganhou um sinal "powered by Teams" pontual na sua própria tela (chip/badge/subtítulo). A Fase 4 fecha o payoff no **nível da arquitetura de informação** (navegação global + onboarding), não tela-a-tela de novo.

---

## TAREFA DESTA SESSÃO: Fase 4 — Realinhar a arquitetura de informação ao Teams

**Diagnóstico (a Sidebar é a fonte da arquitetura de informação):** hoje a navegação **contradiz** a visão "Teams é o principal". Estrutura atual confirmada em **[src/components/polaris/Sidebar.tsx](../../src/components/polaris/Sidebar.tsx)** (array `menuSections`, ~linhas 73-129):
- **Topo (sem label):** Overview · Agentes de IA · Conversas
- **"Plataforma":** Skills · MCP Servers · Knowledge Base · Workflows · Modelos · **Teams (6º item, enterrado)** · IDE · Integrações
- **"Threads":** Calendário · Analytics · Campanhas
- **"Crescimento" · "Distribuição" (WhatsApp/Templates/Marketplace) · "Sistema"**

Ou seja: **Teams está enterrado como 6º item de "Plataforma"**, enquanto o topo é o produto WhatsApp single-agent original e Threads/Workflows aparecem como paradigmas paralelos.

**Alvo (Fase 4, leve):** elevar **Teams** à posição de destaque na Sidebar e reapresentar Threads/Workflows/Conversas como **"powered by Teams"** (harness a serviço dela), ajustando o onboarding. Como a decisão foi **subordinação funcional** (já feita nas Fases 1-3), esta fase é só o **fechamento visível** — não reescrever produtos, só a IA.

**Fatos já confirmados (para a próxima sessão não repetir exploração):**
- A Sidebar é um array estático `menuSections: { label, items: { href, label, icon } }[]` — reorganizar é **mexer no array** (mover/agrupar/renomear seções), não refatorar o componente. Ícone do Teams já importado: `Users2`. Item: `{ href: '/dashboard/teams', label: 'Teams', icon: Users2 }`.
- Onboarding **já cria Teams** (repontado no SP6b do programa anterior): `src/app/onboarding/page.tsx` cria um Team (lead sintético + worker) e `onboarding-wizard.tsx` deploya **Team template** (SP5). Então "ajustar onboarding" aqui é provavelmente **copy/enquadramento**, não lógica — confirmar antes de mexer.
- Surfaces a reenquadrar: [dashboard/threads/campaigns/page.tsx](../../src/app/dashboard/threads/campaigns/page.tsx) · [dashboard/workflows/page.tsx](../../src/app/dashboard/workflows/page.tsx) · [dashboard/conversations/page.tsx](../../src/app/dashboard/conversations/page.tsx) (todas já têm o sinal pontual citado acima).

**Passos (ver detalhe em [harness.md](harness.md) §Fase 4):**
1. **Elevar Teams na Sidebar** ([src/components/polaris/Sidebar.tsx](../../src/components/polaris/Sidebar.tsx)): mover Teams para posição de destaque (topo/seção própria/hero). **Decisão de design a confirmar** com o usuário (ver abaixo).
2. **Reenquadrar como "powered by Teams":** sinal leve e consistente (badge/subtítulo/agrupamento) indicando que Threads/Workflows/Conversas rodam através do Teams. Reusar o padrão visual que já existe (chip "Time vinculado", badge "Principal", badge "Team").
3. **Onboarding:** confirmar/ajustar copy para refletir Teams como ponto de partida (a lógica já cria Teams — não duplicar).

**Antes de codar — decisões de IA a confirmar com o usuário (1-2 frases + aguardar):**
- (a) **Como elevar Teams na Sidebar?** Ex.: hero item no topo (junto/acima de Overview) · seção própria "Teams" no topo agrupando os surfaces subordinados · renomear "Plataforma"→algo centrado em Teams. Há trade-off entre destaque e não bagunçar a navegação existente.
- (b) **Os 3 surfaces (Threads/Workflows/Conversas) devem ser visualmente reagrupados sob Teams na Sidebar**, ou só ganham um selo "powered by Teams" e ficam onde estão?
- (c) Escopo do onboarding nesta fase: só copy, ou algum ajuste de fluxo?

**Verificação:** `npm run typecheck` limpo; em prod (EasyPanel autenticado), abrir o dashboard e confirmar que Teams está em destaque na navegação e que Threads/Workflows/Conversas se apresentam como parte do Teams. Sem migração/DB. Commit + push ao concluir (`feat(ui): elevate Teams in the information architecture (Phase 4 of Teams subordination)`), depois **parar**.

**Fechamento:** ao concluir a Fase 4, o programa **"Subordinação ao /teams" está 100% completo** (Fases 1-4). Atualizar a memória `project_polaris_teams.md`. Não há próxima fase.
