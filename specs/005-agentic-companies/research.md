# Phase 0 — Research: Empresas Agênticas

Todas as ambiguidades técnicas resolvidas abaixo. Decisões aterradas no engine de Times existente
(`src/lib/orchestration/team/`) e na constituição do projeto.

---

## R1 — Como executar a empresa reusando o engine de Times sem tocar o coordenador

**Decision**: A execução é um **meta-orquestrador sequencial** (`src/lib/companies/company-run.ts`) que,
para cada fase do SDLC, chama o caller existente **`runTeamAndWait(teamId, { mission })`** (em
`start-team-run.ts:244`) — que roda o coordenador INLINE e devolve o resultado terminal — e encadeia o
artefato de saída da fase N como entrada da fase N+1.

**Rationale**:
- `runTeamAndWait` já é um *caller* oficial do coordenador (usado pelo node `action_team` dos
  Workflows), explicitamente documentado como "the coordinator (`runTeam`) stays INTACT". É síncrono
  (sem `after()`, sem polling), perfeito para um loop de fases.
- Mantém o Princípio II (coordinator intocado): o meta-orquestrador **envolve**, não edita.
- Cada fase vira um `TeamRun` real (tasks/messages/usage persistidos), dando observabilidade gratуita.

**Alternatives considered**:
- *Editar o coordenador para entender fases*: viola Princípio II. Rejeitado.
- *Um único `TeamRun` com todos os agentes e RACI só no prompt* (opção B do clarify): rejeitado pelo
  usuário — perde artefatos por fase e o loop de QA distinto.
- *`startTeamRun` (com `after()`)*: assíncrono/fire-and-forget; o loop sequencial precisa do resultado
  terminal de cada fase antes da próxima → `runTeamAndWait` (inline) é o caller correto.

---

## R2 — Mapeamento Cargo → papel do Time (lead/worker/reviewer) por fase

**Decision**: Função **pura** `buildPhaseRoster(raci, phase, staffing)` que deriva o roster de cada fase
a partir da RACI:
- O cargo **A** (Accountable) da fase → **`lead`** (dono/aprovador; exatamente 1, garantido pela regra
  de ouro).
- Os cargos **R** (Responsible) → **`worker`(s)**. Se o A também é R (`A/R`), ele também recebe um
  worker (o engine exige ≥1 worker).
- Na fase **Teste/QA**, o cargo de QA (R da fase) entra como **`reviewer`** (≤1), acionando o loop
  revisor nativo do coordenador (lead→worker→reviewer) = **Desalucinação Comunicativa** (FR-017) **sem
  código novo de loop**. Em outras fases, um cargo **C** designado pode virar reviewer (≤1) ou ser
  omitido.

**Rationale**: O `validateRoster` existente exige exatamente 1 lead, ≥1 worker, ≤1 reviewer
(`team-roster.ts:23`). O mapeamento A→lead / R→worker / QA(ou C)→reviewer satisfaz isso naturalmente e
reaproveita o mecanismo de review do engine para o ciclo de QA — nenhuma lógica de revisão é
reimplementada.

**Alternatives considered**:
- *Mapear todo C como worker adicional*: incha o roster e os custos de token sem ganho. Rejeitado
  (C = consultado, não executor).
- *Reviewer fixo independente da RACI*: quebra a fidelidade RACI→execução. Rejeitado.

**Edge handling** (FR / Edge Cases do spec): se o cargo **A** ou todos os **R** de uma fase estiverem
**vagos** (sem agente), `buildPhaseRoster` retorna erro → a fase é **bloqueada/sinalizada** (não falha
silenciosa). Fase sem nenhum R/A na RACI = inválida para execução.

---

## R3 — Onde materializar os Times das fases (sem poluir `/dashboard/teams`)

**Decision**: Por **CompanyRun**, o meta-orquestrador cria os Times de fase via **`createTeamWithRoster`**
(reusando os **agentes já encaixados**, não criando agentes novos), marcando-os com
**`status: 'internal'`** e `config: { companyId, phase }`.

**Rationale**: A listagem de Times (`/api/teams` GET) já filtra **`status: 'active'`**
(`teams/route.ts:12`). Times com `status:'internal'` são **automaticamente excluídos** da UI de Times —
**zero alteração read-side**, zero toque no coordenador. `createTeamWithRoster` é o caller compartilhado
de criação (valida roster + existência de agentes).

> **Correção (analyze I1):** `createTeamWithRoster` hoje **não aceita `status`** — cria sempre com o
> default `'active'` (`create-team.ts:7-20`). Para os Times de fase nascerem `internal`, estende-se
> `CreateTeamInput` com um **`status?: string` opcional** (injection-style; ausente = `'active'`,
> byte-idêntico ao legado), passado pelo meta-orquestrador. **NÃO** é o coordenador — é o caller de
> criação; Princípio II preservado. (Alternativa equivalente: `prisma.team.update({status:'internal'})`
> logo após criar; preferimos o param opcional por ser uma única escrita e reusável.)

**Alternatives considered**:
- *7 Times persistentes por empresa, re-rosterizados na mudança de RACI/staffing*: menos linhas, mas
  exige invalidação cuidadosa quando staffing/RACI muda. Maior acoplamento. Mantido como otimização
  futura, não no MVP.
- *Filtro novo `where NOT config.hidden` na rota de teams*: alteração read-side desnecessária quando
  `status:'internal'` já resolve. Rejeitado.

---

## R4 — Armazenamento da Matriz RACI

