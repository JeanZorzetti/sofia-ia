# Phase 1 — Data Model

**Importante**: esta feature **NÃO altera o schema do banco** (Princípio III não acionado). As "entidades" abaixo são, em sua maioria, **interfaces/contratos de código** e **layout de filesystem**, mais o reuso de colunas Prisma existentes.

---

## 1. Colunas Prisma reutilizadas (nenhuma nova)

| Modelo.coluna | Uso nesta feature |
|---|---|
| `TeamRun.sandboxId` (String?) | Passa a guardar o **id do diretório de run** do VpsLocal (hoje guarda o sandboxId do E2B). Já é gravado pelo worker (`update { sandboxId: sandbox.id }`). |
| `TeamRun.parentRunId`, `TeamRun.branch`, `TeamRun.baseBranch` | Continuação (Lovable): reanexa ao dir via `sandboxId`. Inalterados. |
| `TeamMember.role` (`'lead'|'worker'|'reviewer'`) | Lido pelo dep `resolveMemberRole` para decidir o enriquecimento. Somente leitura. |
| `TeamRun.previewEnabled`/`previewStatus`/`previewError` | Na Fase 1 o VpsLocal não suporta preview → `getPreviewUrl` lança → `previewStatus='failed'` (best-effort, não derruba o run). |

Nenhuma migração. Nenhum `db push`. (Se uma futura fase exigir schema, segue Princípio III: migração formal + `migrate deploy` manual no host real `2.24.207.200:5435`.)

## 2. Port `Sandbox` — adição aditiva

```ts
export interface Sandbox {
  readonly id: string
  /** NOVO (opcional): raiz por-run do executor. E2B omite (cada VM é isolada → default
   *  '/home/user'). VpsLocal retorna `${VPS_RUNS_DIR}/<id>`, dando isolamento por run no
   *  FS compartilhado do worker. Ausente ⇒ caminho legado byte-idêntico. */
  readonly rootDir?: string
  exec(cmd: string, opts?: ExecOptions): Promise<CommandResult>
  writeFile(path: string, content: string): Promise<void>
  getPreviewUrl(port: number): Promise<string>
  setTimeout(ms: number): Promise<void>
  close(): Promise<void>
}
```

- **Invariante**: `e2b.ts` não define `rootDir` → todo consumidor que faça `sandbox.rootDir ?? '/home/user'` mantém o comportamento atual.
- **Consumidor**: `src/worker/index.ts` troca `const WORKDIR = '/home/user/repo'` por `const workdir = `${sandbox.rootDir ?? '/home/user'}/repo``, derivado **após** criar/conectar o sandbox (deixa de ser constante de módulo).

## 3. Layout de filesystem (VpsLocal)

```text
${VPS_RUNS_DIR}/                 # default /runs (volume da VPS, montado no worker)
└── <runId-ou-uuid>/            # = Sandbox.id = TeamRun.sandboxId; rootDir aponta aqui
    └── repo/                   # workdir: clone do repositório do run
        └── … (arquivos editados pelo worker, lidos por lead/reviewer)
```

- **Criação**: `create()` gera `<id>` (uuid), `mkdir -p ${VPS_RUNS_DIR}/<id>`.
- **Isolamento (FR-005)**: cada run tem seu `<id>`; runs concorrentes nunca colidem.
- **Remoção**: `close()` → `rm -rf ${VPS_RUNS_DIR}/<id>`; sweep de órfãos (boot + reaper) cobre crashes (FR-012).
- **Reanexar (FR-013)**: `connect(id)` valida `existsSync(${VPS_RUNS_DIR}/<id>)`; ausente ⇒ erro claro.

## 4. Contrato do dep `resolveMemberRole` (injeção)

```ts
/** Injetado pelo worker em createCodeChatFn (impl Prisma). Mapeia o membro do turno
 *  ao seu papel, para o code-agent escolher o enriquecimento. Best-effort:
 *  qualquer falha → null → sem enriquecimento (byte-idêntico). */
type ResolveMemberRole = (opts: {
  agentId: string
  memberId?: string | null   // vem de ChatOptions.memberId (já forwarded pelo coordinator)
}) => Promise<'lead' | 'worker' | 'reviewer' | null>
```

- **Fonte**: `prisma.teamMember.findFirst({ where: { id: memberId } , select: { role: true } })` (ou por `agentId`+run quando `memberId` ausente). Somente leitura, escopado ao run/member já em execução (sem nova superfície de tenant).

## 5. Saída do enriquecimento (`co-location.ts`, puro)

```ts
/** Retorna o texto a PREPENDAR na 1ª mensagem do turno, ou null (sem enriquecimento). */
async function buildColocationContext(input: {
  role: 'lead' | 'reviewer'        // worker/none nunca chega aqui
  sandbox: Pick<Sandbox, 'exec'>
  workdir: string
  keyFiles?: string[]              // arquivos-chave a incluir p/ o lead (derivados da missão)
}): Promise<string | null>
```

- **lead** → árvore do repo (capada) + conteúdo dos `keyFiles` (capado por arquivo).
- **reviewer** → bloco curto de "como verificar" (você pode @RUN `npm test`/`build`/`grep` no repo vivo) + (opcional) resultado de um teste leve.
- **Caps**: reutilizar a filosofia de caps do C2 (`repo-lifecycle`) para não estourar o contexto (linhas/bytes por arquivo, total).

## 6. Variáveis de ambiente (configuração, não dado)

| Env | Onde | Default | Papel |
|---|---|---|---|
| `SANDBOX_PROVIDER` | worker | `e2b` | `vps-local` ativa o novo executor (FR-003). |
| `VPS_RUNS_DIR` | worker | `/runs` | base dos diretórios de run (volume da VPS). |
| `CODE_RUN_CONCURRENCY` | worker | `2` | concorrência (recomendar 1–2 na VPS). |
| (existentes) `GITHUB_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN(S)`, `REDIS_URL`, `DATABASE_URL` | worker | — | pré-requisito operacional (D9). |
