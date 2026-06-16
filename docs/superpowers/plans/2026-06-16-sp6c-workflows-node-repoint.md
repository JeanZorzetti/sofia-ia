# SP6c — Repoint do node de Workflows + flow-engine → Team (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps com checkbox.

**Goal:** Repontar o último consumidor da **API** de orchestration vivo: o node "Orquestração Multi-Agente" do Workflows builder + seu executor no flow-engine passam a operar sobre **Teams**. Após 6c, nenhum código vivo chama `/api/orchestrations` nem `prisma.agentOrchestration` fora dos consumidores de MODELO restantes (landing/métricas, que são 6d) e das rotas mortas (6e).

**Architecture:** O node `action_orchestration` vira `action_team`: configField `teamId` (selector `team_select` que lista `/api/teams`), e o `execute` lê `Team` + `TeamMembers` (ordenados por `position`) e roda a **mesma sequência inline** que já rodava (`chatWithAgent` por membro, com contexto acumulado) — **sem** chamar o coordinator async do Teams. Override de modelo por membro via 4º arg de `chatWithAgent`. Nenhum flow/script usa o node hoje (grep confirmou), então renomear `type`/config key é seguro.

**Tech Stack:** flow-engine (`src/lib/flow-engine`), React config panel/palette, Prisma Team/TeamMember.

**Fatos confirmados:**
- `ResourceSelect` parseia `{ success, data:[{id,name}] }`; `GET /api/teams` retorna isso (Team tem `id`+`name`). Swap direto.
- `chatWithAgent(agentId, messages, leadContext?, options?)` — modelo vai em `options` (4º arg).
- `actionOrchestration` (const) usado só em `actions.ts`. `action_orchestration`/`orchestration_select`/`orchestrationId` não aparecem em `scripts/` nem em flows.
- **Não** tocar modelos/API/`output-webhooks`/flow-canvas. `prisma.agentOrchestration` segue existindo (cai no 6f).

---

### Task 1: Renomear o tipo do selector na união de tipos

**Files:** Modify `src/lib/flow-engine/types.ts:37`, `src/components/flows/node-config-panel.tsx:16`

- [ ] **Step 1:** Em ambos os arquivos, na união de `type` do `ConfigField`, trocar `'orchestration_select'` por `'team_select'` (manter `'flow_select'`).

- [ ] **Step 2:** `npx tsc --noEmit` ainda vai acusar os usos antigos (esperado até Task 2/3) — seguir.

---

### Task 2: Repontar o node `actionOrchestration` → `actionTeam` (flow-engine)

**Files:** Modify `src/lib/flow-engine/nodes/actions.ts`

- [ ] **Step 1: Trocar o cabeçalho do node + configFields**

```ts
export const actionTeam: NodeDefinition = {
    type: 'action_team',
    category: 'action',
    label: 'Time Multi-Agente',
    description: 'Executa um time multi-agente da Polaris IA como etapa do flow.',
    icon: 'Network',
    color: 'purple',
    configFields: [
        {
            key: 'teamId',
            label: 'Time',
            type: 'team_select',
            required: true,
            placeholder: 'Selecione o time',
        },
        {
            key: 'input',
            label: 'Input / Prompt',
            type: 'text',
            required: true,
            placeholder: 'Tema ou dados para o time: {{response}}',
        },
    ],
```

- [ ] **Step 2: Substituir o `execute` inteiro** (do `execute: async (config, input) => {` até o `},` que fecha o método) por:

```ts
    execute: async (config, input) => {
        if (!config.teamId) {
            throw new Error('Time não configurado. Selecione um time no nó.')
        }

        const { prisma } = await import('@/lib/prisma')
        const { chatWithAgent } = await import('@/lib/ai/groq')

        const resolvedInput = resolveExpressions(config.input || '', input)

        const team = await prisma.team.findUnique({
            where: { id: config.teamId },
            include: {
                members: {
                    orderBy: { position: 'asc' },
                    select: { agentId: true, role: true, model: true },
                },
            },
        })

        if (!team) {
            throw new Error(`Time não encontrado: ${config.teamId}`)
        }

        const members = team.members
        if (members.length === 0) {
            throw new Error('O time não possui membros configurados')
        }

        // Sequential execution — each member receives original input + accumulated previous outputs
        const agentResults: { role: string; output: string }[] = []
        let finalOutput = resolvedInput

        for (const member of members) {
            const previousOutputs = agentResults
                .map(r => `[${r.role}]:\n${r.output}`)
                .join('\n\n---\n\n')

            const prompt = previousOutputs
                ? `${resolvedInput}\n\nRespostas anteriores:\n${previousOutputs}`
                : resolvedInput

            const messages = [{ role: 'user' as const, content: prompt }]
            const response = await chatWithAgent(
                member.agentId,
                messages,
                {},
                member.model ? { model: member.model } : undefined,
            )

            agentResults.push({ role: member.role, output: response.message })
            finalOutput = response.message
        }

        return {
            output: {
                response: finalOutput,
                teamId: config.teamId,
                teamName: team.name,
                steps: agentResults.length,
                agentResults,
            },
        }
    },
}
```

