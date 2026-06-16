# SP6b — Repoint do onboarding → Teams + deletar UI de execução órfã (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (ou subagent-driven-development). Steps com checkbox.

**Goal:** Tirar os dois fluxos de onboarding da engine de Orquestrações (passam a criar **Teams**) e remover a UI de execução de orchestration que ficou órfã após `9fd88fa` — sem deletar API/modelos ainda (repoint-first do SP6).

**Architecture:** `app/onboarding/page.tsx` cria um **Team** (lead sintético + o agente recém-criado como worker) via `POST /api/teams`. `onboarding-wizard.tsx` deploya um **Team template** do SP5 via `POST /api/teams/templates/[id]/deploy` (ids do `DEMO_TEMPLATES` remapeados pros ids de `TEAM_TEMPLATES`). A UI de execução órfã (5 componentes + 2 hooks, 0 importadores confirmados) é deletada. Flow-canvas (`flow-canvas`/`flow-nodes`/`flow-edges`/`predictive`/`editable-flow-canvas`) **preservado**.

**Tech Stack:** Next.js 16, TypeScript, React client components, Prisma/Teams helpers existentes.

**Fatos confirmados na descoberta:**
- `POST /api/teams` → `{ success:true, data: <team> }` (usar `data.id`).
- `POST /api/teams/templates/[id]/deploy` → `{ success:true, data:{ teamId, team } }` (usar `data.teamId`).
- `DEMO_TEMPLATES` (wizard): `content-marketing-pipeline`, `research-analysis-pipeline`, `rh-pipeline-contratacao`. Ids de `TEAM_TEMPLATES`: `marketing-content`, `pesquisa-analise`, `rh-pipeline-contratacao`.
- Órfãos (0 importadores): `components/orchestrations/{analytics-dashboard,execution-history,execution-detail-drawer,execution-live-view,execution-compare}.tsx` + `hooks/use-execution-{stream,notifications}.ts`.
- **NÃO** tocar: API/modelos/redirects/`output-webhooks.ts`/flow-canvas.

---

### Task 1: Repontar `onboarding-wizard.tsx` → Team template

**Files:** Modify `src/components/dashboard/onboarding-wizard.tsx`

- [ ] **Step 1: Remapear os ids do `DEMO_TEMPLATES` pros ids de `TEAM_TEMPLATES`**

Trocar `id: 'content-marketing-pipeline'` → `id: 'marketing-content'` e `id: 'research-analysis-pipeline'` → `id: 'pesquisa-analise'` (o `rh-pipeline-contratacao` já bate). Manter `icon/name/description`.

- [ ] **Step 2: Repontar `handleUseTemplate` pro deploy de Team template**

Trocar o corpo (linhas ~123-143):
```tsx
  const handleUseTemplate = async (templateId: string) => {
    setTemplateLoading(templateId)
    try {
      const response = await fetch(`/api/teams/templates/${templateId}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      if (result.success) {
        onClose()
        router.push(`/dashboard/teams/${result.data.teamId}`)
      } else {
        alert(result.error || 'Erro ao criar o time')
      }
    } catch {
      alert('Erro ao criar o time')
    } finally {
      setTemplateLoading(null)
    }
  }
```

- [ ] **Step 3: Verificar typecheck** — `npx tsc --noEmit` → sem novos erros neste arquivo (baseline conhecido à parte).

- [ ] **Step 4: Commit** (ver Task 5).

---

### Task 2: Repontar `app/onboarding/page.tsx` → criar Team

**Files:** Modify `src/app/onboarding/page.tsx`

- [ ] **Step 1: Substituir a etapa "Create orchestration" (linhas ~193-214) por criação de Team**

Trocar o bloco que cria a orchestration (do comentário `// 2. Create orchestration` até o fim do `if (!orchJson.success)...`) por:
```tsx
      // 2. Create a synthetic lead coordinator agent (lead só orquestra, não precisa de tools)
      const leadRes = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Coordenador — ${orchName}`,
          systemPrompt: 'Você é o coordenador deste time. Seu papel é orquestrar e delegar ao(s) worker(s), garantindo que a tarefa do usuário seja cumprida com qualidade. Não execute as tarefas você mesmo — delegue, acompanhe e consolide o resultado final. Escreva sempre em português brasileiro.',
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          status: 'active',
        }),
      })
      const leadJson = await leadRes.json()
      if (!leadJson.success) throw new Error(leadJson.error || 'Erro ao criar coordenador')

      // 3. Create the Team (lead coordenador + o agente criado como worker)
      const teamRes = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orchName,
          description: selectedOption.orchestrationTemplate.description,
          config: { useCase: selectedUseCase },
          members: [
            { agentId: leadJson.data.id, role: 'lead', position: 0 },
            { agentId: createdAgent.id, role: 'worker', position: 1 },
          ],
        }),
      })
      const teamJson = await teamRes.json()
      if (!teamJson.success) throw new Error(teamJson.error || 'Erro ao criar o time')
