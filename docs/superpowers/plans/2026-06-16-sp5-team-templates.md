# SP5 — Team Templates → Teams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated gallery of pre-built team rosters (port of the 8 orchestration templates) so a user creates a Team in one click.

**Architecture:** Static `team-templates.ts` (8 templates, each a synthetic Lead + workers + reviewer-only-where-QA). A shared `instantiateRoster()` helper (extracted from magic-create) creates Agents + Team. Two session-auth routes (`GET /api/teams/templates`, `POST /api/teams/templates/[id]/deploy`) + a `TeamTemplatesDialog` picker wired into the `/dashboard/teams` header. Coordinator (`runTeam`) and `startTeamRun` are untouched.

**Tech Stack:** Next.js 16 (App Router, async route params), Prisma, TypeScript, shadcn/ui (Dialog/Badge/Button), sonner toast. Spec: `docs/superpowers/specs/2026-06-16-sp5-team-templates-design.md`.

---

## ⚠️ Environment constraints (this machine — read first)

Project lives on OneDrive, which corrupts `node_modules`. **DO NOT run** `npm install`, `prisma generate`, `jest`, or `next build` locally — they hang.

- **Pure-logic gate:** `npx tsx scripts/sp5-verify.ts` (runs; uses `node:assert` + **relative imports**, no DB, no `@/` alias).
- **Type gate:** `npx tsc --noEmit` (read-only). Accept only pre-existing baseline errors from uninstalled modules (`bullmq`, `e2b`, `@xterm/*`, `diff2html`) or stale Prisma client — those vanish in the EasyPanel build. Your new code must add **zero** new type errors.
- **Real gate = EasyPanel.** Deploy = push to `main` → auto-redeploys app + worker. Authenticated E2E is done by the user.
- **No dependency, no schema change, no migration** in this SP.
- **Commit only the slice's files.** The working tree has unrelated changes (logos/docs) that must NOT enter commits. Use explicit `git add <path>`. Paths with `[id]` need quoting or `:(literal)` pathspec. Multi-line messages via heredoc, ending with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

| File | Responsibility |
|---|---|
| Create `src/lib/orchestration/team/team-templates.ts` | The 8 static `TeamTemplate`s + `getTeamTemplateById` + `summarizeTemplate`. Pure, no deps. |
| Create `scripts/sp5-verify.ts` | Pure assertions over the templates (TDD driver for Task 1). |
| Create `src/lib/orchestration/team/instantiate-roster.ts` | Shared "create N Agents + create Team" helper. Used by magic-create and template deploy. |
| Modify `src/app/api/teams/magic-create/route.ts` | Relight through `instantiateRoster` (behavior preserved). |
| Create `src/app/api/teams/templates/route.ts` | `GET` → list of template summaries (session auth). |
| Create `src/app/api/teams/templates/[id]/deploy/route.ts` | `POST` → instantiate a template into a Team (session auth). |
| Create `src/app/dashboard/teams/TeamTemplatesDialog.tsx` | Picker dialog (fetch summaries → cards → deploy → navigate). |
| Modify `src/app/dashboard/teams/page.tsx` | Add "Templates" header button + render the dialog. |

---

## Task 1: Static templates + pure verify script

**Files:**
- Create: `scripts/sp5-verify.ts`
- Create: `src/lib/orchestration/team/team-templates.ts`
- Reference (read, copy prompts from): `src/lib/orchestration/orchestration-templates.ts`
- Reference (validator): `src/lib/orchestration/team/team-roster.ts`

- [ ] **Step 1: Write the failing test (`scripts/sp5-verify.ts`)**