- [ ] **Step 3: Atualizar o array `actionNodes`** — trocar `actionOrchestration,` por `actionTeam,`.

- [ ] **Step 4:** confirmar que `actions.ts` não tem mais `prisma.agentOrchestration` nem `orchestration` (grep).

---

### Task 3: Repontar o selector + a paleta (UI do Workflows)

**Files:** Modify `src/components/flows/node-config-panel.tsx`, `src/components/flows/node-palette.tsx`

- [ ] **Step 1: Renomear o componente selector** (node-config-panel.tsx ~65)

```tsx
function TeamSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return <ResourceSelect url="/api/teams" placeholder="Selecione um time..." value={value} onChange={onChange} />
}
```

- [ ] **Step 2: Trocar o `case` do dispatch** (~185): `case 'orchestration_select':` → `case 'team_select':`, e `<OrchestrationSelect ... />` → `<TeamSelect ... />`.

- [ ] **Step 3: Paleta** (node-palette.tsx:49): trocar a entrada por
```ts
    { type: 'action_team', label: 'Time', description: 'Executar um time multi-agente', icon: 'Network', category: 'action', inputs: [{ name: 'main' }], outputs: [{ name: 'main' }] },
```

---

### Task 4: Gates

- [ ] **Step 1: `tsc --noEmit`** → sem novos erros nos arquivos tocados; nenhum `orchestration_select`/`OrchestrationSelect` órfão.
- [ ] **Step 2: Greps de regressão:**
  - `orchestration_select|action_orchestration|OrchestrationSelect` em `src` → 0.
  - `agentOrchestration` em `src/lib/flow-engine/nodes/actions.ts` → 0.
  - `/api/orchestrations` em `src/components/flows/node-config-panel.tsx` → 0.

> Sem tsx verify: o node é wiring (prisma + chatWithAgent), sem lógica pura extraível; gate = `tsc` + grep + E2E.

---

### Task 5: Commit (push gated) — só a fatia

- [ ] **Step 1:** `git add` os 4 arquivos + este plano + o design doc (se tocado). `git diff --cached --name-status` — só a fatia.
- [ ] **Step 2: Commit (heredoc)**
```bash
git commit -m "$(cat <<'EOF'
refactor(sp6c): repoint Workflows orchestration node to Teams

- action_orchestration -> action_team: config teamId + team_select picker
  listing /api/teams; executor reads Team+TeamMembers and runs the same
  sequential chatWithAgent pipeline inline (coordinator untouched)
- node-config-panel + node-palette repointed to Teams
- actions.ts no longer references prisma.agentOrchestration

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```
- [ ] **Step 3: Push** (gated; redeploy EasyPanel).

## E2E (usuário, autenticado, pós-deploy)
1. Workflows builder → adicionar o node "Time" (ex-"Orquestração") → o selector lista os Teams → escolher o Team da Campanha Threads (`80a38c6e`) → salvar.
2. Rodar o flow → o node executa os membros do time em sequência e devolve `response`/`agentResults`.

## Self-review
- Cobertura 6c: node + executor + selector + paleta repontados; `actions.ts` sai dos consumidores do modelo. ✓
- Placeholders: nenhum. ✓
- Tipos: `team_select` na união (2 arquivos) + dispatch; `chatWithAgent` modelo no 4º arg; `member.model` é `string|null`; `/api/teams` shape casa com `ResourceSelect`. ✓
- Compat: nenhum flow usa `action_orchestration` (grep) → rename seguro. ✓
