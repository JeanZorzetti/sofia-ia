# SP6a — Repoint do Threads → Teams (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desacoplar o Threads da engine de Orquestrações (1º sub-passo do SP6) — sem ainda tocar nos modelos/rotas legados — repontando o link "Planejar com IA" para Teams, recriando o pipeline "Planejamento de Campanha Threads" como um **Team que reusa os agentes existentes** (preservando plugins/skills/MCP) e removendo os 6 scripts legados que criavam `AgentOrchestration`.

**Architecture:** O pipeline de campanha vira um Team com **lead sintético** (coordenador novo, sem tools — só orquestra) + os **5 agentes existentes** do Threads como membros (4 workers + Editor como reviewer), montado por um script self-contained que valida o roster com o validador puro compartilhado (`validateRoster`) e cria `Team`+`TeamMember` direto. A definição do roster mora num módulo **puro** (sem imports de DB) para ser verificável localmente sob `tsx` apesar da corrupção de `node_modules` do OneDrive. Nenhuma rota/modelo de orchestration é tocado neste sub-passo (a engine segue 100% viva → zero risco de quebrar build/prod).

**Tech Stack:** Next.js 16 (App Router), Prisma + PostgreSQL, TypeScript, `tsx` para scripts. Helpers existentes: `validateRoster` ([team-roster.ts](../../../src/lib/orchestration/team/team-roster.ts)), `createTeamWithRoster` ([create-team.ts](../../../src/lib/orchestration/team/create-team.ts)).

**Restrições (intactas):** coordinator `runTeam`/`startTeamRun`, flow-canvas (`components/orchestrations/*`), `output-webhooks.ts`. **Não** deletar nenhum `Agent`. **Não** tocar nos 3 modelos nem nas rotas `api/orchestrations/**` (isso é 6b/6c/6d).

**Agentes existentes do pipeline de campanha** (de `scripts/create-threads-campaign-orchestration.ts`, já wired a tools do Threads — **não recriar**):
- Estrategista `8b41f3f9-944f-420b-8800-6b7961b14aed`
- Analista `1f3811da-f92f-4cd6-a66f-05a6ff17ab94`
- Copywriter `87245dd3-76b3-4776-bdf0-2c38896e74c0`
- Editor `43d8df70-4f66-4407-9aca-a37a2bfc6299` → **reviewer**
- Gestor `8d03ebc6-6dcb-447b-9f41-5a78e6f7987f`
- `ADMIN_ID` (createdBy) `46212883-7220-41bf-bd8b-e676bfd1baaf`

---

### Task 1: Módulo puro do roster da Campanha + verificação (TDD)

**Files:**
- Test: `scripts/sp6a-verify.ts` (create)
- Create: `scripts/threads-campaign-roster.ts`

- [ ] **Step 1: Write the failing test** — `scripts/sp6a-verify.ts`

```ts
// SP6a verification — pure, no DB. Asserts the Campaign roster is valid for Teams.
// Run: npx tsx scripts/sp6a-verify.ts
import assert from 'node:assert'
import { validateRoster } from '../src/lib/orchestration/team/team-roster'
import { buildCampaignRoster } from './threads-campaign-roster'

const roster = buildCampaignRoster('00000000-0000-0000-0000-000000000000')

assert.equal(validateRoster(roster), null, 'roster da campanha deve ser válido')
assert.equal(roster.filter(m => m.role === 'lead').length, 1, 'exatamente 1 lead')
assert.equal(roster.filter(m => m.role === 'worker').length, 4, '4 workers (Estrategista, Analista, Copywriter, Gestor)')
assert.equal(roster.filter(m => m.role === 'reviewer').length, 1, '1 reviewer (Editor)')
assert.equal(roster.length, 6, '6 membros no total')
// posições contíguas 0..5
assert.deepEqual(roster.map(m => m.position), [0, 1, 2, 3, 4, 5], 'posições 0..5 em ordem do pipeline')

console.log('✅ sp6a-verify: roster da Campanha Threads válido (1 lead + 4 workers + 1 reviewer)')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx scripts/sp6a-verify.ts`
Expected: FAIL com `Cannot find module './threads-campaign-roster'` (módulo ainda não existe).

