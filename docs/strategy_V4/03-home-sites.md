# Home V4 — Uma Coisa Só: Sites (proposta)

> Data: 2026-07-07. Depende de `01-auditoria-valor.md` (o Motor é o único ativo com evidência) e `02-criticas-concorrentes.md` (o espaço que Lovable/Base44/Stitch deixaram aberto).
> Princípio acordado: **nada é removido da plataforma** — dashboard, docs, enterprise, whitelabel, tudo continua acessível. Só a home muda de "vender tudo" para "vender uma coisa".

---

## 1. Posicionamento

**Categoria própria:** *"Sites feitos por um time de agentes de IA que revisa o próprio trabalho — código seu, em produção, desde o dia 1."*

Não é "orquestração de agentes" (jargão condenado no V2.5), não é "vibe coding" (categoria agora associada a créditos queimados e vulnerabilidades), não é "site builder" (Wix/Squarespace). É a lacuna exata que a pesquisa mostrou: **todo mundo entrega protótipo; ninguém entrega produção.**

**ICP primário:** dono de negócio ou agência que precisa de um site que gere resultado (aparecer no Google e nas respostas de IA) — e que já tentou ou já ouviu falar dos builders de IA. A dor não é "não consigo fazer um site"; é "o site que a IA me deu não indexa, quebrou, e me cobrou por cada tentativa de conserto".

**Regra do V2.5 mantida:** problema primeiro, solução depois. Os concorrentes só aparecem em UMA seção dedicada, com fatos publicados e fonte — nunca no hero (o erro "mais simples que CrewAI" não se repete).

## 2. Mapa crítica → mensagem (o esqueleto do copy)

| Dor documentada (02) | Mensagem Polaris | Prova |
|----------------------|------------------|-------|
| "Conserta um, quebra outro" | Aqui quem escreve não é quem aprova: todo site passa por um agente revisor, task a task | Arquitetura lead→dev→reviewer, diff isolado por task |
| Créditos queimados em loop | Preço por entrega, não por prompt. Retrabalho é problema nosso | Modelo comercial (§5) |
| 70% do caminho, protótipo eterno | Entregamos os 100%: repositório git + site em produção no seu domínio | Sites reais no ar (estetia.estetiacrm.com.br) |
| Vulnerabilidades da plataforma-mãe (RLS/auth bypass) | Seu site não "roda dentro" de plataforma nenhuma: é um site próprio, estático/SSR, sem backend compartilhado | Arquitetura de entrega |
| SPA invisível pro Google | HTML de verdade: SSR/SSG, sitemap, schema.org, otimizado para Google E para respostas de IA (GEO/AEO) | Playbook GEO/AEO da ROI Labs aplicado |
| Lock-in / export com fricção | O repositório é seu desde o primeiro commit. Cancele e leve tudo | Modo git nativo do Motor |
| Design "cara de IA" | Design system por projeto, não template default | Portfolio |
| Suporte distante | Humano no loop em toda entrega (fase concierge) | Processo |

## 3. Estrutura da nova home (seção a seção)

1. **Hero** — problema primeiro:
   - H1 (candidata): **"Sites de produção, não protótipos."**
   - Sub: "Um time de agentes de IA — desenvolvedor, revisor e líder técnico — constrói seu site, revisa cada mudança e publica no seu domínio. Código seu, em git, desde o primeiro commit."
   - CTA primário específico (não "Começar Grátis"): **"Peça seu site — brief de 5 minutos"** → formulário de intake.
   - CTA secundário: "Ver um site que saiu daqui" → case.
