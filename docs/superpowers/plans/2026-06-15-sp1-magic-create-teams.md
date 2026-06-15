# SP1 — Magic Create → Teams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o Magic Create de Orquestrações por um Magic Create que gera um **Team** (1 Lead + N Workers + Reviewer-se-implicar) e abre a sala do time.

**Architecture:** O LLM (Groq `llama-3.3-70b-versatile`) devolve um **roster** JSON. Uma função pura (`parseMagicRoster`) valida o JSON e a composição (reusando `validateRoster`). Um helper compartilhado (`createTeamWithRoster`) cria o `Team`+`TeamMember`s — usado tanto por `POST /api/teams` quanto pelo novo `POST /api/teams/magic-create`. O `MagicCreateModal` (hoje órfão) é reescrito para Times e religado no header de `/dashboard/teams`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma + PostgreSQL, Groq SDK (lazy via `getGroqClient`), React client component + `next/navigation`. Testes = script `tsx` puro com `node:assert/strict` (padrão `scripts/cN-verify.ts`).

**Branch:** trabalho direto na `main` (consentido pelo usuário). Commits frequentes, um por task.

**Restrição transversal (do design):** NÃO deletar nada de orchestration neste SP. O `POST /api/orchestrations/magic-create` continua existindo (deletado só no SP6); apenas **deixa de ser chamado**.

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `src/lib/orchestration/team/magic-roster.ts` | **Puro.** Parse + validação do JSON do LLM → roster tipado ou mensagem de erro. Reusa `validateRoster`. Sem DB/rede. | Criar |
| `src/lib/orchestration/team/create-team.ts` | Helper compartilhado de criação de time (valida nome/roster/agentes + `prisma.team.create`). Borda de DB. | Criar |
| `src/app/api/teams/route.ts` | `POST` passa a delegar a criação ao helper (refactor, comportamento preservado). | Modificar |
| `src/app/api/teams/magic-create/route.ts` | Novo endpoint: NL → Groq → `parseMagicRoster` → cria Agents → `createTeamWithRoster` → `{ teamId, team }`. | Criar |
| `src/components/sofia/MagicCreateModal.tsx` | Reescrito para Times (tipos, copy, endpoint, navegação, badges por papel). | Modificar |
| `src/app/dashboard/teams/page.tsx` | Religa o modal: botão "Magic Create" no header + estado + render. | Modificar |
| `src/lib/email.ts` | CTA do Drip3 reaponta `/dashboard/teams` e copy "orquestração"→"time". | Modificar |
| `scripts/sp1-verify.ts` | Verificação local pura de `parseMagicRoster` + composição via `validateRoster`. | Criar |

---

## Task 1: Parser puro do roster (`parseMagicRoster`) + testes

**Files:**
- Create: `src/lib/orchestration/team/magic-roster.ts`
- Create: `scripts/sp1-verify.ts`

- [ ] **Step 1: Escrever o teste que falha** (`scripts/sp1-verify.ts`)

