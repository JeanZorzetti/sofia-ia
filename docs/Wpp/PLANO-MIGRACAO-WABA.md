# Plano: Migração WhatsApp Evolution API → WABA (Cloud API oficial, multi-tenant)

> Status: **Fases 1-4 ENTREGUES (código) e deployadas.** Migração
> `20260617170000_add_whatsapp_accounts` aplicada no host real `sofia_db@2.24.207.200:5435`.
> Evolution **removido**. Schema todo na Fase 1 → Fases 2-4 foram código puro (sem migração).
> **Pendente:** Fase 0 na Meta (verificação/Embedded Signup/templates aprovados) + env vars no
> EasyPanel (`ENV-VARS.md`) → só então a validação E2E ao vivo (número conectado) roda.

## Context

O Polaris IA (sofia-next) usa hoje a **Evolution API** (Baileys self-hosted, não-oficial) como
transporte de WhatsApp: conexão por QR code, múltiplas "instâncias", sem restrições de janela.
Isso traz risco de ban (API não-oficial), instabilidade de QR e zero garantia de SLA — inaceitável
para um SaaS de atendimento que cobra dos clientes.

A decisão é **pivotar para a WhatsApp Business Cloud API oficial da Meta (WABA)**, no modelo
**multi-tenant via Embedded Signup**: cada cliente conecta o próprio número, o Polaris atua como
**Tech Provider / Solution Partner**. Inclui **templates HSM + gating de janela de 24h** (mensagens
proativas) e **remoção completa do Evolution** (rip-and-replace).

**Ponto de partida favorável:** já existe `src/lib/whatsapp-cloud-service.ts` + webhook
`src/app/api/webhook/whatsapp/route.ts` — porém **single-tenant** (lê 1 número de `WHATSAPP_*` do env,
feito para o Prolife) e sem várias features que o Evolution tem. A migração reaproveita esse núcleo,
torna-o multi-tenant e porta as features faltantes.

---

## Estado atual (mapa de impacto)

### Caminho Evolution (a remover)
| Arquivo | Papel |
|---|---|
| `src/lib/evolution-service.ts` | Serviço completo: instâncias, sendMessage, processWebhook, buffer, áudio, visão, treino, keywords |
| `src/app/api/webhook/evolution/route.ts` | Receptor de webhook Baileys |
| `src/app/api/instances/route.ts` + `[name]/{connect,qrcode,state,restart,presence,logout,route}.ts` | Ciclo de vida de instância/QR (8 rotas) |
| `src/app/dashboard/whatsapp/page.tsx` | UI de instâncias + QR code |

### Consumidores de `evolution-service` que precisam ser repontados ANTES de deletar (lição "repoint-first" do SP6)
- `sendMessage` → `api/messages/send`, `api/cron/followup`, `api/cron/sheets-import`, `api/cron/calendar-reminders`
- `fetchInstances` (saúde/contagem) → `api/whatsapp/stats`, `api/dashboard/overview`, `api/conversations/recent`
- Front: `src/hooks/use-polaris-api.ts` (`useWhatsAppInstances`, `useWhatsAppStats`)

### Caminho WABA existente (a evoluir)
- `src/lib/whatsapp-cloud-service.ts` — `sendWhatsAppMessage`, `markMessageRead`, `downloadWhatsAppMedia`, `transcribeAudio`, `processCloudWebhook`, `handleIncomingMessage` (**já suporta Teams** via `answerConversationWithTeam`). Single-tenant (env).
- `src/app/api/webhook/whatsapp/route.ts` — GET verify (`hub.challenge`) + POST (responde 200 e processa async).

### Features que o Evolution tem e o WABA atual NÃO tem (portar)
1. **Buffer de debounce** (`src/lib/message-buffer.ts`, `pushToBuffer`, 10s) — agrupa mensagens rápidas em 1 resposta.
2. **Visão de imagem** (`describeWhatsAppImage`, GPT-4o-mini).
3. **Treino via WhatsApp** (prefixo `TreinoIA1212:` → KnowledgeBase + vetorização).
4. **Keywords de pausa/reativação** (`isPauseKeyword`/`isReactivationKeyword`, `handledBy` human↔ai).

---

## Decisões de arquitetura