```ts
// scripts/sp5-verify.ts
// Pure verification for SP5 Team Templates — run: npx tsx scripts/sp5-verify.ts
// No DB, no network. RELATIVE imports only (tsx doesn't resolve the @/ alias here).
import assert from 'node:assert'
import { TEAM_TEMPLATES, getTeamTemplateById, summarizeTemplate } from '../src/lib/orchestration/team/team-templates'
import { validateRoster } from '../src/lib/orchestration/team/team-roster'

let passed = 0
function check(label: string, fn: () => void) {
  fn(); passed++; console.log(`  ✓ ${label}`)
}

check('catalog has 8 templates', () => {
  assert.equal(TEAM_TEMPLATES.length, 8)
})

check('template ids are unique', () => {
  const ids = TEAM_TEMPLATES.map(t => t.id)
  assert.equal(new Set(ids).size, ids.length)
})

for (const t of TEAM_TEMPLATES) {
  check(`"${t.id}" passes validateRoster (1 lead / >=1 worker / <=1 reviewer)`, () => {
    const err = validateRoster(t.members.map((m, i) => ({ agentId: String(i), role: m.role })))
    assert.equal(err, null, err ?? undefined)
  })
  check(`"${t.id}" members have name/systemPrompt/model`, () => {
    for (const m of t.members) {
      assert.ok(m.name.trim(), `member missing name in ${t.id}`)
      assert.ok(m.systemPrompt.trim().length > 20, `member ${m.name} systemPrompt too short in ${t.id}`)
      assert.ok(m.model.trim(), `member ${m.name} missing model in ${t.id}`)
    }
  })
  check(`"${t.id}" lead is first member`, () => {
    assert.equal(t.members[0].role, 'lead')
  })
}

check('reviewer policy holds (exactly marketing-content + suporte-inteligente)', () => {
  const withReviewer = TEAM_TEMPLATES.filter(t => t.members.some(m => m.role === 'reviewer')).map(t => t.id).sort()
  assert.deepEqual(withReviewer, ['marketing-content', 'suporte-inteligente'])
})

check('getTeamTemplateById finds and misses correctly', () => {
  assert.ok(getTeamTemplateById('marketing-content'))
  assert.equal(getTeamTemplateById('nope'), undefined)
})

check('summarizeTemplate omits systemPrompt, keeps members role/name', () => {
  const s = summarizeTemplate(TEAM_TEMPLATES[0])
  const m0 = s.members[0] as Record<string, unknown>
  assert.ok(!('systemPrompt' in m0))
  assert.equal(s.members.length, TEAM_TEMPLATES[0].members.length)
  assert.ok(m0.role && m0.name)
})

console.log(`\n✅ SP5 verify: ${passed} checks passed`)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx scripts/sp5-verify.ts`
Expected: FAIL — `Cannot find module '../src/lib/orchestration/team/team-templates'`.

- [ ] **Step 3: Create `team-templates.ts` (interfaces + helpers)**

```ts
// src/lib/orchestration/team/team-templates.ts
// Curated, pre-built team rosters (SP5). Ported from ORCHESTRATION_TEMPLATES:
// each sequential pipeline becomes a synthetic Lead (coordinator) + Workers,
// with a Reviewer only where the final step is genuine QA/review/approval.
// Static data — no DB, no deps. Members are already in Teams roster shape.

export type TeamTemplateRole = 'lead' | 'worker' | 'reviewer'

export interface TeamTemplateMember {
  role: TeamTemplateRole
  name: string
  systemPrompt: string
  model: string
}

export interface TeamTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: string
  tags: string[]
  members: TeamTemplateMember[]
}

export interface TeamTemplateSummary {
  id: string
  name: string
  description: string
  category: string
  icon: string
  tags: string[]
  members: { role: TeamTemplateRole; name: string }[]
}

const MODEL = 'llama-3.3-70b-versatile'

export const TEAM_TEMPLATES: TeamTemplate[] = [
  // ... 8 templates assembled per the table + Lead prompts below ...
]

export function getTeamTemplateById(id: string): TeamTemplate | undefined {
  return TEAM_TEMPLATES.find(t => t.id === id)
}

export function summarizeTemplate(t: TeamTemplate): TeamTemplateSummary {
  return {
    id: t.id, name: t.name, description: t.description,
    category: t.category, icon: t.icon, tags: t.tags,
    members: t.members.map(m => ({ role: m.role, name: m.name })),
  }
}
```

- [ ] **Step 4: Fill `TEAM_TEMPLATES` with the 8 templates**