```ts
// scripts/sp1-verify.ts
// Local verification for SP1 (Magic Create → Teams). Pure: no DB / no network / no Groq.
// Run: npx tsx scripts/sp1-verify.ts
import assert from 'node:assert/strict'
import { parseMagicRoster } from '../src/lib/orchestration/team/magic-roster'
import { validateRoster } from '../src/lib/orchestration/team/team-roster'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// Fakes de saída do LLM (o que o Groq devolveria como string em message.content).
const WITH_QA = JSON.stringify({
  name: 'Time de Conteúdo',
  description: 'Pesquisa, escreve e revisa posts',
  members: [
    { role: 'lead', name: 'Coordenador', systemPrompt: 'Você coordena e delega o trabalho do time.', model: 'llama-3.3-70b-versatile' },
    { role: 'worker', name: 'Pesquisador', systemPrompt: 'Você pesquisa tendências e fontes.', model: 'llama-3.3-70b-versatile' },
    { role: 'worker', name: 'Redator', systemPrompt: 'Você escreve o texto final.', model: 'llama-3.3-70b-versatile' },
    { role: 'reviewer', name: 'Revisor', systemPrompt: 'Você revisa tom, clareza e qualidade antes de aprovar.', model: 'llama-3.3-70b-versatile' },
  ],
})

const NO_QA = JSON.stringify({
  name: 'Time de Captação',
  description: 'Busca e qualifica leads',
  members: [
    { role: 'lead', name: 'Coordenador', systemPrompt: 'Você coordena e delega o trabalho do time.', model: 'llama-3.3-70b-versatile' },
    { role: 'worker', name: 'Caçador de Leads', systemPrompt: 'Você busca leads no LinkedIn.', model: 'llama-3.3-70b-versatile' },
  ],
})

console.log('parseMagicRoster — caminho feliz')
{
  const r = parseMagicRoster(WITH_QA)
  assert.ok(r.ok, 'JSON com QA deve parsear')
  if (r.ok) {
    assert.equal(r.roster.members.length, 4)
    assert.equal(r.roster.members.filter(m => m.role === 'lead').length, 1)
    assert.equal(r.roster.members.filter(m => m.role === 'reviewer').length, 1)
    // O roster gerado passa em validateRoster (composição) usando agentIds placeholder.
    assert.equal(validateRoster(r.roster.members.map((m, i) => ({ agentId: String(i), role: m.role }))), null)
  }
  ok('processo com QA → inclui reviewer e passa em validateRoster')
}
{
  const r = parseMagicRoster(NO_QA)
  assert.ok(r.ok, 'JSON sem QA deve parsear')
  if (r.ok) {
    assert.equal(r.roster.members.length, 2)
    assert.equal(r.roster.members.filter(m => m.role === 'reviewer').length, 0)
    assert.equal(validateRoster(r.roster.members.map((m, i) => ({ agentId: String(i), role: m.role }))), null)
  }
  ok('processo sem QA → sem reviewer e passa em validateRoster')
}
{
  // JSON embrulhado em markdown fence deve parsear (LLM costuma fazer isso).
  const fenced = '```json\n' + NO_QA + '\n```'
  const r = parseMagicRoster(fenced)
  assert.ok(r.ok, 'fence markdown deve ser removido')
  ok('JSON em ```json fence``` → parseia')
}

console.log('parseMagicRoster — erros')
{
  const r = parseMagicRoster('isto não é json {')
  assert.ok(!r.ok)
  if (!r.ok) assert.equal(r.error, 'O modelo retornou um JSON inválido. Tente novamente.')
  ok('JSON inválido → erro de parse')
}
{
  const r = parseMagicRoster(JSON.stringify({ name: 'X', members: [] }))
  assert.ok(!r.ok)
  if (!r.ok) assert.equal(r.error, 'Estrutura do time inválida. Tente novamente.')
  ok('members vazio → estrutura inválida')
}
{
  const r = parseMagicRoster(JSON.stringify({ name: '', members: [{ role: 'lead', name: 'L', systemPrompt: 'p' }] }))
  assert.ok(!r.ok)
  ok('name vazio → estrutura inválida')
}
{
  // 0 leads → erro de composição vindo do validateRoster
  const r = parseMagicRoster(JSON.stringify({ name: 'X', members: [
    { role: 'worker', name: 'W', systemPrompt: 'p', model: 'llama-3.3-70b-versatile' },
  ] }))
  assert.ok(!r.ok)
  if (!r.ok) assert.equal(r.error, 'O time precisa de exatamente 1 Lead')
  ok('0 leads → "precisa de exatamente 1 Lead"')
}
{
  // 1 lead, 0 workers → erro de composição
  const r = parseMagicRoster(JSON.stringify({ name: 'X', members: [
    { role: 'lead', name: 'L', systemPrompt: 'p', model: 'llama-3.3-70b-versatile' },
  ] }))
  assert.ok(!r.ok)
  if (!r.ok) assert.equal(r.error, 'O time precisa de ao menos 1 Worker')
  ok('0 workers → "precisa de ao menos 1 Worker"')
}
{
  // 2 reviewers → erro de composição
  const r = parseMagicRoster(JSON.stringify({ name: 'X', members: [
    { role: 'lead', name: 'L', systemPrompt: 'p', model: 'llama-3.3-70b-versatile' },
    { role: 'worker', name: 'W', systemPrompt: 'p', model: 'llama-3.3-70b-versatile' },
    { role: 'reviewer', name: 'R1', systemPrompt: 'p', model: 'llama-3.3-70b-versatile' },
    { role: 'reviewer', name: 'R2', systemPrompt: 'p', model: 'llama-3.3-70b-versatile' },
  ] }))
  assert.ok(!r.ok)
  if (!r.ok) assert.equal(r.error, 'No máximo 1 Reviewer')
  ok('2 reviewers → "No máximo 1 Reviewer"')
}
{
  // model ausente → default llama-3.3-70b-versatile
  const r = parseMagicRoster(JSON.stringify({ name: 'X', members: [
    { role: 'lead', name: 'L', systemPrompt: 'p' },
    { role: 'worker', name: 'W', systemPrompt: 'p' },
  ] }))
  assert.ok(r.ok)
  if (r.ok) assert.equal(r.roster.members[0].model, 'llama-3.3-70b-versatile')
  ok('model ausente → default llama-3.3-70b-versatile')
}

console.log(`\n✅ all ${passed} assertions passed`)
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx tsx scripts/sp1-verify.ts`
Expected: FAIL — erro de resolução de módulo (`Cannot find module '../src/lib/orchestration/team/magic-roster'`), porque o módulo ainda não existe.