1. **Tenancy: multi-tenant via Embedded Signup.** Cada cliente conecta o próprio número. Polaris = Tech Provider.
2. **Roteamento por `phone_number_id`.** O webhook da Meta entrega `entry[].changes[].value.metadata.phone_number_id`. Novo modelo **`WhatsAppAccount`** indexado por `phoneNumberId @unique` resolve credenciais + agente dono. Substitui o lookup global `config.provider === 'meta-cloud-api'`.
3. **Credenciais por tenant, não por env.** Funções do serviço passam a receber a conta (`phoneNumberId` + `accessToken`) como parâmetro. Token **criptografado em repouso** (AES-256-GCM; reaproveitar padrão de `src/lib/api-key-auth.ts`, chave em `ENCRYPTION_KEY`).
4. **Templates + janela 24h.** Mensagens proativas (follow-up, lembretes) fora de 24h da última mensagem **recebida** exigem template HSM aprovado. Adicionar `Conversation.lastInboundAt` para o gate barato nos crons.
5. **Verificação de assinatura.** Validar `X-Hub-Signature-256` (HMAC-SHA256 do corpo cru com `META_APP_SECRET`) no webhook — refatorar para ler `request.text()` antes de parsear.
6. **Sem camada de abstração de provider** (decisão "remover Evolution agora"): o serviço é WABA puro.

### Novo modelo Prisma (sketch)
```prisma
model WhatsAppAccount {
  id                 String   @id @default(uuid()) @db.Uuid
  userId             String   @map("user_id") @db.Uuid
  agentId            String?  @map("agent_id") @db.Uuid   // agente que responde neste número
  wabaId             String   @map("waba_id") @db.VarChar(64)
  phoneNumberId      String   @unique @map("phone_number_id") @db.VarChar(64)
  displayPhoneNumber String?  @map("display_phone_number") @db.VarChar(32)
  verifiedName       String?  @map("verified_name") @db.VarChar(255)
  accessToken        String   @map("access_token") @db.Text  // criptografado
  status             String   @default("connected") @db.VarChar(20)
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt          DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()

  @@index([userId])
  @@index([agentId])
  @@map("whatsapp_accounts")
}
// + Conversation.lastInboundAt DateTime? @map("last_inbound_at") @db.Timestamptz()
```

### Env vars
- **Adicionar:** `META_APP_ID`, `META_APP_SECRET`, `META_EMBEDDED_SIGNUP_CONFIG_ID`, `WHATSAPP_API_VERSION` (ex: `v21.0`), `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_META_APP_ID`, `NEXT_PUBLIC_META_CONFIG_ID`.
- **Remover:** `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`. Manter `WHATSAPP_*` legadas só se Prolife continuar single-tenant no mesmo deploy (confirmar).

---

## Fase 0 — Setup na Meta (ops, sem código) — PRÉ-REQUISITO BLOQUEANTE

Embedded Signup multi-tenant exige aprovações que levam dias/semanas. Começar já.
1. **Meta Business verification** da conta da ROI Labs.
2. **App na Meta** (developers.facebook.com) com produto **WhatsApp** + **Facebook Login for Business**.
3. **Tech Provider / Solution Partner**: habilitar Embedded Signup e criar a **configuração** (`config_id`).
4. **System User token** (permanente) para o app gerenciar contas dos clientes.
5. **Webhook** apontando para `https://polarisia.com.br/api/webhook/whatsapp`, subscrição do campo `messages`.
6. **Número de teste** + **1 template utilitário aprovado** (ex: `followup_pt`) para validar Fase 3.
7. Revisão de **App Review** (permissões `whatsapp_business_management`, `whatsapp_business_messaging`).

Entregável: `docs/Wpp/META-SETUP.md` com o passo a passo + IDs/segredos (segredos só no EasyPanel, não no git).

---

## Fase 1 — Modelo de dados + serviço WABA multi-tenant

- **Migração formal** (`prisma migrate`, nunca `db execute`): `WhatsAppAccount` + `Conversation.lastInboundAt` + índices. **Aplicar manual com `migrate deploy` no host de prod ANTES do push** (gotcha conhecido: standalone do Next não roda `db push`/CLI Prisma). ⚠️ Confirmar host real: CLAUDE.md diz `31.97.23.166:5499`; memória recente cita `2.24.207.200:5435` (sofia_db) — validar antes.
- Helper de cripto `src/lib/crypto.ts` (`encrypt`/`decrypt` AES-256-GCM, `ENCRYPTION_KEY`) — ou reusar de `api-key-auth.ts`.
- Refatorar `whatsapp-cloud-service.ts`:
  - `resolveAccount(phoneNumberId)` → carrega `WhatsAppAccount` + descriptografa token.
  - `sendWhatsAppMessage(account, to, text)` / `markMessageRead(account, id)` / `downloadWhatsAppMedia(account, mediaId)` — parametrizar por conta.
  - `processCloudWebhook(body)` → para cada change, resolver conta pelo `metadata.phone_number_id`, achar o agente da conta (não mais lookup global), processar.
  - Atualizar `Conversation.lastInboundAt = now()` ao receber mensagem do usuário.
  - **Portar do Evolution:** buffer (`pushToBuffer`), visão de imagem, treino `TreinoIA1212:`, keywords pausa/reativação.