For each template: `id`/`name`/`description`/`category`/`icon`/`tags` are copied verbatim from the matching entry in `src/lib/orchestration/orchestration-templates.ts`. `members[0]` is the **new Lead** (prompt below). The remaining members reuse the source agents in pipeline order: `member.name` = the source agent's `role`, `member.systemPrompt` = that source agent's `prompt` **copied verbatim**, `member.model` = `MODEL`. Apply the role mapping:

| Template id | Worker members (name = source agent role, verbatim prompt) | Reviewer (name, verbatim prompt) |
|---|---|---|
| `marketing-content` | Pesquisador, Copywriter | **Revisor** |
| `suporte-inteligente` | Triagem, Atendente L1 | **Escalação** |
| `pesquisa-analise` | Coletor, Analista, Sintetizador | — |
| `juridico-analise-contrato` | Analista Jurídico, Especialista em Compliance, Negociador Jurídico | — |
| `rh-pipeline-contratacao` | Especialista em Job Design, Analista de Triagem, Entrevistador Estruturado | — |
| `ecommerce-lancamento-produto` | Copywriter de Produto, Analista de Precificação, Estrategista de Lançamento | — |
| `saude-triagem-orientacao` | Triador de Sintomas, Orientador de Especialidade, Preparador de Consulta | — |
| `financas-analise-investimento` | Analista de Perfil, Analista de Ativos, Planejador de Alocação | — |

Member order per template: `[lead, ...workers, reviewer?]`.

**The 8 Lead system prompts (new content — use verbatim):**

`marketing-content` → name `Coordenador de Conteúdo`:
```
Você é o coordenador de um time de criação de conteúdo de marketing. Seu papel é orquestrar — não executar as etapas você mesmo. Receba o tema/briefing do usuário e delegue: primeiro ao Pesquisador (levantar tópicos, dados e ângulo), depois ao Copywriter (escrever o artigo com base na pesquisa). Encaminhe o rascunho ao Revisor para revisão editorial e SEO. Garanta que cada etapa recebeu o contexto da anterior e que o entregável final é um artigo completo, revisado e pronto para publicar. Se algum worker entregar algo incompleto ou fora do briefing, peça correção antes de seguir. Escreva sempre em português brasileiro.
```

`suporte-inteligente` → name `Coordenador de Suporte`:
```
Você coordena um time de suporte ao cliente em múltiplos níveis. Seu papel é orquestrar, não atender você mesmo. Ao receber a mensagem do cliente, delegue à Triagem (classificar urgência e categoria), depois ao Atendente L1 (redigir a resposta ou pedir os dados que faltam). Encaminhe o caso à Escalação para avaliar se precisa subir de nível e aprovar ou refinar a resposta antes de enviar. Garanta que a resposta final ao cliente é clara, empática e resolutiva, e que casos complexos foram corretamente escalados. Escreva sempre em português brasileiro.
```

`pesquisa-analise` → name `Coordenador de Pesquisa`:
```
Você coordena um time de pesquisa e análise. Seu papel é orquestrar as etapas, não produzi-las você mesmo. Ao receber o tema, delegue ao Coletor (mapear e organizar as informações), depois ao Analista (aplicar frameworks e gerar insights) e por fim ao Sintetizador (transformar tudo em relatório executivo acionável). Garanta que cada etapa parte do output da anterior e que o entregável final é um relatório claro, com insights e recomendações. Se faltar profundidade em alguma etapa, peça complemento antes de avançar. Escreva sempre em português brasileiro.
```

`juridico-analise-contrato` → name `Coordenador Jurídico`:
```
Você coordena um time jurídico de análise de contratos. Seu papel é orquestrar, não analisar você mesmo. Ao receber o contrato ou cláusula, delegue ao Analista Jurídico (identificar cláusulas de risco e lacunas), depois ao Especialista em Compliance (verificar LGPD, CDC e regulações aplicáveis) e por fim ao Negociador Jurídico (propor contra-propostas e estratégia). Garanta que cada etapa considera os achados da anterior e que o entregável final reúne riscos, conformidade e recomendações de negociação. Escreva sempre em português brasileiro.
```