- [ ] **Step 3: Write the module** — `scripts/threads-campaign-roster.ts`

```ts
// Pure roster definition for the "Planejamento de Campanha Threads" Team (SP6a).
// Reuses EXISTING Threads agents (with their plugins/skills/MCP) as workers/reviewer;
// the lead is a fresh synthetic coordinator. NO DB imports — safe under tsx locally.
import type { RosterInput } from '../src/lib/orchestration/team/team-roster'

export const CAMPAIGN_TEAM_NAME = 'Planejamento de Campanha Threads'
export const CAMPAIGN_TEAM_DESCRIPTION =
  'Pipeline completo de planejamento de campanha: briefing → arco narrativo → validação de dados → redação de todos os posts → revisão editorial → agendamento automático no calendário.'
export const CAMPAIGN_TEAM_CONFIG = {
  inputLabel:
    'Briefing da campanha (ex: "Campanha de lançamento do Plano Pro — 10 posts em 2 semanas, foco em conversão, tema: como a Polaris IA multiplica resultados de marketing")',
}
export const CAMPAIGN_MODEL = 'llama-3.3-70b-versatile'

// Agentes EXISTENTES do Threads (já wired a plugins/skills/MCP). NÃO recriar.
export const CAMPAIGN_AGENT_IDS = {
  estrategista: '8b41f3f9-944f-420b-8800-6b7961b14aed',
  analista: '1f3811da-f92f-4cd6-a66f-05a6ff17ab94',
  copywriter: '87245dd3-76b3-4776-bdf0-2c38896e74c0',
  editor: '43d8df70-4f66-4407-9aca-a37a2bfc6299',
  gestor: '8d03ebc6-6dcb-447b-9f41-5a78e6f7987f',
} as const

// Lead sintético (só coordena — não precisa de tools do Threads).
export const CAMPAIGN_LEAD_SPEC = {
  name: 'Coordenador de Campanha Threads',
  model: CAMPAIGN_MODEL,
  systemPrompt: `Você é o coordenador de uma equipe de planejamento de campanhas para o Threads da Polaris IA. Seu papel é orquestrar — não executar as etapas você mesmo.

Ao receber o briefing da campanha, delegue em sequência:
1. Estrategista — arco narrativo + plano de N posts (tema, ângulo, tom, dia/horário de cada post).
2. Analista — validar e enriquecer o plano com dados reais do Threads usando as ferramentas dele (insights de perfil e de posts).
3. Copywriter — redigir TODOS os posts do plano (≤500 caracteres cada), usando o validador de formato.
4. Editor (Revisor) — revisão editorial e aprovação post a post.
5. Gestor — com os posts APROVADOS, agendar a publicação (mínimo 24h entre posts da mesma campanha).

Garanta que cada etapa recebeu o contexto da anterior e que o entregável final é uma campanha completa, revisada e agendada. Se um membro entregar algo incompleto ou fora do briefing, peça correção antes de seguir. Escreva sempre em português brasileiro.`,
}

/** Monta o roster do Team. `leadAgentId` é o agente lead recém-criado. */
export function buildCampaignRoster(leadAgentId: string): RosterInput[] {
  return [
    { agentId: leadAgentId, role: 'lead', model: CAMPAIGN_MODEL, position: 0 },
    { agentId: CAMPAIGN_AGENT_IDS.estrategista, role: 'worker', model: null, position: 1 },
    { agentId: CAMPAIGN_AGENT_IDS.analista, role: 'worker', model: null, position: 2 },
    { agentId: CAMPAIGN_AGENT_IDS.copywriter, role: 'worker', model: null, position: 3 },
    { agentId: CAMPAIGN_AGENT_IDS.editor, role: 'reviewer', model: null, position: 4 },
    { agentId: CAMPAIGN_AGENT_IDS.gestor, role: 'worker', model: null, position: 5 },
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx scripts/sp6a-verify.ts`
Expected: PASS — imprime `✅ sp6a-verify: roster da Campanha Threads válido (1 lead + 4 workers + 1 reviewer)` e sai com código 0.

