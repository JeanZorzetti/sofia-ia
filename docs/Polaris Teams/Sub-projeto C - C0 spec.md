# Sub-projeto C — Code Factory · Fatia C0 (spec)

> Spec da **primeira fatia** do Sub-projeto C. Escopo confirmado 2026-06-14. Ver `ROADMAP.md` (seção C) para o contexto do programa e `Sessão 3.md` para o kickoff.

## Por que

A Polaris já roda **Teams** de agentes-LLM (Sub-projetos A e B em prod): um Team persistente executa uma "mission" via coordinator Lead-orquestrado (`runTeam`), com kanban/feed/grafo ao vivo. Hoje os membros só produzem **texto**.

O **Code Factory** abre a vertical "software house na nuvem": um Team que roda agentes de **CÓDIGO** num sandbox isolado. Produto novo (o runtime desktop da Agent Teams AI não porta pra web), mas **reusa o cérebro de coordenação do A** e **a UX do B**.

C é Alto esforço/Alto risco → fatiado. **C0 = a thread vertical mais fina** que prova a arquitetura ponta-a-ponta e de-risca os dois maiores desconhecidos: **fila durável + worker** e **integração com sandbox provider**.

## Decisões fechadas

| Decisão | Escolha |
|---|---|
| Sandbox provider | **E2B**, atrás da porta `SandboxProvider` (trocável p/ Docker-per-run depois) |
| Fila | **BullMQ** sobre o `ioredis` já no stack. **Só code-runs** passam pela fila; chat-runs continuam no `after()` provado |
| Invocação do "agente de código" | **Mantém o seam `ChatFn`**: injeta um *code-agent ChatFn* (loop agêntico no sandbox); estende `ChatResult` com `artifacts`. **Coordinator não muda.** |
| Modelo de dados | **Estende models** (`TeamRun.mode` discriminador + `TeamRun.sandboxId` + `TeamTask.artifacts` Json). Sem tabelas novas. |

## Escopo

**Dentro:** fila durável + worker separado · porta `SandboxProvider` + impl E2B · *code-agent ChatFn* (loop: LLM propõe `@RUN`/`@DONE` → exec no sandbox → realimenta, bounded por `maxSteps`) · migração `mode`+`artifacts` · SSE evento `terminal` + painel de terminal no run view.

**Fora (fatias futuras):** git clone/branch/commit/push/PR (**C1**); terminal/diff streaming rico, xterm, diff viewer (**C2**); code-review com diff (**C3**); migrar chat-runs para a fila.

## Arquitetura

```
POST /api/teams/[id]/run  { mission, mode:'code' }
   └─ cria TeamRun(mode='code', status='pending') → enfileira { runId } no codeRunQueue → 202 { runId }

WORKER  (serviço EasyPanel separado, mesmo repo, start: npm run worker)
   on job { runId }:
     sandbox = await provider.create()
     try   runTeam(runId, { store, chat: createCodeChatFn(sandbox, chatWithAgent) })   ← coordinator INTACTO
     finally sandbox.close()

createCodeChatFn(sandbox, baseChat) → ChatFn  (por turno de membro):
   loop até @DONE | maxSteps:
     out  = baseChat(agentId, msgs, ctx, opts)         # member propõe @RUN <cmd> / @DONE
     cmds = parseCodeActions(out.message)
     se vazio → break
     p/ cada cmd: r = sandbox.exec(cmd); acumula {cmd,stdout,stderr,exitCode,ms}
     msgs += user(output dos comandos) → próximo passo
   return { message, model, usage, artifacts:{commands} }

SSE  …/stream  → além de board/message/status/done, emite `terminal` (artifacts por task) → painel de terminal
```

## Arquivos

**Reuso intacto:** `team-coordinator.ts` (só repassa `artifacts` ao `updateTask`), `team-store.ts`, `team-protocol.ts` (padrão de parser), `lib/ai/groq.ts` (`chatWithAgent`), `lib/cache.ts` (padrão Redis).

**Criar:**
- `src/lib/sandbox/types.ts` — `Sandbox` + `SandboxProvider`.
- `src/lib/sandbox/e2b.ts` — impl E2B (lazy init `E2B_API_KEY`).
- `src/lib/sandbox/index.ts` — factory por env (`SANDBOX_PROVIDER`).
- `src/lib/orchestration/team/code-protocol.ts` — `parseCodeActions` (puro).
- `src/lib/orchestration/team/code-agent.ts` — `createCodeChatFn`.
- `src/lib/queue/connection.ts` · `src/lib/queue/code-run-queue.ts` — BullMQ.
- `src/worker/index.ts` — entrypoint do worker.
- painel de terminal no run view.

**Modificar:** `schema.prisma` (+migração) · `team-types.ts` (`CodeArtifacts`, `ChatResult.artifacts`) · `team-store.ts` (`UpdateTaskInput.artifacts`) · `team-coordinator.ts` (pass-through) · `run/route.ts` (enqueue se code) · SSE route (evento `terminal`) · `package.json` (deps + script `worker`).

## Pré-requisitos de infra
1. Redis durável na EasyPanel + `REDIS_URL` (hoje `cache.ts` cai pra memória).
2. Conta E2B + `E2B_API_KEY`.
3. Serviço worker na EasyPanel (start `npm run worker`). ⚠️ Maior incógnita de deploy.
4. `prisma migrate deploy` em `sofia_db@2.24.207.200:5435` (DATABASE_URL inline).

## Verificação
- **Local:** `npx tsc --noEmit`; `npx tsx` (node:assert, imports relativos) para `parseCodeActions` e `createCodeChatFn` (fake sandbox + fake LLM). NÃO rodar jest/next build/pg (OneDrive).
- **E2E (com o usuário):** deploy → criar code-team → mission simples → painel de terminal reflete comandos ao vivo → run `completed` com `artifacts` persistidos.

## Riscos
Worker como 2º serviço (entry + build standalone) · lifecycle do sandbox (`close()` no `finally`) · Redis precisa ser persistente · não injetar segredos no sandbox · custo E2B (ok p/ MVP).