`rh-pipeline-contratacao` → name `Coordenador de RH`:
```
Você coordena um time de recrutamento e seleção. Seu papel é orquestrar as etapas, não executá-las você mesmo. Ao receber os dados da vaga, delegue ao Especialista em Job Design (criar a job description), depois ao Analista de Triagem (montar scorecard e perguntas de screening) e por fim ao Entrevistador Estruturado (roteiro e guia de avaliação por competências). Garanta que cada etapa usa o output da anterior e que o entregável final cobre da vaga ao roteiro de entrevista. Escreva sempre em português brasileiro.
```

`ecommerce-lancamento-produto` → name `Coordenador de Lançamento`:
```
Você coordena um time de lançamento de produtos em e-commerce. Seu papel é orquestrar, não produzir as etapas você mesmo. Ao receber os dados do produto, delegue ao Copywriter de Produto (título e descrição otimizados), depois ao Analista de Precificação (estratégia de preço e margem) e por fim ao Estrategista de Lançamento (plano de 30 dias e divulgação). Garanta que cada etapa parte da anterior e que o entregável final é um pacote completo de lançamento: ficha, preço e plano. Escreva sempre em português brasileiro.
```

`saude-triagem-orientacao` → name `Coordenador de Triagem`:
```
Você coordena um time de orientação em saúde, com finalidade educativa (não substitui avaliação médica). Seu papel é orquestrar as etapas, não atender você mesmo. Ao receber os sintomas, delegue ao Triador de Sintomas (classificar a urgência), depois ao Orientador de Especialidade (indicar especialidade e exames prováveis) e por fim ao Preparador de Consulta (organizar histórico e perguntas para o médico). Garanta que cada etapa usa o resultado da anterior e que o entregável reforça sempre buscar avaliação médica presencial. Escreva sempre em português brasileiro.
```

`financas-analise-investimento` → name `Coordenador Financeiro`:
```
Você coordena um time de análise de investimentos, com finalidade educativa (não constitui recomendação formal de investimento). Seu papel é orquestrar as etapas, não analisar você mesmo. Ao receber os dados do investidor, delegue ao Analista de Perfil (definir perfil de risco e diagnóstico), depois ao Analista de Ativos (avaliar os ativos considerados) e por fim ao Planejador de Alocação (sugerir alocação e estratégia de entrada). Garanta que cada etapa parte da anterior e que o entregável reforça a consulta a um assessor habilitado pela CVM. Escreva sempre em português brasileiro.
```

**Canonical fully-assembled example (`marketing-content`) — match this exact shape for all 8:**
```ts
{
  id: 'marketing-content',
  name: 'Criação de Conteúdo Marketing',
  description: 'Pipeline completo de criação de conteúdo: pesquisa de tema, redação otimizada e revisão editorial. Ideal para blogs, redes sociais e newsletters.',
  category: 'marketing',
  icon: '✍️',
  tags: ['conteúdo', 'blog', 'social media', 'copywriting'],
  members: [
    { role: 'lead', name: 'Coordenador de Conteúdo', model: MODEL, systemPrompt: `Você é o coordenador de um time de criação de conteúdo de marketing. ...` },
    { role: 'worker', name: 'Pesquisador', model: MODEL, systemPrompt: `Você é um pesquisador especialista em marketing digital e tendências de mercado.\n\n...` /* verbatim from orchestration-templates marketing-content agents[0].prompt */ },
    { role: 'worker', name: 'Copywriter', model: MODEL, systemPrompt: `Você é um copywriter sênior especializado em conteúdo digital em português brasileiro.\n\n...` /* verbatim agents[1].prompt */ },
    { role: 'reviewer', name: 'Revisor', model: MODEL, systemPrompt: `Você é um editor-revisor sênior com 10+ anos de experiência em conteúdo digital.\n\n...` /* verbatim agents[2].prompt */ },
  ],
},
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx tsx scripts/sp5-verify.ts`
Expected: PASS — ends with `✅ SP5 verify: <N> checks passed` (N = 2 + 8×3 + 1 + 1 + 1 = 29).