- [ ] **Step 5: Commit** (junto com o resto — ver Task 5; não commitar isolado).

---

### Task 2: Repontar o link "Planejar com IA" → Teams

**Files:**
- Modify: `src/app/dashboard/threads/campaigns/page.tsx:441`

- [ ] **Step 1: Verificar a ocorrência (sanity)**

Run: `npx grep -rn "/dashboard/orchestrations" "src/app/dashboard/threads/campaigns/page.tsx"` (ou a ferramenta Grep)
Expected: exatamente 1 ocorrência, na linha 441 (`href="/dashboard/orchestrations"`).

- [ ] **Step 2: Editar o href**

Trocar:
```tsx
              href="/dashboard/orchestrations"
```
Por:
```tsx
              href="/dashboard/teams"
```
(O texto "Planejar com IA" e o ícone `Zap` permanecem; só o destino muda. Quando os redirects `dashboard/orchestrations/**` forem deletados em 6b, este link já não aponta mais para lá.)

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sem novos erros relacionados a este arquivo (aceitar apenas o baseline conhecido de módulos não instalados / drift de client Prisma, conforme nota de ambiente).

- [ ] **Step 4: Commit** (ver Task 5).

---

### Task 3: Script runnable que cria o Team da Campanha (reusa agentes existentes)

**Files:**
- Create: `scripts/create-threads-campaign-team.ts`

> **Por que self-contained (não importa `createTeamWithRoster`):** este é um seed de dados one-shot rodado contra o banco real (igual aos 6 scripts legados que substitui). Usar `new PrismaClient()` + `@prisma/client` evita depender da resolução do alias `@/` sob `tsx` e segue o padrão idiomático dos scripts deste repo. A invariante importante (roster válido) é mantida DRY ao reusar o validador puro `validateRoster`.

- [ ] **Step 1: Escrever o script**

