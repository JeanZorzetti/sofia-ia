# Env vars da migração WABA — setar no EasyPanel

> Checklist do que precisa estar no ambiente de produção (EasyPanel → projeto sofia → Environment).
> Os valores vêm da **Fase 0** (setup na Meta, ver `META-SETUP.md`). Segredos **nunca** no git.

## Obrigatórias (sem elas a WABA não funciona)

| Env var | Para que serve | Fase | Onde obter |
|---|---|---|---|
| `ENCRYPTION_KEY` | Cripto AES-256-GCM do access token em repouso. **Sem ela, `resolveAccount` não descriptografa → ninguém responde.** | 1 | Gerar: `openssl rand -base64 32` |
| `META_APP_SECRET` | Valida a assinatura `X-Hub-Signature-256` do webhook + troca do `code` no Embedded Signup | 1–2 | Meta App → Configurações → Básico → Chave Secreta do App |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Token que a Meta usa pra verificar o webhook (GET `hub.challenge`) | 1 | Você define (string forte); o **mesmo** valor vai no painel da Meta |
| `WHATSAPP_API_VERSION` | Versão da Graph API usada nas chamadas | 1 | Fixo, ex.: `v21.0` |
| `META_APP_ID` | Troca do `code` por token (server-side) no Embedded Signup | 2 | Meta App → Configurações → Básico → ID do App |
| `NEXT_PUBLIC_META_APP_ID` | Inicialização do Facebook JS SDK no browser | 2 | Mesmo valor de `META_APP_ID` (é público) |
| `NEXT_PUBLIC_META_CONFIG_ID` | `config_id` do Embedded Signup no `FB.login` | 2 | Meta App → Facebook Login for Business → Configurações → Configuration ID |

## Opcionais / já existentes (relevantes pro fluxo)

| Env var | Para que serve | Status |
|---|---|---|
| `OPENAI_API_KEY` | Descrição de imagem (Vision). Sem ela, imagem cai no fallback (só legenda) | Opcional |
| `GROQ_API_KEY` | Transcrição de áudio (Whisper) + respostas da IA | Já existe |
| `CRON_SECRET` | Auth dos crons de follow-up / lembretes (Fase 3) | Já existe |
| `NEXT_PUBLIC_APP_URL` | Base URL (usada em vários lugares) | Já existe |
| `REDIS_URL` *(ou Upstash)* | Buffer de debounce durável multi-instância. Sem Redis, usa cache em memória (funciona, menos robusto) | Opcional |

## Templates HSM (Fase 3 — opcionais, têm default)

Nomes dos templates aprovados usados pelas mensagens proativas. Se não setar, usa o default
(que precisa existir e estar **aprovado** na Meta, ver `META-SETUP.md`).

| Env var | Default | Usado por |
|---|---|---|
| `WHATSAPP_TEMPLATE_LANG` | `pt_BR` | Todos os templates |
| `WHATSAPP_FOLLOWUP_TEMPLATE` | `followup_pt` | `cron/followup` (fora da janela de 24h). Param: {{1}}=primeiro nome |
| `WHATSAPP_REMINDER_TEMPLATE` | `appointment_reminder_pt` | `cron/calendar-reminders`. Params: {{1}}=evento, {{2}}=quando, {{3}}=link |
| `WHATSAPP_GREETING_TEMPLATE` | `greeting_pt` | `cron/sheets-import` (cold outreach). Param: {{1}}=primeiro nome |
| `WHATSAPP_REGISTER_PIN` | `000000` | PIN de verificação em 2 etapas no registro do número (Embedded Signup) |

## Removido na Fase 4 (decomissão do Evolution — concluída)

`EVOLUTION_API_URL` e `EVOLUTION_API_KEY` não são mais usadas — pode remover do EasyPanel.

---

### Resumo pra colar (preencher os valores)

```env
ENCRYPTION_KEY=
META_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_API_VERSION=v21.0
META_APP_ID=
NEXT_PUBLIC_META_APP_ID=
NEXT_PUBLIC_META_CONFIG_ID=
```
