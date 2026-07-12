# Desacoplar Atendimento — Polaris como cérebro, canais como BYO

**Data:** 2026-06-23
**Status:** Design aprovado (aguardando revisão do spec)
**Origem:** decisão de produto — a Polaris não deve *ser* uma central de atendimento WhatsApp; deve manter só uma "porta aberta" para quem quiser plugar um canal.

---

## 1. Tese

A Polaris para de **ser** uma central de atendimento. Sai do negócio de hospedar
canais pesados (WhatsApp WABA + Evolution API, Instagram) e do inbox de help-desk
herdado da Sofia SDR. Continua leve no que tem valor de distribuição (Telegram,
widget embarcável) e deixa a **porta destrancada** via a API pública de Teams que
já existe: qualquer pessoa pluga o canal dela — inclusive WhatsApp — sem a Polaris
tocar no número, token ou janela de 24h.

Motivações confirmadas pelo dono do produto (todas marcadas): não ser help-desk,
não hospedar a conexão, não manter/investir nisso, não posicionar WhatsApp como
feature de venda.

**Coordinator de Teams (`runTeam`) permanece INTOCADO.** Esta é uma operação de
remoção de periferia; o cerne não é tocado.

---

## 2. Contexto técnico (o que foi mapeado)

Não existe um "módulo WhatsApp" isolado. Existe um **subsistema de atendimento
omnichannel** apoiado em três modelos compartilhados — `Lead`, `Conversation`,
`Message` — alimentado por múltiplos canais:

| Canal | Entrada | Modelos/infra | Destino |
|---|---|---|---|
| WhatsApp WABA (oficial Meta) | `dashboard/whatsapp`, `api/whatsapp/*`, `api/webhook/whatsapp` | `WhatsAppAccount` (exclusivo), `lib/whatsapp-templates`, `lib/whatsapp-cloud-service`, `lib/crypto` (exclusivo) | **REMOVER** |
| WhatsApp Evolution API | card/tipo em `dashboard/integrations` | `Integration` (type `whatsapp`) | **REMOVER (UI/tipo)** |
| Instagram | `api/webhook/instagram`, `integrations/instagram` | `Integration`/`AgentChannel`, `lib/integrations/instagram` | **REMOVER** |
| Telegram | `api/webhook/telegram`, `integrations/telegram` | `Integration`/`AgentChannel`, `lib/integrations/telegram` | **MANTER** |
| Webchat widget | `api/chat/widget`, `ChatWidget`, `integrations/widget` | `Lead`/`Conversation`/`Message` | **MANTER** |

**Consequência crítica:** `Lead`/`Conversation`/`Message`/`Integration`/`AgentChannel`
são compartilhados por Telegram + widget → **NÃO podem ser dropados**. A única
tabela exclusiva do WhatsApp é `WhatsAppAccount`.

Em cima dos modelos compartilhados há leitura por analytics (`api/analytics/{leads,
agents,overview}`, `analytics-collector`, `analytics-nl`), `dashboard/overview` e
`admin/page`. Como os modelos ficam, **analytics não quebra** — apenas reflete
menos volume (só Telegram + widget).

---

## 3. Escopo

### 3.1 SAI

**WhatsApp WABA (oficial):**
- `src/app/dashboard/whatsapp/page.tsx`
- `src/app/api/whatsapp/connect/route.ts`
- `src/app/api/whatsapp/accounts/route.ts`
- `src/app/api/whatsapp/accounts/[id]/route.ts`
- `src/app/api/whatsapp/templates/route.ts`
- `src/app/api/webhook/whatsapp/route.ts`
- `src/lib/whatsapp-templates.ts`
- `src/lib/whatsapp-cloud-service.ts`
- `src/lib/crypto.ts` (usado **só** por whatsapp connect + cloud-service)
- hook `useWhatsAppAccounts` em `src/hooks/use-polaris-api.ts`
- modelo Prisma **`WhatsAppAccount`** + back-relations `User.whatsappAccounts`
  (schema:48) e `Agent.whatsappAccounts` (schema:228)

**WhatsApp Evolution + Instagram (Integrations):**
- na `src/app/dashboard/integrations/page.tsx`: card/tipo `whatsapp` (Evolution — **não
  tem subpágina dedicada**, é só card/tipo) + card/link Instagram
- subpágina `src/app/dashboard/integrations/instagram/page.tsx` (existe)
- `src/app/api/webhook/instagram/route.ts`
- `src/lib/integrations/instagram.ts`

**Inbox de atendimento humano:**
- `src/app/dashboard/conversations/page.tsx`
- `src/app/api/conversations/route.ts` + `[id]/{route,messages,takeover,close,tags,reset}` + `recent`
- `src/app/api/messages/send/route.ts`

**Crons SDR imobiliários (enviam template WhatsApp):**
- `src/app/api/cron/followup/route.ts`
- `src/app/api/cron/calendar-reminders/route.ts`
- `src/app/api/cron/sheets-import/route.ts`
- **passo externo:** desagendar esses 3 no cron-job.org
- **NÃO remover** as integrações `integrations/google-calendar` e `google-sheets`:
  são fontes genéricas que os crons consumiam, mas têm subpáginas/uso próprios e
  **ficam**. Só o acoplamento SDR-WhatsApp (os crons) sai.

**Navegação:**
- `Sidebar.tsx`: item "Conversas" (seção Teams, linha ~84) e "WhatsApp" (seção Distribuição, linha ~120)
- `src/components/ide/command-palette.tsx`: entradas correspondentes