```ts
/**
 * SP6a: cria o Team "Planejamento de Campanha Threads" reusando os agentes
 * EXISTENTES do Threads (preserva plugins/skills/MCP). Substitui o script legado
 * scripts/create-threads-campaign-orchestration.ts (que criava uma AgentOrchestration).
 *
 * Run (host com acesso ao banco real de prod):
 *   DATABASE_URL="postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable" \
 *     npx tsx scripts/create-threads-campaign-team.ts
 */
import { PrismaClient } from '@prisma/client'
import { validateRoster } from '../src/lib/orchestration/team/team-roster'
import {
  CAMPAIGN_TEAM_NAME,
  CAMPAIGN_TEAM_DESCRIPTION,
  CAMPAIGN_TEAM_CONFIG,
  CAMPAIGN_AGENT_IDS,
  CAMPAIGN_LEAD_SPEC,
  buildCampaignRoster,
} from './threads-campaign-roster'

const prisma = new PrismaClient()
const ADMIN_ID = '46212883-7220-41bf-bd8b-e676bfd1baaf'

async function main() {
  // 1. Os agentes existentes (com tools) precisam existir.
  const workerIds = Object.values(CAMPAIGN_AGENT_IDS)
  const found = await prisma.agent.findMany({
    where: { id: { in: workerIds } },
    select: { id: true, name: true },
  })
  if (found.length !== workerIds.length) {
    const missing = workerIds.filter(id => !found.some(a => a.id === id))
    console.error('❌ Agentes do Threads não encontrados:', missing)
    process.exit(1)
  }
  console.log('✅ Agentes do Threads verificados:', found.map(a => a.name).join(', '))

  // 2. Idempotência: não recriar se já existe.
  const existing = await prisma.team.findFirst({
    where: { name: CAMPAIGN_TEAM_NAME, createdBy: ADMIN_ID },
  })
  if (existing) {
    console.log(`⏭️  Team já existe: ${existing.id} — nada a fazer.`)
    return
  }

  // 3. Lead sintético (coordena; não precisa de tools).
  const lead = await prisma.agent.create({
    data: {
      name: CAMPAIGN_LEAD_SPEC.name,
      description: 'Lead coordenador do time de Planejamento de Campanha Threads (SP6a).',
      systemPrompt: CAMPAIGN_LEAD_SPEC.systemPrompt,
      model: CAMPAIGN_LEAD_SPEC.model,
      temperature: 0.7,
      status: 'active',
      createdBy: ADMIN_ID,
      config: { role: 'lead', createdBy: 'sp6a-threads-repoint' },
    },
  })

  // 4. Roster + validação (mesma regra de POST /api/teams).
  const roster = buildCampaignRoster(lead.id)
  const err = validateRoster(roster)
  if (err) {
    console.error('❌ Roster inválido:', err)
    process.exit(1)
  }

  // 5. Cria o Team com os membros.
  const team = await prisma.team.create({
    data: {
      name: CAMPAIGN_TEAM_NAME,
      description: CAMPAIGN_TEAM_DESCRIPTION,
      config: CAMPAIGN_TEAM_CONFIG,
      createdBy: ADMIN_ID,
      members: {
        create: roster.map(m => ({
          agentId: m.agentId,
          role: m.role,
          model: m.model ?? null,
          position: m.position,
        })),
      },
    },
    include: { members: true },
  })

  console.log(`\n✅ Team criado: ${team.id} (${team.members.length} membros)`)
  console.log(`🔗 /dashboard/teams/${team.id}`)
}

main()
  .catch(e => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: sem novos erros nos arquivos `scripts/threads-campaign-roster.ts` / `scripts/create-threads-campaign-team.ts` (baseline conhecido à parte). Confirma que os campos usados (`prisma.agent.create`, `prisma.team.create` com `members.create`, campos `role/model/position`) batem com o schema.

> **Execução real** = E2E (seção abaixo), feita pelo usuário contra o banco de prod. Não roda localmente por causa do hang de `pg`/`node_modules` no OneDrive.

- [ ] **Step 3: Commit** (ver Task 5).

---

### Task 4: Deletar os 6 scripts legados de orchestration do Threads

**Files (delete):**
- `scripts/create-threads-campaign-orchestration.ts`
- `scripts/create-threads-ab-test-orchestration.ts`
- `scripts/create-threads-meta-content-orchestration.ts`
- `scripts/create-threads-production-orchestration.ts`
- `scripts/create-threads-thread-format-orchestration.ts`
- `scripts/create-threads-visual-production-orchestration.ts`

> Decisão do usuário (2026-06-16): só o pipeline **Campanha** é portado para Team. Os outros 5 não são recriados — seus **agentes permanecem** no banco (SP6 não deleta `Agent`), então o usuário pode remontá-los como Teams na UI quando quiser.

- [ ] **Step 1: Deletar os arquivos**

```bash
git rm \
  "scripts/create-threads-campaign-orchestration.ts" \
  "scripts/create-threads-ab-test-orchestration.ts" \
  "scripts/create-threads-meta-content-orchestration.ts" \
  "scripts/create-threads-production-orchestration.ts" \
  "scripts/create-threads-thread-format-orchestration.ts" \
  "scripts/create-threads-visual-production-orchestration.ts"