- Verificação de assinatura `X-Hub-Signature-256` em `api/webhook/whatsapp/route.ts`.

**Critério:** webhook recebe msg → resolve conta correta por `phone_number_id` → responde com o agente certo (validado com número de teste da Fase 0).

---

## Fase 2 — Onboarding por Embedded Signup

- Front (nova página, substitui a de QR): botão Embedded Signup com **Facebook JS SDK** (`FB.login` + `config_id`) → retorna `code`.
- `POST /api/whatsapp/connect`: troca `code`→token (`/oauth/access_token` com app secret), lê `waba_id`/`phone_number_id`, **registra o número** (`POST /{phone_number_id}/register` com PIN), **assina o webhook** (`POST /{waba_id}/subscribed_apps`), grava `WhatsAppAccount` (token criptografado) e vincula ao agente.
- `GET/DELETE /api/whatsapp/accounts`: listar/desconectar números.
- Nova UI `dashboard/whatsapp/page.tsx`: lista de números conectados (nome verificado, status, agente vinculado) + conectar/desconectar. Remove todo o conceito de QR/instância.

**Critério:** conectar um número real pelo dashboard ponta a ponta; aparece como `connected`.

---

## Fase 3 — Templates HSM + proativo com janela de 24h

- `src/lib/whatsapp-templates.ts`: `listTemplates(account)` (`GET /{waba_id}/message_templates`), `sendWhatsAppTemplate(account, to, name, lang, components)`.
- Gate de 24h nos crons (usa `Conversation.lastInboundAt`):
  - `api/cron/followup`: dentro de 24h → texto livre (atual); fora → template aprovado de follow-up.
  - `api/cron/calendar-reminders`: lembretes são sempre proativos → **template com variáveis** (resumo do evento + link Meet) nas janelas 2h/5min.
- UI de gestão de templates (listar aprovados; escolher qual o follow-up/lembrete usa).

**Critério:** follow-up fora da janela entrega via template aprovado sem erro `#131047`/`#470`.

---

## Fase 4 — Decomissionar Evolution + repontar consumidores + docs

Ordem **repoint-first** (deletar só depois que ninguém importa):
1. Repontar `messages/send`, `cron/sheets-import` → `sendWhatsAppMessage(account, ...)` (conta resolvida via agente/conversa).
2. Repontar `whatsapp/stats`, `dashboard/overview`, `conversations/recent` → contar números de `WhatsAppAccount` (DB) e mensagens do DB, em vez de `fetchInstances()` (saúde Evolution).
3. Substituir `useWhatsAppInstances`/QR no `use-polaris-api.ts` por hook de contas WABA.
4. **Deletar:** `evolution-service.ts`, `api/webhook/evolution`, `api/instances/**` (8 rotas), env Evolution.
5. **Docs/CLAUDE.md:** trocar "WhatsApp: Evolution API" → "WABA Cloud API"; remover gotchas Evolution, adicionar gotchas WABA (janela 24h, templates, `phone_number_id` routing, assinatura). Repontar copy de marketing que cita "instância/QR".

**Critério:** `grep evolution-service` = 0; build limpo; sem rota órfã.

---

## Gotchas WABA a documentar (novos)
- **Janela de 24h**: texto livre só dentro de 24h da última msg do cliente; fora → só template.
- **Templates**: precisam aprovação Meta (horas–dias); variáveis posicionais `{{1}}`; categorias utility/marketing/auth com pricing distinto.
- **Webhook < 20s**: responder 200 imediato e processar async (já feito); deduplicar por `message.id`.
- **Token**: System User token permanente; tokens de usuário expiram — preferir System User. Criptografar em repouso.
- **`messaging_product: 'whatsapp'`** obrigatório em todo payload de envio.
- **Pricing por conversa/mensagem**: relevante para precificação do plano (fora deste escopo técnico, sinalizar a produto).

---

## Verificação end-to-end
1. **Fase 0** validada quando o webhook GET retorna o `hub.challenge` no painel da Meta.
2. **Reativo**: enviar msg do número de teste → conferir lead/conversa criados, resposta da IA chegando no WhatsApp, `lastInboundAt` atualizado.
3. **Áudio/imagem/treino/keywords**: testar cada feature portada.
4. **Onboarding**: conectar número real pelo dashboard; confirmar `WhatsAppAccount` gravado e webhook assinado.
5. **Templates/24h**: forçar conversa com `lastInboundAt` > 24h e rodar `cron/followup` (Bearer `CRON_SECRET`) → template entregue.
6. **Decomissão**: `grep -r evolution-service src/` vazio; `next build` limpo; smoke test do dashboard.
7. Validação real só em prod (EasyPanel + número conectado) — login autenticado.

> Regra do usuário: **1 fase por sessão**, commit+push ao fechar cada uma, sem auto-avançar.
