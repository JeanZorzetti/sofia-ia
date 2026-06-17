# Fase 0 — Setup na Meta (WABA Embedded Signup, multi-tenant)

> Checklist operacional para o Polaris virar **Tech Provider** da WhatsApp Cloud API e oferecer
> conexão self-service de número (Embedded Signup) aos clientes. **Não tem código** — é configuração
> no Meta Business + Meta for Developers. É **pré-requisito bloqueante** das Fases 1–3 e algumas
> etapas levam **dias a semanas** (verificação de negócio, App Review). Comece já, em paralelo.
>
> ⚠️ **Segredos nunca no git.** Todos os IDs/tokens coletados aqui vão para o **EasyPanel (env vars)**.
> Os rótulos exatos da UI da Meta mudam com frequência — confirme contra a doc oficial vigente:
> https://developers.facebook.com/docs/whatsapp/embedded-signup

---

## Visão geral do modelo (Tech Provider)

- O **cliente** é dono da própria WhatsApp Business Account (WABA) e do número; **ele paga a Meta**
  (adiciona método de pagamento no WhatsApp Manager dele).
- O **Polaris** (nosso app/business) recebe acesso compartilhado à WABA do cliente via Embedded Signup
  e envia/recebe mensagens em nome dele.
- Resultado por cliente: um `waba_id` + `phone_number_id` + token de acesso → gravados em
  `WhatsAppAccount` (Fase 1).

```
Cliente clica "Conectar WhatsApp" no dashboard Polaris
   → popup Embedded Signup (login Meta do cliente)
   → cliente cria/seleciona WABA + número, define método de pagamento
   → Meta devolve um `code` (+ session info: waba_id, phone_number_id)
   → backend Polaris troca `code` por token, registra o número e assina o webhook
   → grava WhatsAppAccount
```

---

## Pré-requisitos
- [ ] Conta **Meta Business** (business.facebook.com) da ROI Labs com papel de **admin**.
- [ ] Acesso a **Meta for Developers** (developers.facebook.com) com a mesma conta.
- [ ] Domínio de produção no ar com HTTPS: `https://polarisia.com.br`.
- [ ] Decidir o **e-mail/responsável** que conduz a verificação (recebe pendências da Meta).

---

## 1. Business Verification *(leva dias; faça primeiro)*
- [ ] Meta Business Suite → **Configurações do Negócio → Centro de Segurança / Verificação do Negócio**.
- [ ] Submeter documentos da ROI Labs (CNPJ, comprovante de endereço, etc.).
- [ ] Aguardar aprovação. **Sem isso, Advanced Access e produção não liberam.**

## 2. Criar o App na Meta for Developers
- [ ] developers.facebook.com → **Criar App** → tipo **Business**.
- [ ] Vincular o App ao **Business** verificado no passo 1.
- [ ] Anotar o **App ID** e o **App Secret** (Configurações → Básico).
  - → `META_APP_ID` / `NEXT_PUBLIC_META_APP_ID` (o ID pode ser público) e `META_APP_SECRET` (secreto).
- [ ] Em Configurações → Básico, preencher: Política de Privacidade, URL do app, ícone, categoria.

## 3. Adicionar produtos ao App
- [ ] Adicionar produto **WhatsApp**.
- [ ] Adicionar produto **Facebook Login for Business** (necessário pro Embedded Signup).

## 4. Configurar o Embedded Signup (gera o `config_id`)
- [ ] Em **Facebook Login for Business → Configurações → Configurações** (Configurations), criar uma
      nova **configuração** do tipo **WhatsApp Embedded Signup**.
- [ ] Permissões da configuração: `whatsapp_business_management`, `whatsapp_business_messaging`
      (e `business_management` se necessário).
- [ ] Token type: **Code** (vamos trocar `code` por token no backend).
- [ ] Salvar e anotar o **Configuration ID**.
  - → `META_EMBEDDED_SIGNUP_CONFIG_ID` / `NEXT_PUBLIC_META_CONFIG_ID`.
- [ ] **Domínios permitidos**: adicionar `polarisia.com.br` (e domínio de preview, se usar) na
      whitelist de OAuth/redirect do Facebook Login.

