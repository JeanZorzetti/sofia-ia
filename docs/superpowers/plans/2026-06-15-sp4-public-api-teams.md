# SP4 — API pública/v1 → Teams — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir disparar um Team run por API key (de fora — Zapier/Make/n8n), re-homando a API pública/v1 da engine de Orquestrações no Teams.

**Architecture:** A nova superfície é **fina**: 2 rotas de disparo (`v1` Bearer + `public` X-API-Key) + 2 rotas de listagem, todas reusando `startTeamRun` (helper já extraído no SP3). Um módulo puro novo `team-run-api.ts` concentra a tradução HTTP↔domínio (`parseTeamRunBody` + `TEAM_RUN_STATUS_BY_CODE`) — único ponto testável por `tsx`. Coordinator (`runTeam`) e `startTeamRun` ficam **intactos**. Docs/copy (openapi, api-reference, 6 páginas Zapier/Make/n8n) repontados para Teams.

**Tech Stack:** Next.js 16 App Router (route handlers), Prisma, TypeScript. Verificação local: `npx tsc --noEmit` + `npx tsx scripts/sp4-verify.ts` (OneDrive corrompe node_modules → NÃO rodar jest/next build/prisma generate). Gate real = deploy EasyPanel (push na `main`).

**Spec:** `docs/superpowers/specs/2026-06-15-sp4-public-api-teams-design.md`

---

## File Structure

**Criar:**
- `src/lib/orchestration/team/team-run-api.ts` — lógica pura: `parseTeamRunBody(body)` (aliasing `input`/`message`→`mission`, normaliza `mode`) + `TEAM_RUN_STATUS_BY_CODE` (código→HTTP). Fonte única.
- `src/app/api/v1/teams/[id]/run/route.ts` — POST disparo, auth Bearer (`getAuthFromApiKey`→`.userId`).
- `src/app/api/v1/teams/route.ts` — GET listagem (Bearer).
- `src/app/api/public/teams/[id]/run/route.ts` — POST disparo, auth X-API-Key (`authenticateApiKey`→`.id`).
- `src/app/api/public/teams/route.ts` — GET listagem (X-API-Key).
- `scripts/sp4-verify.ts` — verificação pura (node:assert, imports relativos).

**Modificar:**
- `src/app/api/teams/[id]/run/route.ts` — usar `TEAM_RUN_STATUS_BY_CODE` compartilhado (remover const inline).
- `src/app/api/docs/openapi.json/route.ts` — orchestration→Teams.
- `src/app/(public)/api-reference/page.tsx` — tabela + exemplo → Teams.
- `src/app/(public)/integrations/{zapier,make,n8n}/page.tsx` — exemplos → Teams run + webhook.
- `src/app/dashboard/integrations/{zapier,make,n8n}/page.tsx` — exemplos → Teams run + webhook.

**NÃO tocar:** `team-coordinator.ts`, `start-team-run.ts`, helpers de auth (`api-key.ts`, `api-key-auth.ts`), rotas de orchestration (morrem no SP6).

---

## Task 1: Módulo puro `team-run-api.ts` (TDD)

**Files:**
- Create: `src/lib/orchestration/team/team-run-api.ts`
- Test: `scripts/sp4-verify.ts`

- [ ] **Step 1: Escrever o teste que falha** — criar `scripts/sp4-verify.ts`:

```ts
// Pure-logic verification for SP4 API. Run: npx tsx scripts/sp4-verify.ts
// Imports are RELATIVE so tsx can load the module without path aliases.
import assert from 'node:assert'
import { parseTeamRunBody, TEAM_RUN_STATUS_BY_CODE } from '../src/lib/orchestration/team/team-run-api'

// mission direto
assert.equal(parseTeamRunBody({ mission: 'do x' }).mission, 'do x')
// alias input
assert.equal(parseTeamRunBody({ input: 'from input' }).mission, 'from input')
// alias message
assert.equal(parseTeamRunBody({ message: 'from message' }).mission, 'from message')
// precedência mission > input > message
assert.equal(parseTeamRunBody({ mission: 'm', input: 'i', message: 'g' }).mission, 'm')
assert.equal(parseTeamRunBody({ input: 'i', message: 'g' }).mission, 'i')
// trim de espaços
assert.equal(parseTeamRunBody({ mission: '  spaced  ' }).mission, 'spaced')
// vazio → ''
assert.equal(parseTeamRunBody({}).mission, '')
// body não-objeto → '' (defensivo)
assert.equal(parseTeamRunBody(null).mission, '')
assert.equal(parseTeamRunBody('str').mission, '')
assert.equal(parseTeamRunBody(undefined).mission, '')
// mode default chat
assert.equal(parseTeamRunBody({ mission: 'x' }).mode, 'chat')
// mode code
assert.equal(parseTeamRunBody({ mission: 'x', mode: 'code' }).mode, 'code')
// mode inválido → chat
assert.equal(parseTeamRunBody({ mission: 'x', mode: 'weird' }).mode, 'chat')
// repoUrl / base presentes
{
  const p = parseTeamRunBody({ mission: 'x', repoUrl: 'https://r', base: 'dev' })
  assert.equal(p.repoUrl, 'https://r')
  assert.equal(p.base, 'dev')
}
// repoUrl / base ausentes → null
assert.equal(parseTeamRunBody({ mission: 'x' }).repoUrl, null)
assert.equal(parseTeamRunBody({ mission: 'x' }).base, null)
// status map: 4 códigos
assert.equal(TEAM_RUN_STATUS_BY_CODE.not_found, 404)
assert.equal(TEAM_RUN_STATUS_BY_CODE.invalid_roster, 400)
assert.equal(TEAM_RUN_STATUS_BY_CODE.missing_mission, 400)
assert.equal(TEAM_RUN_STATUS_BY_CODE.queue_unavailable, 503)

console.log('✅ SP4 team-run-api.ts checks passed')
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx tsx scripts/sp4-verify.ts`
Expected: FAIL — `Cannot find module '../src/lib/orchestration/team/team-run-api'`.

- [ ] **Step 3: Implementar o módulo** — criar `src/lib/orchestration/team/team-run-api.ts`:

```ts
// HTTP↔domínio para as rotas de disparo de Team run por API key (SP4).
// Mantém as rotas finas e dá um ponto puro testável. Reusado pela rota de sessão (status map).
import type { TeamRunMode, TeamRunErrorCode } from './start-team-run'

export interface ParsedTeamRunBody {
  mission: string          // já trimado; '' se ausente (startTeamRun lança missing_mission)
  mode: TeamRunMode        // 'code' só se body.mode === 'code', senão 'chat'
  repoUrl: string | null
  base: string | null
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Lê o body de uma requisição de disparo. Defensivo (body pode não ser objeto).
 * Aliases p/ compat com templates Zapier/Make/n8n: mission > input > message.
 */
export function parseTeamRunBody(body: unknown): ParsedTeamRunBody {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const mission = str(b.mission) || str(b.input) || str(b.message)
  const mode: TeamRunMode = b.mode === 'code' ? 'code' : 'chat'
  return {
    mission,
    mode,
    repoUrl: str(b.repoUrl) || null,
    base: str(b.base) || null,
  }
}

/** Fonte única do mapa código→HTTP (rotas de sessão + API key importam isto). */
export const TEAM_RUN_STATUS_BY_CODE: Record<TeamRunErrorCode, number> = {
  not_found: 404,
  invalid_roster: 400,
  missing_mission: 400,
  queue_unavailable: 503,
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx tsx scripts/sp4-verify.ts`
Expected: PASS — `✅ SP4 team-run-api.ts checks passed`.

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/jeanz/OneDrive/Desktop/ROI Labs/Imob/sofia-next"
git add src/lib/orchestration/team/team-run-api.ts scripts/sp4-verify.ts
git commit -F - <<'EOF'
feat(sp4): pure team-run-api helper (parseTeamRunBody + status map)

Shared HTTP↔domain boundary for the API-key Team run routes:
mission aliasing (input/message→mission), mode normalization, and a
single TeamRunError code→HTTP status map. Verified via scripts/sp4-verify.ts.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 2: Rotas v1 (Bearer) — run + list

**Files:**
- Create: `src/app/api/v1/teams/[id]/run/route.ts`
- Create: `src/app/api/v1/teams/route.ts`

- [ ] **Step 1: Criar a rota de disparo** — `src/app/api/v1/teams/[id]/run/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromApiKey } from '@/lib/api-key-auth'
import { startTeamRun, TeamRunError } from '@/lib/orchestration/team/start-team-run'
import { parseTeamRunBody, TEAM_RUN_STATUS_BY_CODE } from '@/lib/orchestration/team/team-run-api'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/v1/teams/[id]/run
 * Dispara um Team run via API key (Authorization: Bearer sk-...).
 * Body: { mission | input | message, mode?: 'chat' | 'code' }
 * Retorna: 202 { success, data: { runId, status, mode } }. Resultado via output webhook do time.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromApiKey(request)
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Provide a valid API key via Authorization: Bearer sk-...' },
      { status: 401 },
    )
  }

  const { id } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const result = await startTeamRun(id, { ...parseTeamRunBody(body), userId: auth.userId })
    return NextResponse.json(
      { success: true, data: { runId: result.runId, status: 'pending', mode: result.mode } },
      { status: 202 },
    )
  } catch (error: unknown) {
    if (error instanceof TeamRunError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: TEAM_RUN_STATUS_BY_CODE[error.code] ?? 400 },
      )
    }
    console.error('[v1/teams/run] POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Criar a rota de listagem** — `src/app/api/v1/teams/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthFromApiKey } from '@/lib/api-key-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/teams
 * Lista os times do tenant autenticado via API key (Authorization: Bearer sk-...).
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromApiKey(request)
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide a valid API key via Authorization: Bearer sk-...' },
      { status: 401 },
    )
  }

  try {
    const teams = await prisma.team.findMany({
      where: { createdBy: auth.userId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: teams, total: teams.length })
  } catch (error: unknown) {
    console.error('[v1/teams] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos nestes arquivos. (Ruído aceitável: módulos não instalados / client Prisma stale — padrão da máquina. `prisma.team` e `getAuthFromApiKey` já existem.)

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/jeanz/OneDrive/Desktop/ROI Labs/Imob/sofia-next"
git add "src/app/api/v1/teams/route.ts" "src/app/api/v1/teams/[id]/run/route.ts"
git commit -F - <<'EOF'
feat(sp4): v1 (Bearer) Team API routes — run + list

POST /api/v1/teams/[id]/run dispatches via startTeamRun; GET /api/v1/teams
lists the tenant's teams. Auth via getAuthFromApiKey (Authorization: Bearer).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 3: Rotas public (X-API-Key) — run + list

**Files:**
- Create: `src/app/api/public/teams/[id]/run/route.ts`
- Create: `src/app/api/public/teams/route.ts`

- [ ] **Step 1: Criar a rota de disparo** — `src/app/api/public/teams/[id]/run/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey, getApiKeyFromRequest } from '@/lib/api-key'
import { startTeamRun, TeamRunError } from '@/lib/orchestration/team/start-team-run'
import { parseTeamRunBody, TEAM_RUN_STATUS_BY_CODE } from '@/lib/orchestration/team/team-run-api'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/public/teams/:id/run
 * Dispara um Team run via API pública (X-API-Key: sk_...).
 * Body: { mission | input | message, mode?: 'chat' | 'code' }
 * Retorna: 202 { success, data: { runId, status, mode } }. Resultado via output webhook do time.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateApiKey(getApiKeyFromRequest(request))
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing API key. Pass your key in the X-API-Key header.' },
      { status: 401 },
    )
  }

  const { id } = await params

  try {
    const body = await request.json().catch(() => ({}))
    const result = await startTeamRun(id, { ...parseTeamRunBody(body), userId: user.id })
    return NextResponse.json(
      { success: true, data: { runId: result.runId, status: 'pending', mode: result.mode } },
      { status: 202 },
    )
  } catch (error: unknown) {
    if (error instanceof TeamRunError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: TEAM_RUN_STATUS_BY_CODE[error.code] ?? 400 },
      )
    }
    console.error('[public/teams/run] POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Criar a rota de listagem** — `src/app/api/public/teams/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, getApiKeyFromRequest } from '@/lib/api-key'

export const dynamic = 'force-dynamic'

/**
 * GET /api/public/teams
 * Lista os times do usuário autenticado via X-API-Key.
 */
export async function GET(request: NextRequest) {
  const user = await authenticateApiKey(getApiKeyFromRequest(request))
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing API key. Pass your key in the X-API-Key header.' },
      { status: 401 },
    )
  }

  const teams = await prisma.team.findMany({
    where: { createdBy: user.id },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: teams, meta: { count: teams.length } })
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/jeanz/OneDrive/Desktop/ROI Labs/Imob/sofia-next"
git add "src/app/api/public/teams/route.ts" "src/app/api/public/teams/[id]/run/route.ts"
git commit -F - <<'EOF'
feat(sp4): public (X-API-Key) Team API routes — run + list

POST /api/public/teams/[id]/run dispatches via startTeamRun; GET
/api/public/teams lists the user's teams. Auth via authenticateApiKey
(X-API-Key header).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 4: Refatorar a rota de sessão para usar o status map compartilhado

**Files:**
- Modify: `src/app/api/teams/[id]/run/route.ts`

- [ ] **Step 1: Adicionar o import e remover a const inline** — aplicar dois Edits.

Edit A — adicionar import logo após o import de `start-team-run`:

old:
```ts
import { startTeamRun, TeamRunError } from '@/lib/orchestration/team/start-team-run'

// The coordination loop runs in the background (after the response is flushed).
export const maxDuration = 300

const STATUS_BY_CODE: Record<string, number> = {
  not_found: 404,
  invalid_roster: 400,
  missing_mission: 400,
  queue_unavailable: 503,
}
```
new:
```ts
import { startTeamRun, TeamRunError } from '@/lib/orchestration/team/start-team-run'
import { TEAM_RUN_STATUS_BY_CODE } from '@/lib/orchestration/team/team-run-api'

// The coordination loop runs in the background (after the response is flushed).
export const maxDuration = 300
```

Edit B — usar o mapa compartilhado no catch:

old:
```ts
      return NextResponse.json({ success: false, error: error.message }, { status: STATUS_BY_CODE[error.code] ?? 400 })
```
new:
```ts
      return NextResponse.json({ success: false, error: error.message }, { status: TEAM_RUN_STATUS_BY_CODE[error.code] ?? 400 })
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos. Confirmar que `STATUS_BY_CODE` não é mais referenciado no arquivo.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/jeanz/OneDrive/Desktop/ROI Labs/Imob/sofia-next"
git add "src/app/api/teams/[id]/run/route.ts"
git commit -F - <<'EOF'
refactor(sp4): session run route uses shared TEAM_RUN_STATUS_BY_CODE

Single source of truth for the TeamRunError code→HTTP map; removes the
inline duplicate. Coordinator/startTeamRun untouched.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 5: OpenAPI — orchestration → Teams

**Files:**
- Modify: `src/app/api/docs/openapi.json/route.ts`

- [ ] **Step 1: Atualizar info.description**

Edit A:
old:
```ts
      'REST API for programmatic access to Polaris IA orchestrations, agents and executions. Authenticate with an API key from /dashboard/api-keys.',
```
new:
```ts
      'REST API for programmatic access to Polaris IA teams, agents and runs. Authenticate with an API key from /dashboard/api-keys.',
```

- [ ] **Step 2: Trocar o schema `Orchestration` por `Team`**

Edit B:
old:
```ts
      Orchestration: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Content Pipeline' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'inactive', 'draft'] },
          agentCount: { type: 'integer', example: 3 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
```
new:
```ts
      Team: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Content Pipeline' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'inactive'] },
          memberCount: { type: 'integer', example: 3 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
```

- [ ] **Step 3: Trocar o schema `Execution` por `TeamRun`**

Edit C:
old:
```ts
      Execution: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          orchestrationId: { type: 'string' },
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed'],
          },
          input: { type: 'object', nullable: true },
          output: { type: 'object', nullable: true },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          error: { type: 'string', nullable: true },
        },
      },