```

- [ ] **Step 2: Verificar que nada vivo referencia esses scripts**

Run: `npx grep -rn "create-threads-.*-orchestration" "src" "scripts"` (ou a ferramenta Grep)
Expected: 0 ocorrências (eram scripts standalone, não importados por código de runtime).

- [ ] **Step 3: Verificar typecheck pós-remoção**

Run: `npx tsc --noEmit`
Expected: sem novos erros (baseline conhecido à parte).

- [ ] **Step 4: Commit** (ver Task 5).

---

### Task 5: Commit da fatia 6a (apenas os arquivos desta fatia)

> A árvore tem mudanças não relacionadas (logos/docs). Commitar **somente** os arquivos do 6a. Caminhos sem `[id]` aqui, então pathspec simples basta.

- [ ] **Step 1: Rodar os gates locais finais**

Run: `npx tsx scripts/sp6a-verify.ts` → Expected: PASS (exit 0).
Run: `npx tsc --noEmit` → Expected: só baseline conhecido.

- [ ] **Step 2: Stage + commit (heredoc no Bash tool)**

```bash
git add \
  "src/app/dashboard/threads/campaigns/page.tsx" \
  "scripts/threads-campaign-roster.ts" \
  "scripts/create-threads-campaign-team.ts" \
  "scripts/sp6a-verify.ts" \
  "docs/superpowers/specs/2026-06-16-sp6-teardown-design.md" \
  "docs/superpowers/plans/2026-06-16-sp6a-threads-repoint.md"
# (os 6 deletes já foram staged via `git rm` na Task 4)
git commit -m "$(cat <<'EOF'
refactor(sp6a): repoint Threads off the orchestration engine

- "Planejar com IA" link → /dashboard/teams
- Port the "Planejamento de Campanha" pipeline to a Team that reuses the
  existing Threads agents (preserving their plugins/skills/MCP) via a
  synthetic lead + workers + Editor-as-reviewer
- Remove the 6 legacy create-threads-*-orchestration seed scripts
- No orchestration models/routes touched yet (that is SP6b–SP6d)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Push** (somente após o usuário confirmar — segue a regra "commit/push quando concluir a entrega"). `git push` dispara o redeploy do EasyPanel (app + worker).

---

## E2E (manual, com o usuário — gate real = prod)

1. **Rodar o seed contra prod** (host com acesso ao banco real):
   `DATABASE_URL="postgres://sofia_db:<senha>@2.24.207.200:5435/sofia_db?sslmode=disable" npx tsx scripts/create-threads-campaign-team.ts`
   Esperado: "✅ Agentes do Threads verificados: …" + "✅ Team criado: <id> (6 membros)". Rodar de novo = "⏭️ Team já existe" (idempotente).
2. Após o deploy: abrir `/dashboard/threads/campaigns` → clicar **"Planejar com IA"** → deve cair em `/dashboard/teams` (não mais em orchestrations).
3. Abrir o Team "Planejamento de Campanha Threads" em `/dashboard/teams/<id>` → confirmar 6 membros (Coordenador lead + Estrategista/Analista/Copywriter workers + Editor reviewer + Gestor worker) e que os agentes reusados mantêm suas ferramentas do Threads.

## Self-review (executado)

- **Cobertura do spec (6a):** link repontado (Task 2 ✓), pipeline de campanha → Team reusando agentes existentes (Tasks 1+3 ✓), 6 scripts deletados (Task 4 ✓). Demais pipelines: decisão explícita de não portar (agentes preservados).
- **Placeholders:** nenhum — todo código completo; o único `<senha>` é redação intencional de segredo (não um TODO).
- **Consistência de tipos:** `buildCampaignRoster` retorna `RosterInput[]`; `validateRoster(RosterInput[]) → string | null`; nomes `CAMPAIGN_*` idênticos entre módulo, verify e runner; `model: null` é válido em `RosterInput.model?: string | null`; `prisma.team.create`/`agent.create` usam campos confirmados no schema.
- **Escopo:** fatia única, não toca modelos/rotas de orchestration → build/prod seguros; prepara 6b.