2. **A dor** — 3 cartões espelhando as críticas transversais: *o loop que queima créditos* / *o protótipo que trava nos 70%* / *o site que o Google não vê*. Sem citar marcas ainda.
3. **Como funciona** — o time em ação: lead recebe o brief → workers implementam → reviewer aprova task a task → deploy. Visual do run real (a UI de TeamRun já existe; screenshot/replay).
4. **Por que não um app builder de prompt?** — a única seção comparativa. Tabela: crítica documentada (com fonte pública: Wiz, The Register, G2) × como a Polaris resolve por arquitetura. Tom factual, sem adjetivo.
5. **O que está incluso** — SEO técnico + GEO/AEO (citável por ChatGPT/Perplexity), performance, design system próprio, repositório seu, deploy no seu domínio.
6. **Prova** — case estetia (landing B2B no ar) + dogfooding ("a própria Polaris é desenvolvida pelo motor que constrói seu site").
7. **Preço** — por entrega + manutenção mensal opcional (§5). Sem "créditos".
8. **FAQ anti-objeção** — cada pergunta = uma crítica do 02 ("E se eu quiser sair?", "Quem garante que não quebra?", "Vai aparecer no Google?").
9. **Rodapé/nav** — "Plataforma" (dashboard, agents, teams, workflows), "Docs", "Enterprise", "Whitelabel": tudo continua a 1 clique. O conteúdo da home atual migra para `/plataforma`.

Metadados/SEO da home mudam junto (title, description, schema `Service` em vez de só `SoftwareApplication`).

## 4. O gap honesto (o que ainda NÃO existe)

"Fazer sites" hoje é **capacidade interna comprovada** (squads shipando estetia), não um fluxo self-service. Ocupar a categoria exige faseamento:

- **Fase 0 — imediata (só home + formulário):** a home nova vende o resultado; intake vira brief; um squad interno roda com humano no loop; entrega concierge. Nenhuma feature nova no produto além da landing + form. Volume limitado pelo pool de contas claude-cli — e isso é ok: concierge é margem, prova e aprendizado.
- **Fase 1 — produtizar o pipeline:** blueprint "site squad" formalizado (blueprints por nicho já existem — 009), preview URL por run, fluxo de aprovação do cliente, checklist de QA (SEO/perf/a11y) como gate do reviewer.
- **Fase 2 — self-service:** cliente acompanha o run no dashboard (UI já existe), solicita alterações que viram novas tasks. Só depois de Fase 0/1 provarem demanda.
  - **Pré-requisito (decisão Jean 07-07): BYOS — Bring Your Own Subscription.** O usuário NÃO precisa de token de API paga: adiciona o token da própria assinatura mensal do Claude (gerado com `claude setup-token` — caminho oficial do CLI), em campo exclusivo por conta de usuário, criptografado, com instruções passo a passo na UI. Runs daquele usuário usam a assinatura dele em vez do pool da plataforma. Vira spec própria (executor por injeção, coordinator intocado).

**Restrições reais a respeitar:** custo por run = rate limit do pool claude-cli (escalar = somar contas — `docs/Claude/POLARIS-TOKEN-POOL.md`); **BYOS dissolve essa restrição no self-service** (cada usuário traz a própria capacidade); não prometer prazo que o pool não sustenta na fase concierge; seção comparativa cita apenas fatos publicados com fonte (risco jurídico ≈ zero se factual e sourced).

## 5. Modelo comercial (proposta, decidir antes da Fase 0)

- **Site entregue:** preço fechado por escopo (landing / site institucional / site + blog), pago por entrega — o anti-"créditos".
- **Manutenção/evolução:** assinatura mensal opcional (alterações viram tasks de squad).
- **Self-service (Fase 2):** usuário conecta a própria assinatura Claude (BYOS) — a mensalidade cobre a plataforma, não tokens de IA. Mensagem: "sem créditos, sem API paga: use a assinatura Claude que você já tem".
- Billing atual (Mercado Pago) já suporta; não é bloqueio.

## 6. O que NÃO fazer

- Não remover nem esconder features do produto (decisão explícita: tudo continua disponível).
- Não reescrever o dashboard, nem tocar no coordinator — a mudança é de landing + narrativa.
- Não colocar concorrente no hero, não usar "mais simples que X" (lição V2.5).
- Não lançar self-service antes do concierge validar demanda (WIP≤1 vale para apostas também).

## 7. Próximo passo de execução

Isto é estratégia; a implementação da home é feature não-trivial → **fluxo Spec Kit** (`speckit-specify` com este doc como insumo). Escopo da spec: nova home `(public)/page.tsx`, página `/plataforma` herdando o conteúdo atual, formulário de intake, e nada além disso.
