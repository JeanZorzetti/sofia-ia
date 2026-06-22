# Contract — SandboxProvider / Sandbox (VpsLocal)

Interface interna existente: `src/lib/sandbox/types.ts`. Esta feature **adiciona um impl** e um **campo opcional**, sem quebrar o port. Consumidores que dependem só do port (`worker/index.ts`, `repo-lifecycle.ts`, `captureWorkingDiff`, `code-agent.ts`, `preview-lifecycle.ts`) não mudam de assinatura.

## Seleção (factory)

`getSandboxProvider()` em `src/lib/sandbox/index.ts`:

```text
SANDBOX_PROVIDER = "e2b"        → createE2BProvider()      (default, inalterado)
SANDBOX_PROVIDER = "vps-local"  → createVpsLocalProvider()  (NOVO)
<qualquer outro>                → throw Error claro          (FR-004; já é o comportamento)
```

## Adição ao port `Sandbox`

| Membro | Tipo | E2B | VpsLocal |
|---|---|---|---|
| `rootDir?` | `readonly string \| undefined` | **undefined** (omitido) | `${VPS_RUNS_DIR}/<id>` |

Garantia: `sandbox.rootDir ?? '/home/user'` ⇒ caminho legado no E2B (byte-idêntico).

## Semântica de cada método no VpsLocal

| Método | Comportamento | Notas / invariantes |
|---|---|---|
| `create(opts?)` | `id = uuid`; `mkdir -p ${VPS_RUNS_DIR}/<id>`; retorna `Sandbox` com `rootDir=${VPS_RUNS_DIR}/<id>`. | `opts.templateId` ignorado (sem imagem); `opts.timeoutMs` ignorado (sem teto — **FR-002**). |
| `exec(cmd,{cwd,env,timeoutMs})` | roda em subshell (`bash -lc`) com `cwd`, `env` mesclado ao do worker, e timeout real (kill→SIGKILL). Retorna `{stdout,stderr,exitCode,ms}`. | **Nunca lança** em saída não-zero (igual ao port): captura e devolve `exitCode`. Timeout ⇒ `exitCode≠0` + stderr explicativo. |
| `writeFile(path,content)` | `fs.mkdir(dirname,{recursive})` + `fs.writeFile`. | Caminhos absolutos do sandbox = caminhos reais no worker (já namespaced por `rootDir`). |
| `setTimeout(ms)` | **no-op** (resolve imediato). | Remove o teto de 1h; torna o heartbeat inofensivo sem editá-lo. |
| `close()` | `rm -rf ${VPS_RUNS_DIR}/<id>` (idempotente; ignora ausência). | Caminho normal de fim de run (sem preview). **FR-012**. |
| `connect(id)` | valida `existsSync(${VPS_RUNS_DIR}/<id>)`; retorna `Sandbox` reanexado (`rootDir` recomposto). Ausente ⇒ `throw` claro. | Continuação (Lovable). **FR-013**. |
| `getPreviewUrl(port)` | `throw Error('preview self-hosted indisponível (Fase 2)')`. | `startRunPreview` é best-effort → `previewStatus='failed'`, run intacto. Edge case "preview degrada de forma clara". |

## Contrato de erro

- Provider desconhecido ⇒ erro síncrono no factory (FR-004).
- `connect` em dir inexistente ⇒ erro com mensagem acionável ("sessão expirou — dispare nova missão"); o worker já traduz isso em `failRun`.
- Falha de `exec` (não-zero) ⇒ **não** é exceção; é `exitCode≠0` (o code-agent/`repo-lifecycle` decidem).

## Invariância (gate de regressão)

Com `SANDBOX_PROVIDER=e2b` (ou ausente): **zero** diferença de comportamento — `e2b.ts` intocado, `rootDir` ausente, worker usa `/home/user/repo`. Verificado por `scripts/vps-local-verify.ts` cobrir só o caminho VpsLocal e os testes c0..c3 existentes seguirem verdes.