```

- [ ] **Step 2: Atualizar a navegação final + copy de "orquestração"**

Trocar `router.push('/dashboard')` (após o `toast.success`) por `router.push(\`/dashboard/teams/${teamJson.data.id}\`)`. Trocar a validação do step 3 `'Defina um nome para a orquestracao'` → `'Defina um nome para o time'` e o toast `'Bem-vindo a Polaris IA.'` permanece. (Demais copy "orquestração" na JSX do step 3 é polish — deixar pro 6g/superfície.)

- [ ] **Step 3: Verificar typecheck** — `npx tsc --noEmit` → sem novos erros neste arquivo.

- [ ] **Step 4: Commit** (ver Task 5).

---

### Task 3: Deletar a UI de execução órfã (0 importadores confirmados)

**Files (delete):**
- `src/components/orchestrations/analytics-dashboard.tsx`
- `src/components/orchestrations/execution-history.tsx`
- `src/components/orchestrations/execution-detail-drawer.tsx`
- `src/components/orchestrations/execution-live-view.tsx`
- `src/components/orchestrations/execution-compare.tsx`
- `src/hooks/use-execution-stream.ts`
- `src/hooks/use-execution-notifications.ts`

- [ ] **Step 1: Reconfirmar 0 importadores (sanity, pós-edições)**

Run (Grep): cada nome acima fora do próprio arquivo → 0 ocorrências (exceto `use-execution-stream` referenciado só por `execution-live-view`, que também morre).

- [ ] **Step 2: Deletar**

```bash
git rm \
  "src/components/orchestrations/analytics-dashboard.tsx" \
  "src/components/orchestrations/execution-history.tsx" \
  "src/components/orchestrations/execution-detail-drawer.tsx" \
  "src/components/orchestrations/execution-live-view.tsx" \
  "src/components/orchestrations/execution-compare.tsx" \
  "src/hooks/use-execution-stream.ts" \
  "src/hooks/use-execution-notifications.ts"
```

- [ ] **Step 3: Verificar typecheck pós-remoção** — `npx tsc --noEmit` → sem NOVOS erros (nenhum `Cannot find module '.../execution-*'`). Flow-canvas intacto.

- [ ] **Step 4: Commit** (ver Task 5).

---

### Task 4: Verificação consolidada (gate local)

- [ ] **Step 1: `tsc` limpo (só baseline)**

Run: `npx tsc --noEmit` → confirmar que os únicos erros são o baseline conhecido (`Cannot find module bullmq/e2b/@xterm/diff2html` + Prisma-drift `mode`/`artifacts`), **nenhum** nos arquivos tocados e **nenhum** `Cannot find module '@/components/orchestrations/execution-*'` ou `@/hooks/use-execution-*`.

- [ ] **Step 2: Nenhum onboarding chama mais `/api/orchestrations`**

Run (Grep): `/api/orchestrations` em `src/app/onboarding/page.tsx` e `src/components/dashboard/onboarding-wizard.tsx` → 0 ocorrências.

---

### Task 5: Commit da fatia 6b

- [ ] **Step 1: Stage só os arquivos da fatia** (deletes já staged via `git rm`)

```bash
git add \
  "src/components/dashboard/onboarding-wizard.tsx" \
  "src/app/onboarding/page.tsx" \
  "docs/superpowers/specs/2026-06-16-sp6-teardown-design.md" \
  "docs/superpowers/plans/2026-06-16-sp6b-onboarding-repoint.md"
git diff --cached --name-status   # revisar: só a fatia (sem logos/docs soltos)
```

- [ ] **Step 2: Commit (heredoc)**

```bash
git commit -m "$(cat <<'EOF'
refactor(sp6b): repoint onboarding off orchestration + drop orphan execution UI

- /onboarding and onboarding-wizard now create a Team (template deploy /
  synthetic lead + created agent) instead of an AgentOrchestration
- Delete orphaned orchestration-execution UI (analytics/history/detail/
  live-view/compare + use-execution-* hooks) — 0 importers since 9fd88fa
- Engine/API/models still live (deleted in later SP6 slices); flow-canvas intact

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Push** (gated no usuário; redeploy EasyPanel).

## E2E (usuário, autenticado, pós-deploy)
1. `/onboarding` (novo usuário ou resetar) → criar agente → finalizar → deve criar um Team e cair em `/dashboard/teams/[id]` com 2 membros (Coordenador lead + o agente worker).
2. Onboarding-wizard (modal) → escolher um template → deve criar um Team e abrir `/dashboard/teams/[id]`.
3. Confirmar que nada quebrou no Workflows builder (o node de orchestration ainda lista — repoint dele é 6c).

## Self-review
- Cobertura: onboarding página (Task 2) + wizard (Task 1) repontados; UI órfã deletada (Task 3); API/modelos intocados. ✓
- Placeholders: nenhum (todo código presente). ✓
- Consistência: `data.id` (teams) vs `data.teamId` (template deploy) conforme as rotas reais; ids de template batem com `TEAM_TEMPLATES`. ✓
