# SP6d — Decouple landing/test-drive + marketplace dead-branch + deletar sharing (Plan)

> REQUIRED SUB-SKILL: superpowers:executing-plans. (Métricas → fatia 6e separada.)

**Goal:** Remover as referências de MODELO de orchestration nos consumidores de landing/marketplace/sharing — sem perda funcional. A landing volta a usar o fallback estático que já existe; o branch de deploy de "orchestration" é dead code (nenhum template `type:'orchestration'` em `data/templates.ts`); o sharing de execução não tem mais como existir (sem execuções reais) e nada linka pra `/share/`.

**Escopo (model-consumers, parte 1):** landing (`(public)/page.tsx` + `api/landing/template-run`) · marketplace deploy dead-branch (`api/templates/[id]/deploy` + nav em `dashboard/templates/page.tsx`) · deletar sharing (3 arquivos). **Métricas (admin/digest/analytics) → 6e.** API/modelos/rotas mortas seguem (6e/6f). Coordinator/Teams intocados.

**Fatos:** `data/templates.ts` sem template `type:'orchestration'` (branch morto). Nada em `src` linka `/share/`. `TemplateTestDriveCard` passa `orchestrationId` só quando presente; com `null` cai no Path B (fallback `FALLBACK_TEMPLATES`).

---

### Task 1: Decouple `(public)/page.tsx` (sempre estático)
- Remover `import { prisma } from '@/lib/prisma'`, a `interface AgentStep`, a função `dbToTemplateCard`.
- Trocar o bloco de dados do `LandingPage` (try/findMany + `liveTemplates`/`templateCards` condicional) por `templateCards` montado direto de `homeOrchestrationTemplates` (`orchestrationId: null`).
- Gate: `tsc` (sem `prisma`/`dbToTemplateCard`/`AgentStep` órfãos).

### Task 2: Remover Path A de `api/landing/template-run/route.ts`
- Remover `import { prisma }`, a `interface AgentStep`, `orchestrationId` do destructure, e todo o bloco `// --- Path A ... if (orchestrationId) {...}`. Mantém o fallback (Path B).

### Task 3: Remover branch morto `orchestration` do marketplace
- `api/templates/[id]/deploy/route.ts`: deletar o `else if (template.type === 'orchestration') {...}` (84-181) — única ref a `agentOrchestration` no arquivo.
- `dashboard/templates/page.tsx`: tirar o ramo `result.type === 'orchestration'` (description ternário + `else if` que dava push pra `/dashboard/orchestrations`).

### Task 4: Deletar sharing (balde B)
- `git rm` `src/app/share/[token]/page.tsx`, `src/app/api/public/executions/[id]/route.ts`, `src/app/api/v1/executions/[id]/route.ts`.

### Task 5: Gates + commit (push gated)
- `tsc` baseline-only; grep `agentOrchestration|orchestrationExecution` nesses arquivos → 0; `/dashboard/orchestrations` em `dashboard/templates/page.tsx` → 0; `/share/` órfão ok.
- Commit só a fatia.

## E2E (usuário)
- Home → test-drive de um template → roda (via fallback) e mostra resultado.
- `/dashboard/templates` → deploy de template agent/workflow → navega certo (orchestration não existe mais).
