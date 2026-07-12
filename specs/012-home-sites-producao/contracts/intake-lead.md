# Contract — POST /api/crm/lead (extensão site-intake)

Proxy público (sem auth) já existente → Sirius CRM `POST {SIRIUS_CRM_URL}/api/v1/contacts`. Esta feature ESTENDE o body de forma retrocompatível; o formulário de `/contato` não muda.

## Request (intake)

```json
{
  "name": "string (obrigatório, ≥2 chars após trim)",
  "email": "string (obrigatório, regex de email)",
  "phone": "string (opcional — WhatsApp)",
  "company": "string (opcional — nome do negócio)",
  "subject": "site-intake",
  "siteType": "landing | institucional | site-blog (opcional)",
  "currentSite": "string url (opcional)",
  "goal": "string texto livre (opcional)",
  "website": "honeypot — DEVE estar vazio; preenchido = bot"
}
```

## Comportamento no servidor

1. Honeypot: `website` não-vazio → responder `200 {ok:true}` SEM forward ao CRM (bot não aprende).
2. Validação existente inalterada: `name` ≥2 chars (400), `email` regex (400).
3. Montagem de `notes` (contexto do brief, tudo opcional):
   `Assunto: site-intake | Tipo de site: {siteType} | Site atual: {currentSite} | Objetivo: {goal} | Mensagem: {message}`
4. Payload ao CRM: `{name, email, phone?, company?, notes?}` — formato atual, sem campo novo no CRM.

## Responses

| Status | Body | Quando |
|--------|------|--------|
| 200 | `{ok: true}` | lead criado no CRM (ou honeypot) |
| 400 | `{error: "Nome obrigatório..."}` / `{error: "Email inválido."}` | validação |
| 500 | `{error: "Configuração interna ausente..."}` | `SIRIUS_CRM_API_KEY` ausente |
| 502/500 | `{error: "..."}` | CRM indisponível/erro (comportamento atual do proxy) |

## Garantia de não-regressão

Requests SEM os campos novos (ContactForm atual) produzem exatamente o payload e as respostas de hoje.