**Decision**: A RACI é um **campo Json tipado** na `Company` (`raci: { [phaseKey]: { [roleKey]:
'R'|'A'|'C'|'I' } }`). As **7 fases do SDLC** são **constantes de código** (`sdlc.ts`), não dados por
empresa. Validação (regra de ouro: exatamente 1 `A` por fase) é um **helper puro** `validateRaci`.

**Rationale**: Matriz limitada (~13 cargos × 7 fases = 91 células); o padrão do repo já usa muitos
campos `Json` de config (`Team.config`, `Agent.config`, `TeamMember.capabilities`). Json evita uma
tabela de junção e mantém a edição/leitura atômica. A regra de ouro é validação de app em qualquer
modelagem.

**Alternatives considered**:
- *Tabela normalizada `CompanyRaci(companyId, roleKey, phase, value)`*: melhor para queries
  arbitrárias, mas desnecessária para uma matriz pequena lida inteira de uma vez; adiciona uma 5ª
  tabela. Rejeitado por simplicidade.

---

## R5 — Nicho semente "Software House" + RACI pré-preenchida (e uma correção do blueprint)

**Decision**: Dados estáticos em `company-blueprint.ts` (espelhando `team-templates.ts`): camadas,
departamentos, cargos (CEO; CTO, CISO; PM, BA, PO, Arquiteto, Scrum Master; Backend, Frontend, QA,
DevOps, Data) e a **RACI pré-preenchida**, **derivada e normalizada** da seção 7 do
`Organograma de Empresa Agêntica.md`, mapeada nas **7 fases canônicas**.

**Correção importante encontrada na pesquisa**: a matriz do blueprint (seção 7) tem uma linha — *Ciclo
de Desalucinação Comunicativa* — com **dois "A"** (Gerente de Projetos = A **e** QA = A/C), o que
**viola a regra de ouro** (1 A/fase). Ao semear, normalizamos para **um único Accountable** por fase
(o Gerente de Projetos detém o A; o QA fica R/C). A regra de ouro é imposta por `validateRaci`, então o
seed precisa ser válido por construção. Documentar isto evita que o implementador copie a matriz
literal e quebre a própria validação.

**Mapeamento das 9 linhas-tarefa do blueprint → 7 fases canônicas**: Conceptualização→**Planeamento**;
PRD→**Análise de Requisitos**; Modelação DB/Arquitetura→**Design**; (Decomposição de Tarefas +
Codificação)→**Implementação**; (Testes Unitários + Desalucinação)→**Teste/QA**;
(Empacotamento + Implantação/Aceitação)→**Implantação**; **Manutenção** (nova, default: DevOps=A/R,
QA=C, CEO=I).

**Rationale**: Empresa "nasce operável" (decisão Q3 do clarify) e fiel ao documento, com a regra de ouro
respeitada.

---

## R6 — Cardinalidade 1:1 cargo↔agente (imposição)

**Decision**: `CompanyRole.agentId` é **nullable** (vaga vazia) com **`@unique`** — impõe "um agente em
no máximo um cargo" globalmente (Postgres permite múltiplos NULL → várias vagas vazias OK). Encaixe
valida que o agente pertence ao dono da empresa (escopo) e que não está em outro cargo (senão erro,
FR-003a).

**Rationale**: A unicidade no nível do banco é a forma mais barata e correta de garantir o 1:1 (decisão
Q4 do clarify). Tipologia generalista = poucos cargos amplos (um agente cada); especialista = muitos
cargos estreitos — sem compartilhar agente.

**Alternatives considered**:
- *Unique composto `(companyId, agentId)`*: permitiria o mesmo agente em empresas diferentes. Mais
  flexível, mas o clarify decidiu **estrito 1:1 global**. Mantido o `@unique` simples em `agentId`.

---

## R7 — Faceta Infraestrutura (MCP + sandbox)

**Decision**: A faceta **reusa** o que já existe — `AgentMcpServer`/`McpServer` (vínculos MCP por
agente) e o mecanismo de sandbox dos code-runs. A faceta Infra **exibe e vincula** por cargo/agente; o
armazenamento de novos vínculos, se necessário, é um campo em `Company.config`
(`infrastructure: { [roleKey]: { sandbox?: boolean } }`) — **nenhuma credencial nova é armazenada**
(Princípio V; segredos seguem cifrados nos mecanismos existentes).

**Rationale**: Evita reimplementar MCP/sandbox; a feature apenas os **orquestra** por cargo. Mantém o
escopo enxuto e a segurança intacta.

---

## R8 — Rota / IA da página `/dashboard/agents`

**Decision**: `/dashboard/agents/page.tsx` → **galeria de Empresas** (cards por nicho) + view secundária
"Todos os agentes" (reusa o grid `AgentCard` atual). Detalhe da empresa em
`/dashboard/agents/empresa/[companyId]`. Detalhe do agente (`/dashboard/agents/[id]` e subpáginas
memory/plugins/skills/mcp/delegations) **permanece intocado**.

**Rationale**: Honra o pedido literal de transformar `/dashboard/agents`, sem colidir com o `[id]` do
agente (o segmento estático `empresa` tem precedência sobre o dinâmico). Agentes continuam acessíveis
(FR-006). Item de nav pode ser renomeado para "Empresas/Agentes".

**Alternatives considered**:
- *Nova seção `/dashboard/companies` separada*: não honra o pedido de transformar a página apontada.
  Rejeitado (mas a navegação interna pode linkar para o detalhe sob `agents/empresa`).
