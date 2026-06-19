# Polaris Teams V2.1 — Prompt inicial da Sessão 2

> Cole o bloco abaixo (ou o essencial) ao abrir a nova conversa. Ele dá ao Claude todo o contexto pra continuar sem reexplorar. **Foco desta sessão: S1.2 — Tool loop no Ollama (function-calling).**

---

## Contexto pra continuar (ciclo Polaris Teams V2.1)

Ciclo de **fechar gaps do Teams vs Agent Teams AI** na **Polaris** (antiga Sofia = `sofia-next`; deploy EasyPanel em `polarisia.com.br`; GitHub `JeanZorzetti/sofia-ia`). Docs deste ciclo: **`Imob/sofia-next/docs/Polaris Teams V2.1/`** → **`ROADMAP.md`** (executável; leia a **Sprint 1, fatia S1.2**) + `ANALISE-GAP-V2.1.md` (análise; a tese central é o **eixo-autonomia**). Cadência: **1 fatia por sessão**; commit + push ao fechar; **não continuar automaticamente** pra próxima fatia (regra global #4).

**Sequência do ciclo:** Sprint 1 (S1.1 ✅ → **S1.2 🔜** → S1.3) → Sprint 2 (S2.1 → S2.2) → Sprint 3 (S3.1 → S3.2 → S3.3).

**O gap que o Sprint 1 fecha:** o V2 S1 entregou a **política de capacidade por membro**, mas a **execução** de tools só rodava no path **OpenRouter**. Membros Groq/Ollama/Claude-CLI recebiam a *descrição* das tools mas não as invocavam. A S1.1 destravou o **Groq nativo**; a **S1.2 faz o mesmo no Ollama**; a S1.3 trata os providers-agente (Claude/Opencode CLI, natureza diferente).

**Invariantes (valem pra toda fatia):**
1. **Coordinator INTACTO** — `runTeam` ([team-coordinator.ts](../../src/lib/orchestration/team/team-coordinator.ts)) e `runTeamGraph` ([team-graph-coordinator.ts](../../src/lib/orchestration/team/team-graph-coordinator.ts)) não mudam. **A S1.2 NÃO toca coordinators** — tudo é dentro de `chatWithAgent` ([groq.ts](../../src/lib/ai/groq.ts)) + o helper puro `model-capabilities.ts`.
2. **Migração formal + `migrate deploy` manual ANTES do push** (lição SP2/SP3) — **mas a S1.2 NÃO mexe no schema** (a política `capabilities` já existe desde o V2 S1) → **sem migração nesta fatia.**
3. **Script de verificação** `scripts/v21s2-verify.ts` — asserts puros (`node:assert`) + imports **relativos** + `npx tsc --noEmit` limpo, **sem jest** (OneDrive errno -4094).
4. **Defaults preservam o legado** — todo caminho novo é opt-in; membro sem política / modelo sem suporte / `rawText` cai no comportamento atual (completion plana).

### O que JÁ foi feito ✅ — S1.1 (commit `3e2f3ed`, 2026-06-19) — NÃO refazer, a S1.2 REUSA

A S1.1 = **rodar o loop de tools no path Groq nativo**, extraindo as peças compartilhadas. O que já existe e a S1.2 vai **reusar quase inteiro**:

- **`src/lib/ai/agent-tools.ts` (NOVO):** dois helpers compartilhados —
  - `buildAgentToolDefs({ agentSkills, agentMcpServers })` → `{ toolSkillDefinitions, mcpDefsTagged }` (PURO — reshape das defs).
  - `executeAgentToolCall({ fnName, fnArgs, agentMcpServers, agentSkills, toolSkillDefinitions })` → `Promise<string>` (dispatch MCP → tool-skill → filesystem).
  - **A S1.2 chama EXATAMENTE esses dois** no path Ollama. Nada novo a escrever aqui.
- **`modelSupportsTools` ([model-capabilities.ts](../../src/lib/ai/model-capabilities.ts)) agora reconhece ids Groq nativos** via `GROQ_TOOL_CAPABLE_PREFIXES` (`llama-3.3`, `llama-3.1`, `llama3-`). `resolveToolGate`/`selectApiTools` inalterados (já eram puros desde o V2 S1).
- **Loop de tools no path Groq nativo** já vive em `chatWithAgent` (bloco `// ── Groq com tools por política de capacidade (Teams V2.1 — S1.1) ──`, logo ANTES da `// ── Groq padrão (sem tools) ──`). **Esse bloco é o TEMPLATE da S1.2** — copie a estrutura para o path Ollama.
- **Verificação da S1.1:** [scripts/v21s1-verify.ts](../../scripts/v21s1-verify.ts) (12 asserts) + `tsc --noEmit` exit 0. **Rode no começo pra confirmar baseline verde.**
- **Pendente da S1.1 (com o usuário):** E2E autenticado em prod (rodar time com Worker Groq tool-capable e confirmar invocação no feed). Não bloqueia a S1.2.

---

## Onde a S1.2 mexe — o path Ollama em `chatWithAgent` (código real)

O path Ollama vive em [groq.ts](../../src/lib/ai/groq.ts), no `if (agent.model.startsWith('ollama/')) { ... }` (vem ANTES do check `'/'` do OpenRouter, porque ids ollama contêm `/`). Hoje é uma **completion plana sem tools**:

```ts
if (agent.model.startsWith('ollama/')) {
  const { getOllamaClient } = await import('@/lib/ai/ollama')
  const ollamaModel = agent.model.slice('ollama/'.length)
  const completion = await getOllamaClient().chat.completions.create({
    model: ollamaModel,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: agent.temperature,
    max_tokens: 4096,
  })
  return { message: ..., model: agent.model, usage: ..., confidence: 0.85 }
}
```

**`getOllamaClient()` é OpenAI-compatible** (mesma forma do Groq/OpenRouter), então `.chat.completions.create({ tools, tool_choice })` e `responseMsg.tool_calls` funcionam para modelos Ollama que suportam function calling.

**⚠️ Proteção que NÃO pode regredir — `rawText`:** o comentário atual do path diz *"the code-team parses @RUN/@DONE from the text, so no native tool-calling is needed here"* → **o code-team usa o Ollama em modo `rawText`**. O `resolveToolGate` já tem `&& !rawText`, então o loop só liga quando NÃO é code-run; **garanta que `rawText` cai na completion plana** (igual hoje). É o caso de regressão mais importante.

---

## Foco desta sessão: S1.2 — Tool loop no Ollama 🔜

**Objetivo (do ROADMAP, fatia S1.2):** rodar o **mesmo** loop de tools (gate `resolveToolGate` + filtragem `selectApiTools` + dispatch `executeAgentToolCall`) no path Ollama, quando o gate ligar; senão, completion plana (byte-idêntico).

**Mudanças concretas:**
1. **`modelSupportsTools` — tratar o prefixo `ollama/`.** Hoje a função recebe o `agent.model` COMPLETO (`ollama/llama3.1:8b`). Casos atuais: `ollama/qwen2.5:...` já dá `true` por acidente (`includes('qwen')`), mas `ollama/llama3.1:8b` dá **`false`**. Fix sugerido: se `model.startsWith('ollama/')`, avaliar a parte **bare** (depois de `ollama/`, e antes do `:tag`) contra as famílias com tool use no Ollama. Manter **conservador** (id desconhecido → false → texto, sem 400). Decisão #1 abaixo.
2. **Adicionar o loop de tools no path Ollama** — copiar o bloco-template do path Groq (S1.1): `resolveToolGate({ capabilities, isCoderModel, rawText, modelSupportsTools(agent.model) })` → se on, `buildAgentToolDefs` + `selectApiTools` → `apiTools` → loop com `getOllamaClient().chat.completions.create({ model: ollamaModel, tools: apiTools, tool_choice: 'auto', ... })` → `executeAgentToolCall` por tool_call → resposta final em texto. Se gate off / `apiTools` vazio → **completion plana atual** (fallback).
   - Atenção: o loop usa `ollamaModel` (sem o prefixo `ollama/`) no `create`, mas `modelSupportsTools` recebe o `agent.model` COMPLETO.

**Padrão de teste (sem DB/rede):** mesmas funções puras já existentes. `scripts/v21s2-verify.ts` — casos:
- (a) member `tools:true` em id Ollama suportado → gate on;
- (b) `mcpAllowlist`/`toolSkills`/`filesystem` escopam igual (reusa `selectApiTools` — pode até repetir os asserts do v21s1 pra garantir paridade);
- (c) `rawText` (code-run no Ollama) → gate **off** (não regride);
- (d) id Ollama sem suporte → gate off, completion plana, sem crash;
- (e) `modelSupportsTools('ollama/llama3.1:8b')` → true após o fix; `ollama/<desconhecido>` → false; e o tratamento do prefixo `ollama/` **não muda** os resultados de ids não-ollama (re-assert OpenRouter/Groq pra provar não-regressão).

### Decisões pra confirmar com o usuário ANTES de codar (regra global #2)
1. **Quais modelos Ollama reconhecer como tool-capable** + como `modelSupportsTools` lida com `ollama/` (strip do prefixo + da tag `:`). Recomendado: allowlist conservadora das famílias com tool use no Ollama (llama3.1+/llama3.2/qwen2.5/mistral-nemo/...), default off.
2. **Semântica dos flags** — manter a do V2 S1 (`tools:true` liga; `false` desliga; `toolSkills`/`filesystem` ausentes herdam, `false` excluem; `mcpAllowlist` por `AgentMcpServer.id`). Só confirmar reuso.
3. **Confiabilidade do endpoint Ollama** retornar `tool_calls` para o set escolhido (é best-effort; manter fallback gracioso pra texto).

---

## ⚠️ Gotchas de ambiente desta máquina

- **Na S1.1 funcionaram normalmente:** `npx tsx scripts/v21s1-verify.ts` e `npx tsc --noEmit` (exit 0). Se algo travar com `UNKNOWN read`/errno -4094, é corrupção de `node_modules` pelo OneDrive — não insista, diagnostique.
- **Verificação confiável:** `npx tsx scripts/*.ts` (lógica pura) + `npx tsc --noEmit`. **Não rode jest.** `tsc` pode acusar erros de deps opcionais (bullmq/e2b/xterm/diff2html) — ignorar; o que importa são os arquivos da fatia.
- **Pre-commit hook:** roda **typecheck (gate real — bloqueia)** + **eslint (informativo — NÃO bloqueia)**. O `groq.ts` é legado e cospe dezenas de erros `no-explicit-any`/`prefer-const` **pré-existentes** — o commit passa mesmo assim (a S1.1 passou com 54 desses). **Não "conserte" esses any de passagem.**
- **Commit SELETIVO:** a árvore tem muita coisa não relacionada (logos deletados, vários `docs/**` untracked). **`git add` só nos arquivos da S1.2** (`groq.ts`, `model-capabilities.ts`, `scripts/v21s2-verify.ts`).
- **Gate real = deploy EasyPanel** (push na `main` → redeploya app + worker). **E2E autenticado fica com o usuário.**

## Banco de produção / segredos
- **A S1.2 não precisa de migração** (sem mudança de schema). Se algum dia precisar: host real `sofia_db@2.24.207.200:5435` (o `.env` aponta pra OUTRO host — não usar pra migração); `migrate deploy` MANUAL com `DATABASE_URL` inline **antes** do push.
- 🔐 **Higiene (expostos no chat, rotacionar):** senha Postgres família `PAzo18**` (registrada em `secrets_to_rotate.md`).

---

## O que fazer nesta sessão
1. Ler `ROADMAP.md` (Sprint 1, fatia **S1.2**) + `ANALISE-GAP-V2.1.md` (§4 Tema A') + esta nota. **Confirmar comigo as 3 decisões acima ANTES de codar** (regra global #2).
2. Rodar `npx tsx scripts/v21s1-verify.ts` pra confirmar baseline verde.
3. Implementar a S1.2 **só em `chatWithAgent` (path Ollama) + `model-capabilities.ts`** (coordinators INTACTOS): tratar `ollama/` em `modelSupportsTools`; copiar o bloco-template do Groq pro path Ollama reusando `buildAgentToolDefs`/`selectApiTools`/`executeAgentToolCall`; **preservar `rawText` → completion plana**.
4. `scripts/v21s2-verify.ts` (casos a–e) + `npx tsc --noEmit` limpo. Sem migração.
5. **Commit limpo só da fatia + push na `main`** (= deploy). Mensagem em inglês, terminar com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Parar na S1.2** (não emendar a S1.3).

> Comece confirmando comigo as **3 decisões da S1.2** antes de escrever código.