### 3.2 FICA (intacto, salvo um ajuste no Telegram)

- **Telegram**: `api/webhook/telegram`, `lib/integrations/telegram`, `integrations/telegram`.
  - **Ajuste:** neutralizar o botão "Falar com humano" (`human_handoff`) — ele setava
    `handledBy: 'human'` esperando que um humano assumisse pelo inbox; sem inbox vira
    beco sem saída. Remover o botão (ou trocar por mensagem informativa que não promete
    atendimento humano).
- **Webchat widget**: `api/chat/widget`, `ChatWidget`, `integrations/widget`.
- **Modelos** `Lead`/`Conversation`/`Message`/`Integration`/`AgentChannel`.
- **Analytics**, `dashboard/overview`, `admin` — leem os modelos que ficam.
- **Coordinator `runTeam`** — INTOCADO.

### 3.3 A porta aberta (entregável concreto)

Não é só "remover código". A porta é materializada por:
- **Guia** `docs/integracoes/conectar-canal-byo.md` (ou similar): *"Conecte qualquer
  canal (WhatsApp, etc.) à Polaris"* — fluxo inbound `POST /api/v1/teams/[id]/run`
  → resposta via **output webhook** (SP2). A Polaris nunca toca no número; o cliente
  é dono da conexão.
- **Connector de referência:** um exemplo pronto (Make/n8n) ligando WhatsApp ↔ Team.
  Já existem subpáginas `integrations/{make,n8n,zapier}` — o guia pode ancorar nelas
  em vez de criar superfície nova.

---

## 4. Fases (1 fatia/sessão; handoff co-localizado ao fim de cada)

Ordem **repoint-first**: desativar referências vivas antes de deletar, para nunca
deixar um link/consumidor apontando para algo já removido.

- **F1 — Repoint/UI:** neutralizar `human_handoff` no Telegram; remover itens de nav
  no `Sidebar` e `command-palette`; tirar WhatsApp (Evolution) e Instagram da UI de
  `dashboard/integrations` (cards/tipos/links). Nada vivo aponta mais para o que será
  deletado.
- **F2 — WhatsApp WABA:** deletar página/APIs/webhook/libs/hook; remover `WhatsAppAccount`
  e back-relations do `schema.prisma`. (Sem drop ainda — só schema + código.)
- **F3 — Instagram + crons SDR:** deletar `api/webhook/instagram`, `lib/integrations/instagram`
  e os 3 crons; desagendar no cron-job.org.
- **F4 — Inbox:** deletar `dashboard/conversations`, `api/conversations/*` e `api/messages/send`.
- **F5 — Drop da tabela:** **precheck de contagem + inspeção dos dados + backup JSON**
  em `docs/superpowers/backups/`; migração formal `drop_whatsapp_accounts` aplicada
  **MANUAL** via `prisma migrate deploy` no host real `2.24.207.200:5435` **antes** do
  push (regra de migrations do projeto — `db push` do runner standalone falha silencioso).
- **F6 — A porta:** escrever o guia BYO + connector de referência.
- **F7 — Copy pública (deferida, SEO-sensível):** reescrever `(public)/features` e
  `(public)/documentacao` removendo WhatsApp como feature vendida. Sem find-replace
  cego; tratar como conteúdo/SEO.

Cada fase termina com `tsc` limpo + commit + push (cultura do projeto) + handoff.

---

## 5. Riscos & gotchas (fixados no spec)

1. **`Conversation.whatsappChatId`** é nome legado reusado por Telegram/Instagram/widget
   para guardar chat/session id. **Fica como está** — renomear é cosmético e arriscado.
2. **Premissa "zero dados" já traiu antes** (SP6 6g: precheck achou 10 orch + 3 exec
   "demo"). Em F5, contar e olhar os dados de `whatsapp_accounts` antes de dropar; backup
   mesmo se vazio.
3. **`lib/crypto` só é usado pelo WhatsApp** (verificado por grep). Se F2 deixar algum
   import órfão, o build acusa — verificar `tsc` após cada fase.
4. **Telegram menciona "atendimento humano"** apenas no botão; sem o inbox, não há para
   onde encaminhar. F1 resolve antes de F4 remover o inbox.
5. **Analytics e dashboard/overview** leem os modelos que ficam — não quebram, mas os
   números caem (esperado). Não mexer em analytics neste spec.
6. **Coordinator intocado** — nenhuma fase edita `runTeam`.

---

## 6. Verificação por fase

- `npx tsc --noEmit` limpo após cada fase (jest não roda local — OneDrive; gate é CI).
- Grep de regressão ao fim: `prisma.whatsAppAccount` e imports de `@/lib/crypto`,
  `@/lib/whatsapp-*`, `@/lib/integrations/instagram` = **0** em `src/`.
- Grep `dashboard/(whatsapp|conversations)` em `src/` = **0** após F4.
- Telegram + widget continuam respondendo (E2E manual em prod, com o usuário).
- F5: confirmar tabela `whatsapp_accounts` inexistente e `conversations`/`leads`/
  `messages`/`integrations` preservadas no host real.

---

## 7. Fora de escopo (YAGNI)

- Renomear `whatsappChatId`, `whatsapp_chat_id` ou qualquer coluna legada.
- Mexer em analytics, `dashboard/overview`, `admin`.
- Tocar no coordinator ou em qualquer feature de Teams.
- Construir um connector hospedado pela Polaris (a porta é BYO via API existente).