- [ ] **Step 6: Type gate**

Run: `npx tsc --noEmit`
Expected: no NEW errors referencing `team-templates.ts` or `sp5-verify.ts` (pre-existing baseline errors from uninstalled modules are OK).

- [ ] **Step 7: Commit**

```bash
git add "src/lib/orchestration/team/team-templates.ts" "scripts/sp5-verify.ts"
git commit -F- <<'EOF'
feat(sp5): static Team Templates catalog + pure verify

8 curated rosters ported from orchestration-templates: synthetic Lead +
workers, reviewer only where the pipeline has genuine QA (marketing-content,
suporte-inteligente). scripts/sp5-verify.ts asserts each passes validateRoster
+ the reviewer policy. No DB, no deps.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 2: Shared `instantiateRoster()` helper

**Files:**
- Create: `src/lib/orchestration/team/instantiate-roster.ts`
- Reference: `src/lib/orchestration/team/create-team.ts` (calls `createTeamWithRoster`), `src/app/api/teams/magic-create/route.ts` (the loop being extracted)

This helper has no runtime test (it calls Prisma; `pg` hangs locally). It is verified by the type gate now, the magic-create relight in Task 3 (behavior preserved), and E2E. Keep the mapping trivial.

- [ ] **Step 1: Create the helper**

```ts
// src/lib/orchestration/team/instantiate-roster.ts
// Shared "create N Agents + create Team" path used by magic-create (SP1) and
// template deploy (SP5). Callers pass member specs WITHOUT agentId — this
// creates one Agent per member, then delegates to createTeamWithRoster.
import { prisma } from '@/lib/prisma'
import { createTeamWithRoster } from './create-team'
import type { RosterInput } from './team-roster'

export interface RosterMemberSpec {
  role: string
  name: string
  systemPrompt: string
  model: string
}

export interface InstantiateRosterInput {
  name: string
  description?: string | null
  teamConfig?: Record<string, unknown>
  members: RosterMemberSpec[]
  userId: string
  agentDescription: string
  agentConfigExtra?: Record<string, unknown>
}

/**
 * Creates one Agent per member (config: { role, ...agentConfigExtra }), then the
 * Team via createTeamWithRoster. Returns the same discriminated result so callers
 * map the error to whatever HTTP status they want.
 */
export async function instantiateRoster(input: InstantiateRosterInput) {
  const roster: RosterInput[] = []
  for (const [i, m] of input.members.entries()) {
    const agent = await prisma.agent.create({
      data: {
        name: m.name,
        description: input.agentDescription,
        systemPrompt: m.systemPrompt,
        model: m.model,
        temperature: 0.7,
        status: 'active',
        createdBy: input.userId,
        config: { role: m.role, ...(input.agentConfigExtra ?? {}) },
      },
    })
    roster.push({ agentId: agent.id, role: m.role, model: m.model, position: i })
  }

  return createTeamWithRoster({
    name: input.name,
    description: input.description ?? null,
    config: input.teamConfig ?? {},
    members: roster,
    userId: input.userId,
  })
}
```

- [ ] **Step 2: Type gate**

Run: `npx tsc --noEmit`
Expected: no NEW errors referencing `instantiate-roster.ts`.

- [ ] **Step 3: Commit**

```bash
git add "src/lib/orchestration/team/instantiate-roster.ts"
git commit -F- <<'EOF'
feat(sp5): shared instantiateRoster helper (create Agents + Team)

Extracts the magic-create loop so template deploy can reuse it. Callers pass
member specs without agentId; the helper creates one Agent each, then delegates
to createTeamWithRoster. Coordinator untouched.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 3: Relight magic-create through `instantiateRoster`

**Files:**
- Modify: `src/app/api/teams/magic-create/route.ts`

Goal: identical behavior, just routed through the shared helper. Preserve the agent description, the `createdByMagic` config, and the team config.

- [ ] **Step 1: Replace the agent loop + create call**

Replace this block (currently after the `parseMagicRoster` success check, lines ~79–106):