- [ ] **Step 3: Implementar o módulo puro** (`src/lib/orchestration/team/magic-roster.ts`)

```ts
// src/lib/orchestration/team/magic-roster.ts
// Pure parsing + validation of the LLM output for Team Magic Create.
// No DB, no network — safe to unit-test with scripts/sp1-verify.ts.
import { validateRoster } from './team-roster'

export type MagicRole = 'lead' | 'worker' | 'reviewer'

export interface MagicMember {
  role: MagicRole
  name: string
  systemPrompt: string
  model: string
}

export interface MagicRoster {
  name: string
  description: string
  members: MagicMember[]
}

export type ParseResult =
  | { ok: true; roster: MagicRoster }
  | { ok: false; error: string }

const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
const VALID_ROLES = new Set<MagicRole>(['lead', 'worker', 'reviewer'])
const INVALID_JSON = 'O modelo retornou um JSON inválido. Tente novamente.'
const INVALID_STRUCTURE = 'Estrutura do time inválida. Tente novamente.'

/** Parses raw LLM content into a validated team roster, or returns an error message. */
export function parseMagicRoster(rawContent: string): ParseResult {
  let data: unknown
  try {
    const jsonStr = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    data = JSON.parse(jsonStr)
  } catch {
    return { ok: false, error: INVALID_JSON }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: INVALID_STRUCTURE }
  }
  const obj = data as Record<string, unknown>

  const name = typeof obj.name === 'string' ? obj.name.trim() : ''
  if (!name) return { ok: false, error: INVALID_STRUCTURE }

  if (!Array.isArray(obj.members) || obj.members.length === 0) {
    return { ok: false, error: INVALID_STRUCTURE }
  }

  const members: MagicMember[] = []
  for (const raw of obj.members) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: INVALID_STRUCTURE }
    const m = raw as Record<string, unknown>
    const role = typeof m.role === 'string' ? m.role.trim().toLowerCase() : ''
    const memberName = typeof m.name === 'string' ? m.name.trim() : ''
    const systemPrompt = typeof m.systemPrompt === 'string' ? m.systemPrompt.trim() : ''
    if (!VALID_ROLES.has(role as MagicRole)) return { ok: false, error: INVALID_STRUCTURE }
    if (!memberName || !systemPrompt) return { ok: false, error: INVALID_STRUCTURE }
    const model = typeof m.model === 'string' && m.model.trim() ? m.model.trim() : DEFAULT_MODEL
    members.push({ role: role as MagicRole, name: memberName, systemPrompt, model })
  }

  // Composition gate — exactly the validator POST /api/teams uses.
  const composition = validateRoster(members.map((m, i) => ({ agentId: String(i), role: m.role })))
  if (composition) return { ok: false, error: composition }

  const description = typeof obj.description === 'string' ? obj.description.trim() : ''
  return { ok: true, roster: { name, description, members } }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx tsx scripts/sp1-verify.ts`