```
new:
```ts
      TeamRun: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          teamId: { type: 'string' },
          mission: { type: 'string', nullable: true },
          mode: { type: 'string', enum: ['chat', 'code'] },
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed'],
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
```

- [ ] **Step 4: Trocar os paths de orchestration por Teams**

Edit D — substituir os dois blocos (`/api/public/orchestrations` e `/api/public/orchestrations/{id}/run`):
old:
```ts
    '/api/public/orchestrations': {
      get: {
        summary: 'List orchestrations',
        description: 'Returns all active orchestrations belonging to the authenticated user.',
        operationId: 'listOrchestrations',
        tags: ['Orchestrations'],
        responses: {
          '200': {
            description: 'List of orchestrations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Orchestration' } },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid or missing API key',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/public/orchestrations/{id}/run': {
      post: {
        summary: 'Run an orchestration',
        description:
          'Triggers a new execution. Returns immediately with an executionId — poll /api/public/executions/{id} for the result.',
        operationId: 'runOrchestration',
        tags: ['Orchestrations'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Orchestration ID',
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  input: {
                    type: 'string',
                    description: 'Initial input text for the first agent',
                    example: 'Write a blog post about AI orchestration',
                  },
                },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Execution accepted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        executionId: { type: 'string' },
                        status: { type: 'string', example: 'pending' },
                        pollUrl: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'Orchestration not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
```
new:
```ts
    '/api/public/teams': {
      get: {
        summary: 'List teams',
        description: 'Returns all teams belonging to the authenticated user.',
        operationId: 'listTeams',
        tags: ['Teams'],
        responses: {
          '200': {
            description: 'List of teams',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Team' } },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid or missing API key',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/public/teams/{id}/run': {
      post: {
        summary: 'Run a team',
        description:
          'Triggers a new team run (Lead coordinates Workers). Returns immediately with a runId — the result is delivered via the team output webhook (configure it in the team room).',
        operationId: 'runTeam',
        tags: ['Teams'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Team ID',
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  mission: {
                    type: 'string',
                    description: 'The mission/task for the team (aliases: input, message)',
                    example: 'Write a blog post about AI teams',
                  },
                  mode: {
                    type: 'string',
                    enum: ['chat', 'code'],
                    default: 'chat',
                    description: 'Run mode',
                  },
                },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Run accepted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        runId: { type: 'string' },
                        status: { type: 'string', example: 'pending' },
                        mode: { type: 'string', example: 'chat' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'Team not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
```

- [ ] **Step 5: Remover o path de poll de execuções** (substituído por webhook)

Edit E — remover o bloco inteiro `/api/public/executions/{id}` (e a vírgula que o precede):
old:
```ts
    },
    '/api/public/executions/{id}': {
      get: {
        summary: 'Get execution status',
        description:
          'Poll after calling /run to get status and, when completed, the full output.',
        operationId: 'getExecution',
        tags: ['Executions'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Execution ID returned by /run',
          },
        ],
        responses: {
          '200': {
            description: 'Execution details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Execution' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'Execution not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
  },
```
new:
```ts
    },
  },
```

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos. (Conferir que não restou nenhuma referência a `#/components/schemas/Orchestration` ou `/Execution` — `grep -n "Orchestration\|Execution" src/app/api/docs/openapi.json/route.ts` deve voltar vazio.)

- [ ] **Step 7: Commit**

```bash
cd "c:/Users/jeanz/OneDrive/Desktop/ROI Labs/Imob/sofia-next"
git add "src/app/api/docs/openapi.json/route.ts"
git commit -F - <<'EOF'
docs(sp4): openapi advertises Teams API instead of orchestrations

Replaces Orchestration/Execution schemas with Team/TeamRun, swaps the
public orchestration paths for /api/public/teams + /api/public/teams/{id}/run,
and drops the executions poll path (results now come via output webhooks).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 6: API Reference page — tabela + exemplo

**Files:**
- Modify: `src/app/(public)/api-reference/page.tsx`

- [ ] **Step 1: Atualizar metadata.description**

Edit A:
old:
```ts
  description: 'Referência completa da API REST do Polaris IA. Autenticação, endpoints de agentes, orquestrações, Knowledge Base e webhooks.',
```
new:
```ts
  description: 'Referência completa da API REST do Polaris IA. Autenticação, endpoints de agentes, times, Knowledge Base e webhooks.',
```

- [ ] **Step 2: Trocar o grupo "Orquestrações" por "Times"**

Edit B:
old:
```ts
  {
    group: 'Orquestrações',
    color: 'border-purple-500/30',
    routes: [
      { method: 'GET', path: '/api/orchestrations', desc: 'Listar orquestrações' },
      { method: 'POST', path: '/api/orchestrations', desc: 'Criar orquestração' },
      { method: 'POST', path: '/api/orchestrations/:id/execute', desc: 'Executar orquestração (SSE)' },
      { method: 'GET', path: '/api/orchestrations/executions', desc: 'Histórico de execuções' },
    ],
  },
```
new:
```ts
  {
    group: 'Times (API key)',
    color: 'border-purple-500/30',
    routes: [
      { method: 'GET', path: '/api/public/teams', desc: 'Listar times (X-API-Key)' },
      { method: 'POST', path: '/api/public/teams/:id/run', desc: 'Disparar um time (X-API-Key)' },
      { method: 'GET', path: '/api/v1/teams', desc: 'Listar times (Bearer)' },
      { method: 'POST', path: '/api/v1/teams/:id/run', desc: 'Disparar um time (Bearer)' },
    ],
  },
```

- [ ] **Step 3: Trocar o bloco SSE por um exemplo de disparo de Time**

Edit C:
old:
```ts
              <h3 className="font-medium text-white mb-2">Streaming SSE — Execução de Orquestrações</h3>
              <p className="text-xs text-foreground-tertiary mb-3">Execuções retornam Server-Sent Events (SSE) com updates em tempo real por agente.</p>
              <pre className="text-xs text-green-300 font-mono bg-black/30 p-3 rounded-lg overflow-x-auto">
{`const es = new EventSource('/api/orchestrations/ID/execute?input=...')
es.onmessage = (e) => {
  const data = JSON.parse(e.data)
  // data.type: 'agent_start' | 'agent_chunk' | 'agent_complete' | 'done'
  // data.agentName, data.content, data.metrics
}`}
              </pre>
```
new:
```ts
              <h3 className="font-medium text-white mb-2">Disparar um Time via API</h3>
              <p className="text-xs text-foreground-tertiary mb-3">Dispare um time com sua API key. A execução roda em background; o resultado chega via output webhook configurado na sala do time.</p>
              <pre className="text-xs text-green-300 font-mono bg-black/30 p-3 rounded-lg overflow-x-auto">
{`curl -X POST https://polarisia.com.br/api/public/teams/TEAM_ID/run \\
  -H "X-API-Key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"mission": "Escreva um resumo do relatório anexo"}'

// → 202 { "success": true, "data": { "runId": "...", "status": "pending", "mode": "chat" } }`}
              </pre>
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/jeanz/OneDrive/Desktop/ROI Labs/Imob/sofia-next"
git add "src/app/(public)/api-reference/page.tsx"
git commit -F - <<'EOF'
docs(sp4): api-reference points to Teams API + run example

Replaces the Orchestrations endpoint group with the Teams API-key routes
and swaps the SSE example for a curl example of disparar a team run.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 7: Copy pública das integrações (Zapier/Make/n8n)

**Files:**
- Modify: `src/app/(public)/integrations/zapier/page.tsx`
- Modify: `src/app/(public)/integrations/make/page.tsx`
- Modify: `src/app/(public)/integrations/n8n/page.tsx`

> Padrão dos exemplos públicos: header `x-api-key: sk_live_...`, endpoint `/api/public/teams/SEU_TEAM_ID/run`, body `{ "mission": ... }`. Polling vira guidance de output webhook.

### 7a. `(public)/integrations/zapier/page.tsx`

- [ ] **Step 1: openGraph.description**

old:
```ts
    description: 'Automatize orquestracoes de IA com Zapier. Sem codigo necessario.',
```
new:
```ts
    description: 'Automatize times de IA com Zapier. Sem codigo necessario.',
```

- [ ] **Step 2: STEP 3 code (action HTTP)**

old:
```ts
    code: `URL: https://polarisia.com.br/api/v1/integrations/zapier/execute

Headers:
  x-api-key: sk_live_SEU_TOKEN
  Content-Type: application/json

Body (JSON):
{
  "orchestrationId": "ID_DA_ORQUESTRACAO",
  "input": "{{triggerData}}"
}`,
```
new:
```ts
    code: `URL: https://polarisia.com.br/api/public/teams/SEU_TEAM_ID/run

Headers:
  x-api-key: sk_live_SEU_TOKEN
  Content-Type: application/json

Body (JSON):
{
  "mission": "{{triggerData}}"
}`,
```

- [ ] **Step 3: STEP 4 CTA href**

old:
```ts
    cta: { label: 'Ver Dashboard', href: '/dashboard/orchestrations' },
```
new:
```ts
    cta: { label: 'Ver Dashboard', href: '/dashboard/teams' },
```

- [ ] **Step 4: Intro + hero wording**

Edit (hero subtitle):
old:
```ts
              Conecte orquestracoes de IA a 7.000+ apps sem escrever codigo
```
new:
```ts
              Conecte times de IA a 7.000+ apps sem escrever codigo
```

Edit (parágrafo de intro):
old:
```ts
          Com a integracao Zapier, voce pode disparar orquestracoes de IA da Polaris IA como action
          de qualquer Zap. Quando um formulario e preenchido, um email chega, um lead e criado
          no CRM ou qualquer outro evento — Polaris IA entra em acao automaticamente.
```
new:
```ts
          Com a integracao Zapier, voce pode disparar times de IA da Polaris IA como action
          de qualquer Zap. Quando um formulario e preenchido, um email chega, um lead e criado
          no CRM ou qualquer outro evento — Polaris IA entra em acao automaticamente.
```

- [ ] **Step 5: Substituir a seção de Polling pela de Webhook**

old:
```tsx
        {/* Polling endpoint */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4">Endpoint de Polling (Trigger)</h2>
          <p className="text-white/50 mb-6">
            Voce tambem pode usar a Polaris IA como trigger no Zapier via polling. O endpoint abaixo
            retorna as ultimas 10 execucoes concluidas, compativel com o formato de polling do Zapier.
          </p>
          <div className="bg-black/40 rounded-xl p-5 font-mono text-sm overflow-x-auto">
            <pre className="text-white/70 whitespace-pre">{`# Polling trigger: ultimas execucoes concluidas
GET https://polarisia.com.br/api/v1/integrations/zapier/poll
Headers:
  x-api-key: sk_live_SEU_TOKEN

# Resposta (array Zapier-compatible):
[
  {
    "id": "exec_123",
    "timestamp": "2026-02-24T10:30:00Z",
    "orchestrationId": "orch_456",
    "orchestrationName": "Agente de Vendas",
    "status": "completed",
    "output": { ... }
  }
]`}</pre>
          </div>
        </section>
```
new:
```tsx
        {/* Resultado via Webhook */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4">Receber o Resultado (Webhook)</h2>
          <p className="text-white/50 mb-6">
            O disparo e assincrono: a resposta traz um <code className="text-orange-300">runId</code> e o time roda em
            background. Para receber o output final, configure um <strong>output webhook</strong> na sala do time
            (Dashboard {'->'} Times {'->'} seu time). A Polaris IA fara um POST quando o run concluir.
          </p>
          <div className="bg-black/40 rounded-xl p-5 font-mono text-sm overflow-x-auto">
            <pre className="text-white/70 whitespace-pre">{`# Resposta imediata do disparo:
{
  "success": true,
  "data": { "runId": "run_123", "status": "pending", "mode": "chat" }
}

# Quando o run conclui, a Polaris IA envia ao webhook do time:
POST https://seu-endpoint
{
  "teamId": "team_456",
  "runId": "run_123",
  "status": "completed",
  "output": { ... }
}`}</pre>
          </div>
        </section>
```

- [ ] **Step 6: Use case wording**

old:
```ts
      'Novo lead no HubSpot → Zapier dispara orquestracao → Polaris IA gera proposta personalizada → envia por email.',
```
new:
```ts
      'Novo lead no HubSpot → Zapier dispara um time → Polaris IA gera proposta personalizada → envia por email.',
```

### 7b. `(public)/integrations/make/page.tsx`

- [ ] **Step 7: openGraph + STEP 3 code + STEP 5 CTA**

Edit (openGraph.description):
old:
```ts
    description: 'Automatize orquestracoes de IA com Make (Integromat).',
```
new:
```ts
    description: 'Automatize times de IA com Make (Integromat).',
```

Edit (STEP 3 code):
old:
```ts
    code: `Metodo: POST
URL: https://polarisia.com.br/api/v1/integrations/zapier/execute

Headers:
  x-api-key: sk_live_SEU_TOKEN
  Content-Type: application/json

Body type: Raw
Content-Type: application/json
Content:
{
  "orchestrationId": "ID_DA_ORQUESTRACAO",
  "input": "{{trigger.data}}"
}`,
```
new:
```ts
    code: `Metodo: POST
URL: https://polarisia.com.br/api/public/teams/SEU_TEAM_ID/run

Headers:
  x-api-key: sk_live_SEU_TOKEN
  Content-Type: application/json

Body type: Raw
Content-Type: application/json
Content:
{
  "mission": "{{trigger.data}}"
}`,
```

Edit (STEP 5 CTA href):
old:
```ts
    cta: { label: 'Dashboard Polaris IA', href: '/dashboard/orchestrations' },
```
new:
```ts
    cta: { label: 'Dashboard Polaris IA', href: '/dashboard/teams' },
```

- [ ] **Step 8: Tip — webhook de saída (path do dashboard)**

old:
```tsx
            Para receber o resultado da execucao em tempo real, configure a Polaris IA para enviar
            um webhook de saida em /dashboard/settings/webhooks. Adicione o URL de um webhook
            do Make como destino para capturar o output da orquestracao.
```
new:
```tsx
            Para receber o resultado da execucao em tempo real, configure um output webhook na sala
            do time (Dashboard {'->'} Times {'->'} seu time). Adicione o URL de um webhook
            do Make como destino para capturar o output do time.
```

### 7c. `(public)/integrations/n8n/page.tsx`

- [ ] **Step 9: openGraph + workflow JSON**

Edit (openGraph.description):
old:
```ts
    description: 'Automatize orquestracoes de IA com n8n. Open source e self-hosted.',
```
new:
```ts
    description: 'Automatize times de IA com n8n. Open source e self-hosted.',
```

Edit (workflow JSON — nome, URL, body params):
old:
```ts
const N8N_WORKFLOW_JSON = `{
  "name": "Polaris IA - Executar Orquestracao",
  "nodes": [
    {
      "parameters": {},
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "position": [240, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://polarisia.com.br/api/v1/integrations/zapier/execute",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-api-key",
              "value": "sk_live_SEU_TOKEN"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "contentType": "json",
        "bodyParameters": {
          "parameters": [
            {
              "name": "orchestrationId",
              "value": "ID_DA_ORQUESTRACAO"
            },
            {
              "name": "input",
              "value": "={{ $json.input }}"
            }
          ]
        }
      },
      "name": "Polaris IA - Execute",
      "type": "n8n-nodes-base.httpRequest",
      "position": [460, 300]
    }
  ],
```
new:
```ts
const N8N_WORKFLOW_JSON = `{
  "name": "Polaris IA - Disparar Time",
  "nodes": [
    {
      "parameters": {},
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "position": [240, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://polarisia.com.br/api/public/teams/SEU_TEAM_ID/run",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-api-key",
              "value": "sk_live_SEU_TOKEN"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "contentType": "json",
        "bodyParameters": {
          "parameters": [
            {
              "name": "mission",
              "value": "={{ $json.input }}"
            }
          ]
        }
      },
      "name": "Polaris IA - Run Team",
      "type": "n8n-nodes-base.httpRequest",
      "position": [460, 300]
    }
  ],
```

- [ ] **Step 10: STEP 4 + connections + self-hosted tip**

Edit (connections — nome do node referenciado):
old:
```ts
  "connections": {
    "Manual Trigger": {
      "main": [[ { "node": "Polaris IA - Execute", "type": "main", "index": 0 } ]]
    }
  }
}`
```
new:
```ts
  "connections": {
    "Manual Trigger": {
      "main": [[ { "node": "Polaris IA - Run Team", "type": "main", "index": 0 } ]]
    }
  }
}`
```

Edit (STEP 4 description):
old:
```ts
    description:
      'No campo Body, selecione JSON e passe o orchestrationId e o input (pode ser uma expressao do n8n como {{ $json.text }}).',
```
new:
```ts
    description:
      'No campo Body, selecione JSON e passe o campo mission (pode ser uma expressao do n8n como {{ $json.text }}). O teamId vai na URL.',
```

Edit (self-hosted tip):
old:
```tsx
            Se voce usa n8n self-hosted, certifique-se que sua instancia consegue acessar
            polarisia.com.br. Para ambientes na mesma rede privada, use
            /api/v1/integrations/zapier/execute com o IP interno, se configurado.
```
new:
```tsx
            Se voce usa n8n self-hosted, certifique-se que sua instancia consegue acessar
            polarisia.com.br. Para ambientes na mesma rede privada, use
            /api/public/teams/SEU_TEAM_ID/run com o IP interno, se configurado.
```

- [ ] **Step 11: Verificar tipos + commit**

Run: `npx tsc --noEmit`
Expected: sem erros novos.

```bash
cd "c:/Users/jeanz/OneDrive/Desktop/ROI Labs/Imob/sofia-next"
git add "src/app/(public)/integrations/zapier/page.tsx" "src/app/(public)/integrations/make/page.tsx" "src/app/(public)/integrations/n8n/page.tsx"
git commit -F - <<'EOF'
docs(sp4): public integration copy points to Teams run API

Zapier/Make/n8n landing pages now show POST /api/public/teams/{id}/run
with a { mission } body, swap polling for output-webhook result delivery,
and repoint CTAs to /dashboard/teams.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 8: Copy do dashboard das integrações (Zapier/Make/n8n)

**Files:**
- Modify: `src/app/dashboard/integrations/zapier/page.tsx`
- Modify: `src/app/dashboard/integrations/make/page.tsx`
- Modify: `src/app/dashboard/integrations/n8n/page.tsx`

> Estas páginas usam header `Authorization: Bearer ${authHeader}` → apontam para a rota **v1** `/api/v1/teams/${TEAM_ID}/run`. Os exemplos são montados em constantes JS (`executeExample`, `curlExecute`, etc.) — editar as constantes. Polling vira nota de webhook.

### 8a. `dashboard/integrations/zapier/page.tsx`

- [ ] **Step 1: Constantes de exemplo**

Edit (executeExample):
old:
```ts
  const executeExample = JSON.stringify({ orchestrationId: "SEU_ORCHESTRATION_ID", input: "Parâmetro de entrada opcional" }, null, 2)
```
new:
```ts
  const executeExample = JSON.stringify({ mission: "Sua missão para o time" }, null, 2)
```

Edit (curlExecute):
old:
```ts
  const curlExecute = `curl -X POST "${baseUrl}/api/v1/integrations/zapier/execute" \\
  -H "Authorization: ${authHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{"orchestrationId": "SEU_ORCHESTRATION_ID"}'`
```
new:
```ts
  const curlExecute = `curl -X POST "${baseUrl}/api/v1/teams/SEU_TEAM_ID/run" \\
  -H "Authorization: ${authHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{"mission": "Sua missão para o time"}'`
```

- [ ] **Step 2: Conceito (Trigger/Action) + passos**

Edit (bloco "Como funciona"):
old:
```tsx
        <ul className="text-white/70 text-sm space-y-1">
          <li><span className="text-orange-400 font-mono">Trigger</span> — Zapier detecta novas execuções via polling (<code>/api/v1/integrations/zapier/poll</code>)</li>
          <li><span className="text-blue-400 font-mono">Action</span> — Zapier dispara uma orquestração via POST (<code>/api/v1/integrations/zapier/execute</code>)</li>
        </ul>
```
new:
```tsx
        <ul className="text-white/70 text-sm space-y-1">
          <li><span className="text-blue-400 font-mono">Action</span> — Zapier dispara um time via POST (<code>/api/v1/teams/:id/run</code>)</li>
          <li><span className="text-orange-400 font-mono">Resultado</span> — o time devolve o output via webhook configurado na sala do time</li>
        </ul>
```

Edit (Passo 2 — trocar trigger de polling por configurar webhook):
old:
```tsx
      {/* Passo 2 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 text-sm font-bold flex items-center justify-center">2</span>
          <h2 className="text-lg font-semibold text-white">Configurar Trigger no Zapier (Polling)</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Crie um novo Zap. Escolha "Webhook by Zapier" → Polling. Use a URL e header abaixo:</p>
        <div className="ml-10 space-y-2">
          <p className="text-white/50 text-xs font-mono">URL:</p>
          <CodeBlock code={`${baseUrl}/api/v1/integrations/zapier/poll`} />
          <p className="text-white/50 text-xs font-mono mt-3">Header de autenticação:</p>
          <CodeBlock code={`Authorization: ${authHeader}`} />
          <p className="text-white/50 text-xs font-mono mt-3">Exemplo de resposta do trigger:</p>
          <CodeBlock code={pollExample} />
        </div>
      </div>
```
new:
```tsx
      {/* Passo 2 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 text-sm font-bold flex items-center justify-center">2</span>
          <h2 className="text-lg font-semibold text-white">Escolher o gatilho no Zapier</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Crie um novo Zap e escolha o trigger da sua preferência (novo lead, e-mail, linha em planilha, etc.). O passo seguinte chama a Polaris IA com esse dado. Para receber o resultado, configure um output webhook na sala do time.</p>
        <div className="ml-10 space-y-2">
          <p className="text-white/50 text-xs font-mono">Header de autenticação:</p>
          <CodeBlock code={`Authorization: ${authHeader}`} />
        </div>
      </div>
```

Edit (Passo 3 — título + URL):
old:
```tsx
          <h2 className="text-lg font-semibold text-white">Configurar Action no Zapier (Executar Orquestração)</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Na etapa de Action, escolha "Webhooks by Zapier" → POST. Configure assim:</p>
        <div className="ml-10 space-y-2">
          <p className="text-white/50 text-xs font-mono">URL da action:</p>
          <CodeBlock code={`${baseUrl}/api/v1/integrations/zapier/execute`} />
```
new:
```tsx
          <h2 className="text-lg font-semibold text-white">Configurar Action no Zapier (Disparar Time)</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Na etapa de Action, escolha "Webhooks by Zapier" → POST. Configure assim (troque SEU_TEAM_ID pelo ID do time):</p>
        <div className="ml-10 space-y-2">
          <p className="text-white/50 text-xs font-mono">URL da action:</p>
          <CodeBlock code={`${baseUrl}/api/v1/teams/SEU_TEAM_ID/run`} />
```

Edit (Passo 4 — remover o teste de polling):
old:
```tsx
        <p className="text-white/60 text-sm ml-10">Use o botão "Test" do Zapier para validar a conexão. Se retornar dados, o Zap está pronto.</p>
        <div className="ml-10">
          <CodeBlock code={curlPoll} language="bash" />
        </div>
      </div>
```
new:
```tsx
        <p className="text-white/60 text-sm ml-10">Use o botão "Test" do Zapier para validar a conexão. Um 202 com runId significa que o time foi disparado.</p>
        <div className="ml-10">
          <CodeBlock code={curlExecute} language="bash" />
        </div>
      </div>
```

- [ ] **Step 3: Remover constantes mortas (`pollExample`, `curlPoll`)**

Após os Edits acima, `pollExample` e `curlPoll` ficam sem uso → o `tsc` (noUnusedLocals, se ligado) ou o lint reclama. Remover as duas declarações:

old:
```ts
  const pollExample = JSON.stringify([
    { id: "exec_123", timestamp: "2026-02-24T08:00:00Z", orchestrationId: "orch_abc", orchestrationName: "Relatório Semanal", status: "done", output: "Relatório gerado com sucesso..." }
  ], null, 2)

  const executeExample = JSON.stringify({ mission: "Sua missão para o time" }, null, 2)

  const curlPoll = `curl -X GET "${baseUrl}/api/v1/integrations/zapier/poll" \\
  -H "Authorization: ${authHeader}"`

  const curlExecute = `curl -X POST "${baseUrl}/api/v1/teams/SEU_TEAM_ID/run" \\
```
new:
```ts
  const executeExample = JSON.stringify({ mission: "Sua missão para o time" }, null, 2)

  const curlExecute = `curl -X POST "${baseUrl}/api/v1/teams/SEU_TEAM_ID/run" \\
```

Edit (caso de uso wording):
old:
```tsx
          <div className="flex items-start gap-2"><span className="text-orange-400">→</span> Planilha atualizada → Disparar orquestração de análise</div>
```
new:
```tsx
          <div className="flex items-start gap-2"><span className="text-orange-400">→</span> Planilha atualizada → Disparar time de análise</div>
```

### 8b. `dashboard/integrations/make/page.tsx`

- [ ] **Step 4: Constantes httpModuleConfig + pollConfig**

Edit (httpModuleConfig):
old:
```ts
  const httpModuleConfig = JSON.stringify({
    url: `${baseUrl}/api/v1/integrations/zapier/execute`,
    method: "POST",
    headers: [{ name: "Authorization", value: authHeader }, { name: "Content-Type", value: "application/json" }],
    body: { orchestrationId: "SEU_ORCHESTRATION_ID", input: "{{1.data}}" }
  }, null, 2)

  const pollConfig = JSON.stringify({
    url: `${baseUrl}/api/v1/integrations/zapier/poll`,
    method: "GET",
    headers: [{ name: "Authorization", value: authHeader }]
  }, null, 2)
```
new:
```ts
  const httpModuleConfig = JSON.stringify({
    url: `${baseUrl}/api/v1/teams/SEU_TEAM_ID/run`,
    method: "POST",
    headers: [{ name: "Authorization", value: authHeader }, { name: "Content-Type", value: "application/json" }],
    body: { mission: "{{1.data}}" }
  }, null, 2)
```

(Removida a constante `pollConfig` — o Passo 3 abaixo deixa de usá-la.)

- [ ] **Step 5: Conceito + Passo 2 URL + Passo 3 (poll→webhook) + Passo 4 resposta**

Edit (Arquitetura no Make):
old:
```tsx
        <p className="text-white/60 text-sm">No Make, você usa o módulo <strong className="text-purple-400">HTTP → Make a request</strong> para chamar a API do Polaris IA. É possível criar cenários que disparam orquestrações, consultam resultados e encadeiam com outros apps.</p>
```
new:
```tsx
        <p className="text-white/60 text-sm">No Make, você usa o módulo <strong className="text-purple-400">HTTP → Make a request</strong> para chamar a API do Polaris IA. É possível criar cenários que disparam times, recebem resultados via webhook e encadeiam com outros apps.</p>
```

Edit (Passo 2 — URL exibida):
old:
```tsx
              <p className="text-green-400 font-mono text-xs break-all">{baseUrl}/api/v1/integrations/zapier/execute</p>
```
new:
```tsx
              <p className="text-green-400 font-mono text-xs break-all">{baseUrl}/api/v1/teams/SEU_TEAM_ID/run</p>
```

Edit (Passo 3 — monitorar via poll → receber via webhook):
old:
```tsx
      {/* Passo 3 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex items-center justify-center">3</span>
          <h2 className="text-lg font-semibold text-white">Monitorar execuções (opcional)</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Para buscar as últimas execuções e usá-las como trigger, use este endpoint no módulo HTTP:</p>
        <div className="ml-10">
          <CodeBlock code={pollConfig} />
        </div>
      </div>
```
new:
```tsx
      {/* Passo 3 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex items-center justify-center">3</span>
          <h2 className="text-lg font-semibold text-white">Receber o resultado (webhook)</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">O disparo é assíncrono. Configure um output webhook na sala do time (Dashboard → Times → seu time) apontando para um webhook do Make para capturar o output quando o run concluir.</p>
      </div>
```

Edit (Passo 4 — resposta):
old:
```tsx
        <p className="text-white/60 text-sm ml-10">A API retorna <code className="text-green-400">{"{ executionId, status }"}</code>. Use o campo <code className="text-green-400">output</code> nos módulos seguintes para processar o resultado da orquestração.</p>
```
new:
```tsx
        <p className="text-white/60 text-sm ml-10">A API retorna <code className="text-green-400">{"{ runId, status, mode }"}</code>. O output final chega no webhook do time; use o campo <code className="text-green-400">output</code> nos módulos seguintes para processá-lo.</p>
```

Edit (caso de uso wording):
old:
```tsx
          <div className="flex items-start gap-2"><span className="text-purple-400">→</span> Webhook → Orquestração → Email via Gmail</div>
```
new:
```tsx
          <div className="flex items-start gap-2"><span className="text-purple-400">→</span> Webhook → Time de IA → Email via Gmail</div>
```

### 8c. `dashboard/integrations/n8n/page.tsx`

- [ ] **Step 6: Constantes httpRequestNode + pollNode + curlTest**

Edit (httpRequestNode):
old:
```ts
  const httpRequestNode = JSON.stringify({
    nodes: [
      {
        name: "Execute Polaris IA Orchestration",
        type: "n8n-nodes-base.httpRequest",
        parameters: {
          method: "POST",
          url: `${baseUrl}/api/v1/integrations/zapier/execute`,
          authentication: "genericCredentialType",
          genericAuthType: "httpHeaderAuth",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: "Authorization", value: authHeader },
              { name: "Content-Type", value: "application/json" }
            ]
          },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: "orchestrationId", value: "={{ $json.orchestrationId }}" },
              { name: "input", value: "={{ $json.input }}" }
            ]
          }
        }
      }
    ]
  }, null, 2)

  const pollNode = JSON.stringify({
    name: "Get Recent Executions",
    type: "n8n-nodes-base.httpRequest",
    parameters: {
      method: "GET",
      url: `${baseUrl}/api/v1/integrations/zapier/poll`,
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: "Authorization", value: authHeader }]
      }
    }
  }, null, 2)

  const curlTest = `curl -X POST "${baseUrl}/api/v1/integrations/zapier/execute" \\
  -H "Authorization: ${authHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{"orchestrationId": "SEU_ORCHESTRATION_ID", "input": "teste"}'`
```
new:
```ts
  const httpRequestNode = JSON.stringify({
    nodes: [
      {
        name: "Run Polaris IA Team",
        type: "n8n-nodes-base.httpRequest",
        parameters: {
          method: "POST",
          url: `${baseUrl}/api/v1/teams/SEU_TEAM_ID/run`,
          authentication: "genericCredentialType",
          genericAuthType: "httpHeaderAuth",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: "Authorization", value: authHeader },
              { name: "Content-Type", value: "application/json" }
            ]
          },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: "mission", value: "={{ $json.input }}" }
            ]
          }
        }
      }
    ]
  }, null, 2)

  const curlTest = `curl -X POST "${baseUrl}/api/v1/teams/SEU_TEAM_ID/run" \\
  -H "Authorization: ${authHeader}" \\
  -H "Content-Type: application/json" \\
  -d '{"mission": "teste"}'`
```

- [ ] **Step 7: Conceito + Passo 3 título + Passo 4 (poll→webhook)**

Edit (Passo 3 título):
old:
```tsx
        <p className="text-white/60 text-sm ml-10">Adicione um node <strong>HTTP Request</strong> no seu workflow. Você pode copiar esta configuração JSON e importar diretamente:</p>
```
new:
```tsx
        <p className="text-white/60 text-sm ml-10">Adicione um node <strong>HTTP Request</strong> no seu workflow (troque SEU_TEAM_ID pelo ID do time). Você pode copiar esta configuração JSON e importar diretamente:</p>
```

Edit (Passo 4 — poll node → webhook):
old:
```tsx
      {/* Passo 4 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 text-sm font-bold flex items-center justify-center">4</span>
          <h2 className="text-lg font-semibold text-white">Buscar execuções recentes (Polling Trigger)</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">Para usar como trigger de novos resultados, configure um node de polling:</p>
        <div className="ml-10">
          <CodeBlock code={pollNode} />
        </div>
      </div>
```
new:
```tsx
      {/* Passo 4 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 text-sm font-bold flex items-center justify-center">4</span>
          <h2 className="text-lg font-semibold text-white">Receber o resultado (Webhook)</h2>
        </div>
        <p className="text-white/60 text-sm ml-10">O disparo é assíncrono (retorna runId). Crie um node Webhook no n8n e configure-o como output webhook na sala do time (Dashboard → Times → seu time) para receber o output quando o run concluir.</p>
      </div>
```

Edit (caso de uso wording):
old:
```tsx
          <div className="flex items-start gap-2"><span className="text-green-400">→</span> Webhook → Orquestração IA → PostgreSQL</div>
```
new:
```tsx
          <div className="flex items-start gap-2"><span className="text-green-400">→</span> Webhook → Time de IA → PostgreSQL</div>
```

- [ ] **Step 8: Verificar tipos + commit**

Run: `npx tsc --noEmit`
Expected: sem erros novos. Conferir que `pollExample`/`curlPoll`/`pollConfig`/`pollNode` não são mais referenciados (`grep -rn "poll" src/app/dashboard/integrations/{zapier,make,n8n}/page.tsx` só deve sobrar texto, sem constantes mortas).

```bash
cd "c:/Users/jeanz/OneDrive/Desktop/ROI Labs/Imob/sofia-next"
git add "src/app/dashboard/integrations/zapier/page.tsx" "src/app/dashboard/integrations/make/page.tsx" "src/app/dashboard/integrations/n8n/page.tsx"
git commit -F - <<'EOF'
docs(sp4): dashboard integration guides point to Teams run API

Zapier/Make/n8n dashboard guides now disparar via /api/v1/teams/{id}/run
with a { mission } body and receive results via output webhooks instead
of the orchestration poll endpoint.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 9: Verificação final + push

- [ ] **Step 1: Rodar a verificação pura**

Run: `npx tsx scripts/sp4-verify.ts`
Expected: PASS — `✅ SP4 team-run-api.ts checks passed`.

- [ ] **Step 2: Rodar o type-check completo**

Run: `npx tsc --noEmit`
Expected: sem erros novos atribuíveis ao SP4 (ruído pré-existente de módulos não instalados / Prisma client stale é aceitável — comparar com baseline antes do SP4).

- [ ] **Step 3: Confirmar que só os arquivos da fatia foram tocados**

Run: `git log --oneline -9` e `git status`
Expected: 8 commits do SP4 (Task 1–8) + este; working tree sem mudanças não relacionadas commitadas (logos/docs alheios NÃO entram).

- [ ] **Step 4: Push (deploy app+worker no EasyPanel)**

Run:
```bash
cd "c:/Users/jeanz/OneDrive/Desktop/ROI Labs/Imob/sofia-next"
git push origin main
```
Expected: push aceito; EasyPanel redeploya app + worker.

- [ ] **Step 5: E2E com o usuário (manual, pós-deploy)**

Roteiro:
1. Criar/usar uma API key em `/dashboard/api-keys`.
2. `curl -X POST https://polarisia.com.br/api/public/teams/<TEAM_ID>/run -H "X-API-Key: sk_live_..." -H "Content-Type: application/json" -d '{"mission":"diga olá"}'` → esperar `202 { success, data:{ runId, status:'pending', mode:'chat' } }`.
3. `curl -X POST https://polarisia.com.br/api/v1/teams/<TEAM_ID>/run -H "Authorization: Bearer <KEY>" -H "Content-Type: application/json" -d '{"input":"diga olá"}'` (testa o alias `input`) → `202`.
4. `curl https://polarisia.com.br/api/public/teams -H "X-API-Key: sk_live_..."` → lista de times.
5. Conferir na sala do time que um `TeamRun` apareceu/rodou.
6. Abrir `https://polarisia.com.br/api/docs/openapi.json` e `https://polarisia.com.br/api-reference` — confirmar Teams no lugar de orchestration.
7. Casos de erro: team de outro dono → 404; body sem mission/input/message → 400 "Missão é obrigatória".

---

## Self-Review (preenchido)

**Spec coverage:** Decisão 1 (rotas espelhadas + listagem) → Tasks 2,3. Decisão 2 (mission + aliases + mode) → Task 1 (`parseTeamRunBody`). Decisão 3 (auth sem mexer nos helpers) → Tasks 2,3. Decisão 4 (resposta 202) → Tasks 2,3. Decisão 5 (startTeamRun direto) → Tasks 2,3. Decisão 6 (webhook, sem poll) → Tasks 5,6,7,8 (remoção de poll). Decisão 7 (sem scope) → não há código de scope. Decisão 8 (docs completo) → Tasks 5,6,7,8. Decisão 9 (sem migração/dep) → nenhuma task de schema. Refator do status map → Task 4.

**Placeholder scan:** sem TBD/TODO; todo passo tem código/comando exato.

**Type consistency:** `parseTeamRunBody`/`TEAM_RUN_STATUS_BY_CODE` definidos na Task 1 e usados idênticos nas Tasks 2,3,4. `StartTeamRunInput` aceita `{ mission, mode, userId, repoUrl?, base? }`; o spread `{ ...parseTeamRunBody(body), userId }` casa (repoUrl/base `string|null` ⊆ `string|null|undefined`). `auth.userId` (Bearer) e `user.id` (X-API-Key) conferem com os helpers lidos. Campos do `select` (`name`,`description`,`status`,`createdAt`,`updatedAt`,`_count.members`) existem no modelo `Team`.