```ts
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
```

with:

```ts
    const result = await instantiateRoster({
      name: parsed.roster.name,
      description: parsed.roster.description || description.trim().slice(0, 200),
      teamConfig: { createdByMagic: true, originalDescription: description.trim() },
      members: parsed.roster.members,
      userId: auth.id,
      agentDescription: `Criado automaticamente via Magic Create para "${parsed.roster.name}"`,
      agentConfigExtra: { createdByMagic: true },
    })
```

- [ ] **Step 2: Fix imports**

At the top of the file, replace:
```ts
import { prisma } from '@/lib/prisma'
import { parseMagicRoster } from '@/lib/orchestration/team/magic-roster'
import { createTeamWithRoster } from '@/lib/orchestration/team/create-team'
import type { RosterInput } from '@/lib/orchestration/team/team-roster'
```
with (drop `prisma`, `createTeamWithRoster`, `RosterInput` if now unused; keep `prisma` only if referenced elsewhere — it is not after this change):
```ts
import { parseMagicRoster } from '@/lib/orchestration/team/magic-roster'
import { instantiateRoster } from '@/lib/orchestration/team/instantiate-roster'
```

Note: `parsed.roster.members` is `MagicMember[]` (`{ role, name, systemPrompt, model }`) which is assignable to `RosterMemberSpec[]` — `MagicRole` widens to `string`. No cast needed.

- [ ] **Step 3: Type gate**

Run: `npx tsc --noEmit`
Expected: no NEW errors; no "unused import" for `prisma`/`createTeamWithRoster`/`RosterInput`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/teams/magic-create/route.ts"
git commit -F- <<'EOF'
refactor(sp5): magic-create uses shared instantiateRoster (no behavior change)

Same agents/team/config produced; the create loop now lives in the shared
helper so template deploy reuses it.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 4: `GET /api/teams/templates`

**Files:**
- Create: `src/app/api/teams/templates/route.ts`
- Reference (auth): `src/app/api/teams/magic-create/route.ts` uses `getAuthFromRequest`.

- [ ] **Step 1: Create the route**

```ts
// src/app/api/teams/templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { TEAM_TEMPLATES, summarizeTemplate } from '@/lib/orchestration/team/team-templates'

export const dynamic = 'force-dynamic'

/** GET /api/teams/templates → summaries (no system prompts) for the picker. */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ success: true, data: TEAM_TEMPLATES.map(summarizeTemplate) })
}
```

- [ ] **Step 2: Type gate**

Run: `npx tsc --noEmit`
Expected: no NEW errors referencing this route.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/teams/templates/route.ts"
git commit -F- <<'EOF'
feat(sp5): GET /api/teams/templates (session-auth summaries)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 5: `POST /api/teams/templates/[id]/deploy`

**Files:**
- Create: `src/app/api/teams/templates/[id]/deploy/route.ts`
- Reference: Next.js 16 async params (`params: Promise<{ id }>`), `instantiateRoster`, `getTeamTemplateById`.

- [ ] **Step 1: Create the route**

```ts
// src/app/api/teams/templates/[id]/deploy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { getTeamTemplateById } from '@/lib/orchestration/team/team-templates'
import { instantiateRoster } from '@/lib/orchestration/team/instantiate-roster'

export const dynamic = 'force-dynamic'

/**
 * POST /api/teams/templates/[id]/deploy
 * Instantiates a static template into Agents + Team for the current user.
 * Returns: { teamId, team: { id, name, description, members } }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tpl = getTeamTemplateById(id)
  if (!tpl) return NextResponse.json({ success: false, error: 'Template não encontrado' }, { status: 404 })

  try {
    const result = await instantiateRoster({
      name: tpl.name,
      description: tpl.description,
      teamConfig: { createdFromTemplate: tpl.id },
      members: tpl.members,
      userId: auth.id,
      agentDescription: `Criado a partir do template "${tpl.name}"`,
      agentConfigExtra: { createdFromTemplate: tpl.id },
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
          members: tpl.members.map(m => ({ role: m.role, name: m.name })),
        },
      },
    })
  } catch (error) {
    console.error('Template deploy error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar o time a partir do template.' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Type gate**

Run: `npx tsc --noEmit`
Expected: no NEW errors. Confirm `params` is typed `Promise<{ id: string }>` and `await`ed (Next 16 recurring bug).

- [ ] **Step 3: Commit** (note the `[id]` literal pathspec)

```bash
git add ":(literal)src/app/api/teams/templates/[id]/deploy/route.ts"
git commit -F- <<'EOF'
feat(sp5): POST /api/teams/templates/[id]/deploy (instantiate template → Team)