Expected: PASS — todas as assertions (`✅ all N assertions passed`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/orchestration/team/magic-roster.ts scripts/sp1-verify.ts
git commit -m "feat(teams): pure parseMagicRoster for Magic Create roster"
```

---

## Task 2: Helper compartilhado `createTeamWithRoster` + refactor de `POST /api/teams`

Refactor (sem nova feature): extrai a criação inline da rota para um helper reutilizável. Comportamento de `POST /api/teams` preservado (mesmas mensagens de erro e status 400). Melhoria de fronteira: o helper agora também **persiste `description`** (a rota antiga aceitava no body mas descartava — inofensivo).

**Files:**
- Create: `src/lib/orchestration/team/create-team.ts`
- Modify: `src/app/api/teams/route.ts:5` (imports) e `src/app/api/teams/route.ts:30-75` (corpo do `POST`)

- [ ] **Step 1: Criar o helper** (`src/lib/orchestration/team/create-team.ts`)

```ts
// src/lib/orchestration/team/create-team.ts
// Shared team creation used by POST /api/teams and POST /api/teams/magic-create.
import { prisma } from '@/lib/prisma'
import { validateRoster, type RosterInput } from './team-roster'

export interface CreateTeamInput {
  name?: string
  description?: string | null
  config?: Record<string, unknown>
  members?: RosterInput[]
  userId: string
}

/**
 * Validates name + roster + agent existence, then creates the Team with members.
 * Returns a discriminated result; callers map the error to the HTTP status they want
 * (POST /api/teams → 400; magic-create → 422).
 */
export async function createTeamWithRoster(input: CreateTeamInput) {
  if (!input.name?.trim()) {
    return { ok: false as const, error: 'Nome é obrigatório' }
  }

  const members = input.members ?? []
  const rosterError = validateRoster(members)
  if (rosterError) return { ok: false as const, error: rosterError }

  // Verify all referenced agents exist (agents are shared across the app).
  const agentIds = [...new Set(members.map(m => m.agentId))]
  const existing = await prisma.agent.count({ where: { id: { in: agentIds } } })
  if (existing !== agentIds.length) {
    return { ok: false as const, error: 'Algum agente selecionado não existe' }
  }

  const team = await prisma.team.create({
    data: {
      name: input.name.trim(),
      description: input.description ?? null,
      config: (input.config ?? {}) as object,
      createdBy: input.userId,
      members: {
        create: members.map((m, i) => ({
          agentId: m.agentId,
          role: m.role,
          model: m.model ?? null,
          effort: m.effort ?? null,
          position: m.position ?? i,
        })),
      },
    },
    include: { members: { include: { agent: { select: { name: true } } }, orderBy: { position: 'asc' } } },
  })
  return { ok: true as const, team }
}
```

- [ ] **Step 2: Refatorar `POST /api/teams`** para delegar ao helper

Em `src/app/api/teams/route.ts`, trocar o import da linha 5:

```ts
import { validateRoster, type RosterInput } from '@/lib/orchestration/team/team-roster'
```

por:

```ts
import { type RosterInput } from '@/lib/orchestration/team/team-roster'
import { createTeamWithRoster } from '@/lib/orchestration/team/create-team'
```

Substituir o corpo inteiro do `POST` (linhas 30-75) por:

```ts
// POST /api/teams — create a team with a roster
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, description, config, members } = body as {
      name?: string; description?: string; config?: Record<string, unknown>; members?: RosterInput[]
    }

    const result = await createTeamWithRoster({ name, description, config, members, userId: auth.id })
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 400 })

    return NextResponse.json({ success: true, data: result.team })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create team'
    console.error('Error creating team:', error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
```

(O `GET` da mesma rota fica inalterado.)

- [ ] **Step 3: Verificar tipos (gate de refactor)**

Run: `npx tsc --noEmit`
Expected: nenhum erro **novo** nos arquivos tocados (`route.ts`, `create-team.ts`). Comparar com o baseline pré-existente — erros antigos de Teams/worker/sandbox não contam.

- [ ] **Step 4: Confirmar que o teste do Task 1 continua verde (sem regressão)**

Run: `npx tsx scripts/sp1-verify.ts`
Expected: PASS (o helper reusa `validateRoster`, cuja lógica de composição já está coberta).

- [ ] **Step 5: Commit**

```bash
git add src/lib/orchestration/team/create-team.ts src/app/api/teams/route.ts
git commit -m "refactor(teams): extract createTeamWithRoster helper from POST /api/teams"
```

---

## Task 3: Endpoint `POST /api/teams/magic-create`

**Files:**
- Create: `src/app/api/teams/magic-create/route.ts`

- [ ] **Step 1: Criar a rota**

```ts
// src/app/api/teams/magic-create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getGroqClient } from '@/lib/ai/groq'
import { prisma } from '@/lib/prisma'
import { parseMagicRoster } from '@/lib/orchestration/team/magic-roster'
import { createTeamWithRoster } from '@/lib/orchestration/team/create-team'
import type { RosterInput } from '@/lib/orchestration/team/team-roster'

export const dynamic = 'force-dynamic'

const MAGIC_TEAM_SYSTEM_PROMPT = `Você é um especialista em montar TIMES de agentes IA que coordenam, executam e revisam tarefas juntos.
Dado um processo descrito em linguagem natural, monte o time completo.

Retorne um JSON válido com esta estrutura (sem markdown, sem texto extra, APENAS o JSON):
{
  "name": "Nome do time",
  "description": "Descrição breve",
  "members": [
    { "role": "lead",   "name": "Coordenador", "systemPrompt": "...", "model": "llama-3.3-70b-versatile" },
    { "role": "worker", "name": "Pesquisador", "systemPrompt": "...", "model": "llama-3.3-70b-versatile" }
  ]
}

Regras OBRIGATÓRIAS:
- Exatamente 1 membro com role "lead" (coordena e delega o trabalho do time).
- 1 ou mais membros com role "worker" — cada etapa do processo vira um worker.
- Inclua um membro com role "reviewer" SOMENTE se o processo descrito implicar QA, revisão ou aprovação de qualidade. Caso contrário, NÃO inclua reviewer.
- No máximo 1 reviewer.
- Cada systemPrompt deve ser específico e detalhado (100-200 palavras): descreva o papel, a tarefa, o input esperado e o output produzido.
- model sempre "llama-3.3-70b-versatile".
- Escreva tudo em português brasileiro.`

/**
 * POST /api/teams/magic-create
 * NL → Groq gera um roster (1 Lead + N Workers + Reviewer-se-implicar) → cria Agents + Team.
 * Body: { description: string }
 * Returns: { teamId, team: { id, name, description, members } }
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  let body: { description?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body JSON inválido' }, { status: 400 })
  }

  const { description } = body
  if (!description || description.trim().length < 10) {
    return NextResponse.json(
      { success: false, error: 'Descreva o processo com pelo menos 10 caracteres.' },
      { status: 400 }
    )
  }

  try {
    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: MAGIC_TEAM_SYSTEM_PROMPT },
        { role: 'user', content: `Crie um time para o seguinte processo:\n\n${description.trim()}` },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    })

    const rawContent = completion.choices[0]?.message?.content || ''

    const parsed = parseMagicRoster(rawContent)
    if (!parsed.ok) {
      console.error('Magic create (team) parse failed:', rawContent)
      return NextResponse.json({ success: false, error: parsed.error }, { status: 422 })
    }

    // Cria um Agent por membro (espelha o Magic Create legado de orquestração).
    const roster: RosterInput[] = []
    for (const [i, m] of parsed.roster.members.entries()) {
      const agent = await prisma.agent.create({
        data: {
          name: m.name,
          description: `Criado automaticamente via Magic Create para "${parsed.roster.name}"`,
          systemPrompt: m.systemPrompt,
          model: m.model,
          temperature: 0.7,
          status: 'active',
          createdBy: auth.id,
          config: { role: m.role, createdByMagic: true },
        },
      })
      roster.push({ agentId: agent.id, role: m.role, model: m.model, position: i })
    }

    const result = await createTeamWithRoster({
      name: parsed.roster.name,
      description: parsed.roster.description || description.trim().slice(0, 200),
      config: { createdByMagic: true, originalDescription: description.trim() },
      members: roster,
      userId: auth.id,
    })
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      data: {
        teamId: result.team.id,
        team: {
          id: result.team.id,
          name: result.team.name,
          description: result.team.description,
          members: parsed.roster.members,
        },
      },
    })
  } catch (error) {
    console.error('Magic create (team) error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar o time. Tente novamente.' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: nenhum erro novo no arquivo criado. (Verificação de runtime desta rota é E2E no Task 7 — ela depende de Groq + DB, padrão do projeto para bordas.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/teams/magic-create/route.ts
git commit -m "feat(teams): POST /api/teams/magic-create — roster via LLM"
```

---

## Task 4: Reescrever `MagicCreateModal` para Times

**Files:**
- Modify: `src/components/sofia/MagicCreateModal.tsx` (arquivo inteiro)

- [ ] **Step 1: Substituir o conteúdo do arquivo**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Loader2,
  Wand2,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

type MemberRole = 'lead' | 'worker' | 'reviewer'

interface GeneratedMember {
  role: MemberRole
  name: string
  systemPrompt: string
  model: string
}

interface GeneratedTeam {
  id: string
  name: string
  description: string
  members: GeneratedMember[]
}

interface MagicCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (teamId: string) => void
}

const ROLE_LABEL: Record<MemberRole, string> = {
  lead: 'Lead',
  worker: 'Worker',
  reviewer: 'Reviewer',
}

const ROLE_BADGE: Record<MemberRole, string> = {
  lead: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
  worker: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
  reviewer: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
}

const LOADING_MESSAGES = [
  'Analisando seu processo...',
  'Identificando etapas e responsabilidades...',
  'Montando o time (Lead, Workers, Reviewer)...',
  'Escrevendo system prompts...',
  'Definindo papéis e coordenação...',
  'Finalizando o time...',
]

const EXAMPLES = [
  'Pesquisar leads no LinkedIn, qualificar com IA e enviar email personalizado automaticamente',
  'Receber um briefing de marketing, pesquisar tendencias, escrever copy e revisar o tom',
  'Analisar documentos juridicos, identificar clausulas criticas e gerar resumo executivo',
  'Monitorar mencoes a marca, classificar sentimento e criar relatorio de reputacao',
]

export function MagicCreateModal({ open, onOpenChange, onCreated }: MagicCreateModalProps) {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [result, setResult] = useState<GeneratedTeam | null>(null)

  async function handleGenerate() {
    if (description.trim().length < 10) {
      toast.error('Descreva o processo com pelo menos 10 caracteres.')
      return
    }

    setLoading(true)
    setResult(null)
    setLoadingMessageIndex(0)

    const interval = setInterval(() => {
      setLoadingMessageIndex(prev => {
        if (prev < LOADING_MESSAGES.length - 1) return prev + 1
        return prev
      })
    }, 1200)

    try {
      const response = await fetch('/api/teams/magic-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })

      clearInterval(interval)
      const data = await response.json()

      if (data.success) {
        setResult(data.data.team)
        toast.success('Time gerado com sucesso!')
      } else {
        toast.error(data.error || 'Erro ao gerar o time.')
      }
    } catch {
      clearInterval(interval)
      toast.error('Erro ao conectar com o servidor.')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  function handleOpen() {
    if (!result) return
    onOpenChange(false)
    if (onCreated) onCreated(result.id)
    router.push(`/dashboard/teams/${result.id}`)
  }

  function handleReset() {
    setResult(null)
    setDescription('')
  }

  function handleClose() {
    if (!loading) {
      onOpenChange(false)
      setTimeout(() => {
        setResult(null)
        setDescription('')
      }, 300)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-white/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            Magic Create — Time com IA
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Descreva o processo que voce quer automatizar. A IA vai montar o time inteiro —
            um Lead que coordena, os Workers que executam e (se fizer sentido) um Reviewer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!result ? (
            <>
              <div>
                <Label htmlFor="magic-desc" className="text-white/80">
                  Descreva seu processo
                </Label>
                <Textarea
                  id="magic-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-2 min-h-[110px] resize-none"
                  placeholder="Ex: Quero um time que pesquisa leads no LinkedIn, qualifica com IA e envia email personalizado"
                  disabled={loading}
                />
                <p className="text-xs text-white/40 mt-1">
                  Quanto mais detalhado, melhor o time gerado.
                </p>
              </div>

              {!loading && description.length === 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-2">Exemplos rapidos:</p>
                  <div className="space-y-2">
                    {EXAMPLES.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setDescription(ex)}
                        className="w-full text-left text-xs p-2.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white/80 hover:bg-white/10 transition-colors"
                      >
                        &ldquo;{ex}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <Loader2 className="h-5 w-5 text-purple-400 animate-spin shrink-0" />
                  <p className="text-sm text-purple-300 animate-pulse">
                    {LOADING_MESSAGES[loadingMessageIndex]}
                  </p>
                </div>
              )}

              <Button
                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 h-11"
                onClick={handleGenerate}
                disabled={loading || description.trim().length < 10}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar Time com IA
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                <p className="text-sm text-green-300">
                  Time criado e salvo automaticamente!
                </p>
              </div>

              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                <div>
                  <h3 className="font-semibold text-white text-base">{result.name}</h3>
                  {result.description && (
                    <p className="text-sm text-white/60 mt-1">{result.description}</p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-white/40 mb-2">
                    {result.members.length} membro{result.members.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {result.members.map((member, i) => (
                      <Badge key={i} className={`${ROLE_BADGE[member.role]} text-xs font-normal`}>
                        {ROLE_LABEL[member.role]} · {member.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {result.members.map((member, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs font-medium text-white/80 mb-1">
                        {ROLE_LABEL[member.role]} · {member.name}
                      </p>
                      <p className="text-xs text-white/50 line-clamp-2">
                        {member.systemPrompt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1"
                >
                  Tentar outro
                </Button>
                <Button
                  className="flex-1 gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                  onClick={handleOpen}
                >
                  <ArrowRight className="h-4 w-4" />
                  Abrir Time
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: nenhum erro novo no modal. (Os imports `ChevronRight` foram removidos — confirme que não há símbolo não usado a ponto de falhar lint; lint não bloqueia `tsc`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/sofia/MagicCreateModal.tsx
git commit -m "feat(teams): rewrite MagicCreateModal for Teams (roster preview + /dashboard/teams nav)"
```

---

## Task 5: Religar o modal na página de Teams

**Files:**
- Modify: `src/app/dashboard/teams/page.tsx`

- [ ] **Step 1: Adicionar import do modal e do ícone `Wand2`**

Na linha 6, adicionar `Wand2` à lista de ícones do lucide:

```ts
import { Users, Plus, Loader2, ArrowRight, Pencil, Trash2, X, GitBranch, Play, Search, Wand2 } from 'lucide-react'
```

Logo após a linha 9 (`} from './RosterEditor'`), adicionar:

```ts
import { MagicCreateModal } from '@/components/sofia/MagicCreateModal'
```

- [ ] **Step 2: Adicionar estado do modal**

Dentro de `export default function TeamsPage()`, junto dos outros `useState` (após a linha 115 `const [teamQuery, setTeamQuery] = useState('')`), adicionar:

```ts
  const [magicOpen, setMagicOpen] = useState(false)
```

- [ ] **Step 3: Adicionar o botão "Magic Create" no header**

No header, **antes** do botão "Novo time" (linha 232-237), inserir:

```tsx
        <button
          onClick={() => setMagicOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          <Wand2 className="h-4 w-4" /> Magic Create
        </button>
```

- [ ] **Step 4: Renderizar o modal**

Antes do fechamento do componente (logo antes da linha 362 `</div>` final que fecha o `return`), adicionar:

```tsx
      {/* Magic Create modal */}
      <MagicCreateModal open={magicOpen} onOpenChange={setMagicOpen} />
