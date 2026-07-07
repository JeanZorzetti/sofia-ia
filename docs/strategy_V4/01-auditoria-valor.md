# Auditoria de Valor — Tudo que a Polaris Entrega (V4)

> Data: 2026-07-07
> Insumos: `docs/Features/features.md` (180+ features), `CLAUDE.md` (hierarquia do cerne ao periférico), `docs/strategy_V2.5/01-diagnostico-posicionamento.md` (crítica 3/10), código em `src/app/`.
> Decisão que esta auditoria serve: **tudo continua disponível, mas a home passa a vender UMA coisa só** (ver `03-home-sites.md`).

---

## Metodologia

Cada bloco de features foi classificado em 5 camadas de valor:

| Camada | Critério |
|--------|----------|
| **Motor** | Ativo difícil de copiar, comprovado em uso real, é O produto |
| **Substrato** | Não vende sozinho, mas o Motor não funciona sem ele |
| **Commodity** | Funciona, mas mercados inteiros (n8n, Make, Zapier) já fazem melhor — manter, não investir |
| **Legado Sofia** | Herança do produto de atendimento imobiliário — valor real p/ nicho, fora da tese |
| **Infra à frente da demanda** | Enterprise/monetização construída antes de existir cliente que exija |

---

## 1. Motor — o ativo único

**Teams (orquestração multi-agente com código real)** — lead → workers → reviewer, execução em repo git de verdade (modo PR ou push direto), executor vps-local, agendamento cron, API pública, templates, output webhooks. Coordinator `runTeam` estável através de todos os ciclos (SP1–SP6, V2, V2.1, V2.2) por regra de extensão-por-injeção.

Somam-se ao motor as entregas de junho:
- **Empresas Agênticas (005/006)** — organograma, governança RACI/SDLC, roster de 13 cargos, execução sequencial via Company.
- **Squads por caso de uso (009)** — fila global WIP=1 com advisory lock, blueprints por nicho, seed idempotente, UI de galeria.
- **Resiliência (007/008)** — pool de contas esgotado → run `blocked`/`rate_limited` com retomada, não morte.
- **Diff de review isolado por task (010)** — reviewer julga cada task pelo próprio diff (fix da rejeição em cascata).

**Por que é único:** nenhum builder no-code do mercado entrega "um time de agentes com dev + reviewer + git + deploy próprio". Lovable/Base44/v0 entregam UM modelo gerando código sem revisão estruturada. O motor da Polaris tem separação de papéis, loop de review e resiliência operacional.

**Evidência de valor (uso real, não hipótese):**
- Estética Fábrica: squad construiu e shipou `estetia.estetiacrm.com.br` (landing B2B + demo).
- Roster ROI Labs: 13 cargos staffed rodando em produção.
- O próprio desenvolvimento da Polaris consome o motor (dogfooding contínuo).

**Limite honesto:** o motor roda com claude-cli por assinatura (pool de contas) — o gargalo de escala é rate limit do pool, não tecnologia. Escalar uso externo = somar contas ou repensar custo por run.

---

## 2. Substrato — mantém porque o Motor precisa

| Bloco | O que é | Veredito |
|-------|---------|----------|
| Agents (CRUD, prompt, modelo, memória, delegação, modo cognitivo) | A matéria-prima dos Teams | Manter; é o que o usuário configura |
| Skills + Plugins JS | Ferramentas dos agentes | Manter; investimento só puxado por caso de uso |
| MCP servers | Extensibilidade padrão de mercado | Manter; aposta certa (MCP virou padrão) |
| Models / multi-provider | 50+ modelos, Groq/OpenRouter/Ollama/CLI | Manter; "multi-modelo" é argumento anti-lock-in |
| Knowledge Base RAG (pgvector, Drive sync) | Contexto dos agentes | Manter; commodity tecnicamente, mas diferencia squads (site com conteúdo do cliente) |
| Files | Suporte à KB | Manter |

---

## 3. Commodity — disponível, sem investimento novo

| Bloco | Realidade de mercado | Veredito |
|-------|----------------------|----------|
| Workflows visuais (React Flow, 13 features) | n8n/Make/Zapier dominam com ecossistemas gigantes; ninguém migra por causa disso | Congelar. Manter funcionando; node `action_team` é a única parte estratégica (ponte p/ o Motor) |
| Integrações (15+: HubSpot, Salesforce, TOTVS, Sheets…) | Tabela de logos; nenhuma é motivo de compra | Manter as que funcionam; não adicionar novas sem cliente pedindo |
| Templates / Marketplace | Distribuição interna útil, marketplace sem oferta externa real | Manter como biblioteca; "marketplace" é narrativa futura |
| A/B tests de agentes | Sofisticação sem usuários para usá-la | Congelar |
| Analytics / Monitoring / NPS | Higiene de produto | Manter |

---

## 4. Legado Sofia — atendimento (fora da tese, valor de nicho)

Conversas & Leads (inbox multicanal, score, handoff humano), WhatsApp (Evolution + WABA multi-tenant, janela 24h, HSM), Instagram DM, Telegram, Voz, Widget web, Threads (campanhas, calendário, insights).

- É um produto inteiro de atendimento dentro da plataforma — herança da Sofia imobiliária.
- WhatsApp WABA já está declarado **menor prioridade** no CLAUDE.md.
- **Veredito:** continua disponível (há lógica não-trivial ali: janela de 24h, criptografia de credenciais, multi-tenant por número), mas sai de qualquer narrativa da home. Se um dia houver tração, vira produto irmão — não dilui o posicionamento principal.

---

## 5. Infra à frente da demanda — pronta para quando houver cliente

Billing Mercado Pago (freemium, enforcement de cota), Whitelabel/sub-tenants, Organizations/SSO/forçar-SSO, RBAC, Audit log, API keys com escopo + rate limit, Compliance logging, Admin panel com impersonação.

- **Veredito:** é o que permite fechar um cliente enterprise/agência amanhã sem 3 meses de retrabalho. Custo de manutenção baixo (está pronto). Nada disso vai para a home; aparece em `/enterprise` e `/whitelabel`.

---

## 6. O problema que a auditoria expõe

1. **Superfície ∝ confusão:** 40 páginas públicas, 70+ telas de dashboard, 176+ rotas de API, 180+ features — e a home tenta resumir tudo ("pipelines visuais, RAG semântico, IDE multi-modelo, canais integrados"). Resultado documentado: crítica externa 3/10, "abstração que já existe".
2. **O diagnóstico V2.5 nunca foi aplicado:** a home em produção ainda contém, palavra por palavra, o copy condenado em fevereiro ("Mais simples que CrewAI. Mais completo que AutoGen.", "Começar Grátis — sem cartão"). O problema não é falta de diagnóstico, é falta de execução do reposicionamento.
3. **O único bloco com evidência de valor real (Motor) é invisível na home:** quem chega em polarisia.com.br não descobre que um time de agentes com reviewer e git shipa software de verdade — que é exatamente o que nenhum concorrente faz.

**Conclusão:** a Polaris não precisa de mais features; precisa que a home venda o Motor através de UM caso de uso concreto e comprável. O caso escolhido: **sites** (ver `02-criticas-concorrentes.md` para o espaço deixado pelos concorrentes e `03-home-sites.md` para a proposta).
