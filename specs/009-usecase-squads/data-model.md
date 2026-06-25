# Data Model — Squads por Case de Uso (Phase 1)

Princípio: **reuso máximo**. Apenas **uma** mudança de schema (coluna nullable). Tudo o mais já existe.

## Entidades reusadas

### `Company` (005 — inalterada)
Guarda-chuva. Passa a agrupar **squads** (além dos `CompanyRole`/RACI). Fornece `niche` (para escolher os
templates de squad), `createdBy` (escopo/ownership) e `roles` (staffing `roleKey → agentId`).

### `CompanyRole` (005 — inalterada)
Encaixe 1:1 `roleKey → Agent`. É a fonte do **staffing** consumido por `buildSquadRoster` para resolver os
membros de um squad-template (US4). Não muda.

### `Agent` (pool — inalterado)
Catálogo reutilizável. Um agente é referenciado por N squads via `TeamMember` (sem duplicação).

### `Team` (CERNE — **1 coluna nova**)
O squad **é** um Team. Mudança:

```prisma
model Team {
  // ...campos existentes...
  companyId String?  @map("company_id") @db.Uuid   // NOVO: null = Time avulso (legado); setado = squad da empresa
  company   Company? @relation(fields: [companyId], references: [id], onDelete: SetNull)  // NOVO
  // ...
  @@index([companyId])   // NOVO — read-path "squads por empresa"
}
```
- **Squad** ⇔ `companyId != null` **e** `status='active'`.
- **Time de fase (005)** permanece `status='internal'` (efêmero) — não é squad.
- **Time avulso (legado)** ⇔ `companyId = null` → comportamento byte-idêntico.
- `Company` ganha o lado inverso `teams Team[]` (relação).
- **use case** (texto "quando usar") e a `key` do template (idempotência do seed) vivem em
  `Team.config` Json: `{ useCase?: string, squadKey?: string }`. Sem migração adicional.

### `TeamMember` (CERNE — inalterado)
Membros do squad. `agentId` → pool; `role` ∈ `lead|worker|reviewer`; `model` herda do agente. Já suporta
`position`, `capabilities`, `workflow`.

### `TeamRun` (CERNE — inalterado)
A **execução de um squad** é um `TeamRun`. A **fila WIP** usa os estados já existentes:
- `pending` = **enfileirado** (aguardando o gate global).
- `running` = em execução (o gate garante ≤1 global entre squad-runs).
- `completed | failed | cancelled` = terminais.
- `rate_limited` + `resetAt` (008) = pool esgotado; retomado pelo cron de resume.

Sem coluna nova: ordenação da fila = `createdAt ASC`; recorte de squad-run = `team.companyId != null AND
team.status='active'`.

## Entidades NÃO persistidas (dado puro / código)

### Squad Blueprint (`squad-blueprint.ts`)
Constantes por nicho. Não é tabela.
```ts
interface SquadTemplate {
  key: string            // estável p/ idempotência do seed (ex.: 'feature')
  label: string          // ex.: 'Feature nova'
  useCase: string        // "quando usar" — vai p/ Team.config.useCase
  members: { roleKey: string; role: 'lead' | 'worker' | 'reviewer' }[]
}
```
Invariantes (validados por `validateSquadBlueprint`, puro): exatamente 1 `lead`; ≥1 `reviewer`
(recomendado); todos os `roleKey` ∈ keys do blueprint do nicho; tamanho ≤ teto sugerido (ex.: 4 → aviso
acima disso, SC-001).

## Estados & transições — Squad Run (fila WIP=1 global)

```
            POST /squads/[id]/run
                   │
                   ▼
   ┌─────────── pending (enfileirado) ───────────┐
   │  dispatchSquadQueue(): advisory lock         │
   │  count(running squad-runs)==0 ?              │
   │        sim → claim atômico                   │  não → permanece pending
   ▼                                              │
running ──(runTeamAndWait)──► completed/failed ───┘ ──► dispatch puxa o próximo pending
   │
   └──(pool esgotado, 008)──► rate_limited(+resetAt) ──(cron resume)──► running
```
- **Garantia (SC-003)**: o advisory lock + a checagem `count(running)==0` asseguram que **nunca** há 2
  squad-runs `running` simultâneos no escopo global.
- **Idempotência**: re-disparar o dispatcher é seguro (claim condicional sob lock).

## Ownership / multi-tenant (Princípio V)
Todas as leituras/escritas de squad são escopadas por `Company.createdBy == ownerId(auth)` (admin vê todas,
como na 005). O gate de fila é **global por design** (protege o pool compartilhado), mas a
visibilidade/operação de cada squad respeita o dono.