```

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: nenhum erro novo em `teams/page.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/teams/page.tsx
git commit -m "feat(teams): wire Magic Create button into the Teams page"
```

---

## Task 6: Reaponta o CTA de email para Teams

**Files:**
- Modify: `src/lib/email.ts:233-239` (função `buildDrip3Email`)

- [ ] **Step 1: Atualizar copy + href do Drip3**

Trocar a linha 233:

```
<p>Sabia que você pode criar uma orquestração inteira só descrevendo o que quer fazer?</p>
```

por:

```
<p>Sabia que você pode montar um time inteiro de agentes só descrevendo o que quer fazer?</p>
```

Trocar a linha 238:

```
<p>Uma orquestração com 3 agentes em 30 segundos, sem configurar nada manualmente.</p>
```

por:

```
<p>Um time com 3 agentes em 30 segundos, sem configurar nada manualmente.</p>
```

Trocar a linha 239 (CTA):

```
<div class="cta"><a href="${APP_URL}/dashboard/orchestrations">Tentar o Magic Create →</a></div>
```

por:

```
<div class="cta"><a href="${APP_URL}/dashboard/teams">Tentar o Magic Create →</a></div>
```

(Os textos "orquestração" do email de onboarding em `email.ts:116` e `:132` ficam **fora de escopo** — varredura cosmética de docs/marketing é do SP6.)

- [ ] **Step 2: Verificar tipos + confirmar o novo destino**

Run: `npx tsc --noEmit`
Expected: nenhum erro novo.

Run: `git diff src/lib/email.ts | grep -E "dashboard/teams|dashboard/orchestrations"`
Expected: linha adicionada com `dashboard/teams`, linha removida com `dashboard/orchestrations`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "chore(email): point Magic Create CTA to /dashboard/teams"
```