Session-auth; 404 on unknown id, 422 on roster failure. Reuses instantiateRoster.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 6: `TeamTemplatesDialog` picker

**Files:**
- Create: `src/app/dashboard/teams/TeamTemplatesDialog.tsx`
- Reference (pattern): `src/components/sofia/MagicCreateModal.tsx` (shadcn Dialog + Badge + sonner toast + `router.push`).

- [ ] **Step 1: Create the dialog**

```tsx
// src/app/dashboard/teams/TeamTemplatesDialog.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, LayoutTemplate, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

type TemplateRole = 'lead' | 'worker' | 'reviewer'

interface TemplateSummary {
  id: string
  name: string
  description: string
  category: string
  icon: string
  tags: string[]
  members: { role: TemplateRole; name: string }[]
}

interface TeamTemplatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROLE_LABEL: Record<TemplateRole, string> = { lead: 'Lead', worker: 'Worker', reviewer: 'Reviewer' }
const ROLE_BADGE: Record<TemplateRole, string> = {
  lead: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
  worker: 'bg-blue-500/20 text-blue-300 border-blue-500/20',
  reviewer: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
}

export function TeamTemplatesDialog({ open, onOpenChange }: TeamTemplatesDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [deployingId, setDeployingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/teams/templates')
      .then(r => r.json())
      .then(j => { if (j.success) setTemplates(j.data); else toast.error(j.error || 'Erro ao carregar templates.') })
      .catch(() => toast.error('Erro ao conectar com o servidor.'))
      .finally(() => setLoading(false))
  }, [open])

  async function deploy(id: string) {
    setDeployingId(id)
    try {
      const res = await fetch(`/api/teams/templates/${id}/deploy`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) { toast.error(json.error || 'Erro ao criar o time.'); return }
      toast.success('Time criado a partir do template!')
      onOpenChange(false)
      router.push(`/dashboard/teams/${json.data.teamId}`)
    } catch {
      toast.error('Erro ao conectar com o servidor.')
    } finally {
      setDeployingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/20 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
              <LayoutTemplate className="h-4 w-4 text-white" />
            </div>
            Templates de time
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Comece com um roster pronto. Escolha um template e abra a sala do time já montado.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="text-white/40 text-sm flex items-center gap-2 py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando templates…
          </p>
        )}

        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {templates.map(t => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <span className="text-xl leading-none">{t.icon}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-white">{t.name}</div>
                    <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{t.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {t.members.map((m, i) => (
                    <Badge key={i} className={`${ROLE_BADGE[m.role]} text-xs font-normal`}>
                      {ROLE_LABEL[m.role]} · {m.name}
                    </Badge>
                  ))}
                </div>
                <button
                  onClick={() => deploy(t.id)}
                  disabled={deployingId !== null}
                  className="mt-auto inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {deployingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Usar template
                </button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Type gate**

Run: `npx tsc --noEmit`
Expected: no NEW errors. Confirm `@/components/ui/dialog` and `@/components/ui/badge` exist (used by MagicCreateModal — they do).

- [ ] **Step 3: Commit**

```bash
git add "src/app/dashboard/teams/TeamTemplatesDialog.tsx"
git commit -F- <<'EOF'
feat(sp5): TeamTemplatesDialog picker (cards → deploy → open team)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 7: Wire "Templates" button into the Teams header

**Files:**
- Modify: `src/app/dashboard/teams/page.tsx`

- [ ] **Step 1: Add imports**