## 5. System User token *(para gestão/admin das contas compartilhadas)*
- [ ] Business Settings → **Usuários → Usuários do Sistema** → criar um **System User** (papel Admin).
- [ ] Gerar token com escopos `whatsapp_business_management` + `whatsapp_business_messaging`.
- [ ] Marcar como **token permanente** (System User não expira como token de usuário).
  - → guardar como fallback de gestão (ex.: assinar webhook, listar templates). O token por-cliente
    vem do code-exchange do Embedded Signup; o System User é o plano B para operações administrativas.

## 6. Webhook
- [ ] App Dashboard → **WhatsApp → Configuração (Configuration)**.
- [ ] **Callback URL**: `https://polarisia.com.br/api/webhook/whatsapp`.
- [ ] **Verify Token**: definir uma string forte → `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (mesma no EasyPanel).
      O endpoint GET já responde o `hub.challenge` (`src/app/api/webhook/whatsapp/route.ts`).
- [ ] Assinar o campo **`messages`** (e opcionalmente `message_template_status_update` para Fase 3).
- [ ] Validar: ao salvar, a Meta bate no GET e deve dar **verde**. (Subir o env no EasyPanel antes.)

## 7. Número de teste + primeiro template *(para validar Fases 1 e 3)*
- [ ] Em **WhatsApp → Primeiros Passos**, usar o **número de teste** que a Meta fornece (não precisa
      de número real para o primeiro teste reativo da Fase 1).
- [ ] Anotar `phone_number_id` e `waba_id` do número de teste (para um seed manual em `WhatsAppAccount`).
- [ ] Criar **1 template utilitário** (categoria **Utility**), idioma `pt_BR`, ex. `followup_pt`
      com corpo tipo: `Olá {{1}}, passando para ver se ainda posso te ajudar 😊` → submeter para aprovação.
- [ ] (Opcional) Template de lembrete com 2 variáveis (resumo do evento + link) para a Fase 3.

## 8. App Review / Advanced Access *(leva dias; depende do passo 1)*
- [ ] App Dashboard → **App Review → Permissions and Features**.
- [ ] Solicitar **Advanced Access** para `whatsapp_business_management` e `whatsapp_business_messaging`.
- [ ] Solicitar a verificação de **Tech Provider** (se exigida para o Embedded Signup self-serve).
- [ ] Sair do **Modo de Desenvolvimento** → **Live** quando tudo aprovado.

---

## Saídas desta fase (preencher no EasyPanel ao final)

| Env var | Origem | Público? |
|---|---|---|
| `META_APP_ID` | Passo 2 | sim (`NEXT_PUBLIC_META_APP_ID`) |
| `META_APP_SECRET` | Passo 2 | **NÃO** |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Passo 4 | sim (`NEXT_PUBLIC_META_CONFIG_ID`) |
| `WHATSAPP_API_VERSION` | fixa (ex.: `v21.0`) | — |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Passo 6 (você define) | **NÃO** |
| `ENCRYPTION_KEY` | gerar (32 bytes, base64) p/ cripto do token | **NÃO** |
| (System User token) | Passo 5 | **NÃO** |

Dados do número de teste (Passo 7), para seed manual em `WhatsAppAccount` ao testar a Fase 1:
- `waba_id`: ________________
- `phone_number_id`: ________________
- token de teste (temporário, 24h): ________________

---

## Critério de conclusão da Fase 0
1. Business **verificado**.
2. Webhook **verde** no painel da Meta (GET `hub.challenge` OK contra produção).
3. Advanced Access concedido para as duas permissões de WhatsApp.
4. `config_id` do Embedded Signup criado e domínio na whitelist.
5. Pelo menos **1 template aprovado** + número de teste com `phone_number_id`/`waba_id` anotados.
6. Todas as env vars da tabela acima preenchidas no EasyPanel.

> Quando isso fechar, seguimos para a **Fase 1** (modelo `WhatsAppAccount` + serviço multi-tenant).
> Ver `docs/Wpp/PLANO-MIGRACAO-WABA.md`.