---

## Task 7: Verificação final do SP1

**Files:** nenhum (gates + E2E).

- [ ] **Step 1: Suite pura verde**

Run: `npx tsx scripts/sp1-verify.ts`
Expected: PASS (`✅ all N assertions passed`).

- [ ] **Step 2: Type-check sem novos erros**

Run: `npx tsc --noEmit`
Expected: a saída pode conter o baseline pré-existente (Teams/worker/sandbox), mas **nenhum erro** apontando para os arquivos deste SP: `magic-roster.ts`, `create-team.ts`, `api/teams/route.ts`, `api/teams/magic-create/route.ts`, `MagicCreateModal.tsx`, `teams/page.tsx`, `email.ts`.

- [ ] **Step 3: E2E manual (gate real = prod EasyPanel, por causa da corrupção de node_modules local com OneDrive)**

Após o deploy:
1. Abrir `/dashboard/teams` → clicar **Magic Create**.
2. Descrever um processo **com QA** (ex.: "pesquisar tendências, escrever um post e revisar o tom antes de publicar") → confirmar no preview que aparece um membro **Reviewer**.
3. Clicar **Abrir Time** → confirmar que navega para `/dashboard/teams/<id>` e o time tem os membros gerados (Lead + Workers + Reviewer).
4. Repetir com um processo **sem QA** (ex.: "buscar leads e qualificar") → confirmar que **não** há Reviewer.
5. Confirmar que o caminho manual ("Novo time") continua funcionando (não regrediu).

Expected: ambos os fluxos criam um time válido e abrem a sala; QA inclui Reviewer, não-QA não inclui.

- [ ] **Step 4: Concluir o branch de desenvolvimento**

Anunciar: "I'm using the finishing-a-development-branch skill to complete this work." e seguir **superpowers:finishing-a-development-branch** (verificar testes, apresentar opções de merge/PR, executar a escolha).

---

## Fora de escopo do SP1 (não fazer aqui)

- Deletar `app/api/orchestrations/magic-create` ou qualquer modelo/engine de orchestration (**SP6**).
- Webhooks, scheduling, API pública/v1, templates de time (**SP2–SP5**).
- Varredura de copy "orquestração" em docs/marketing/onboarding (`email.ts:116/132`) — **SP6**.
- Migração de dados (não há orquestrações em produção).