Add `LayoutTemplate` to the lucide import on line 6 and import the dialog after the MagicCreateModal import (line 10):

```ts
import { Users, Plus, Loader2, ArrowRight, Pencil, Trash2, X, GitBranch, Play, Search, Wand2, LayoutTemplate } from 'lucide-react'
```
```ts
import { TeamTemplatesDialog } from './TeamTemplatesDialog'
```

- [ ] **Step 2: Add state**

After `const [magicOpen, setMagicOpen] = useState(false)` (line 117):

```ts
  const [templatesOpen, setTemplatesOpen] = useState(false)
```

- [ ] **Step 3: Add the header button**

In the header, insert a "Templates" button immediately before the Magic Create button (before line 234 `<button onClick={() => setMagicOpen(true)} ...>`):

```tsx
        <button
          onClick={() => setTemplatesOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          <LayoutTemplate className="h-4 w-4" /> Templates
        </button>
```

- [ ] **Step 4: Render the dialog**

Right after the Magic Create modal render (after line 372 `<MagicCreateModal open={magicOpen} onOpenChange={setMagicOpen} />`):

```tsx
      {/* Templates picker */}
      <TeamTemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
```

- [ ] **Step 5: Type gate**

Run: `npx tsc --noEmit`
Expected: no NEW errors referencing `page.tsx`.

- [ ] **Step 6: Commit**

```bash
git add "src/app/dashboard/teams/page.tsx"
git commit -F- <<'EOF'
feat(sp5): Templates button + picker in the Teams header

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 8: Final verification + deploy

- [ ] **Step 1: Full local gate**

Run:
```bash
npx tsx scripts/sp5-verify.ts
npx tsc --noEmit
```
Expected: verify ends `✅ SP5 verify: 29 checks passed`; tsc shows only the pre-existing baseline errors (uninstalled modules / stale Prisma client), none referencing SP5 files.

- [ ] **Step 2: Confirm only slice files are committed**

Run: `git log --oneline -7` and `git status --short`
Expected: the 7 SP5 commits present; unrelated tree changes (logos/docs) still uncommitted (untouched).

- [ ] **Step 3: Push (deploys app + worker)**

Run: `git push origin main`
Expected: EasyPanel rebuilds; the team room may 502 for ~1–2 min during rebuild, then healthy.

- [ ] **Step 4: E2E with the user (real gate)**

Ask the user to: open `/dashboard/teams` → click **Templates** → pick `Criação de Conteúdo Marketing` → confirm a team is created and the room opens → verify members are **Coordenador de Conteúdo (Lead)**, **Pesquisador (Worker)**, **Copywriter (Worker)**, **Revisor (Reviewer)**. Also spot-check one no-reviewer template (e.g. `Pesquisa & Análise Aprofundada`) creates Lead + 3 Workers, no Reviewer. Confirm Magic Create still works (regression check on the relight).

---

## Self-Review (done by plan author)

- **Spec coverage:** templates data (Task 1) ✓ · helper + magic-create relight (Tasks 2–3) ✓ · GET list (Task 4) ✓ · POST deploy w/ 404/422/500 (Task 5) ✓ · picker UI (Task 6) ✓ · header wiring (Task 7) ✓ · no migration/dep, session auth no middleware allowlist ✓ · tests + E2E (Tasks 1, 8) ✓.
- **Type consistency:** `TeamTemplate`/`TeamTemplateMember`/`TeamTemplateSummary`, `getTeamTemplateById`, `summarizeTemplate`, `RosterMemberSpec`, `InstantiateRosterInput`, `instantiateRoster` names are used identically across Tasks 1–7. `tpl.members` (`TeamTemplateMember[]`) assignable to `RosterMemberSpec[]`; `parsed.roster.members` (`MagicMember[]`) likewise. Helper returns the `createTeamWithRoster` discriminated result (`{ok:true,team} | {ok:false,error}`) consumed by both routes.
- **Placeholders:** worker/reviewer prompts are an explicit verbatim copy from an existing repo file (not a TODO); the only `...` are in the illustrative example block, with the full prompts provided above and the source file named.
```
