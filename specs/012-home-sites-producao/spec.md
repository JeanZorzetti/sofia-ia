# Feature Specification: Home V4 — "Sites de produção, não protótipos"

**Feature Branch**: `012-home-sites-producao`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "Nova home Polaris V4: vender sites de producao feitos por time de agentes IA; pagina /plataforma herda conteudo atual; formulario de intake"

**Insumos**: `docs/strategy_V4/03-home-sites.md` (estrutura seção a seção, validado pelo Jean 07-07), `docs/strategy_V4/02-criticas-concorrentes.md` (fatos e fontes da seção comparativa), `docs/strategy_V4/01-auditoria-valor.md` (o Motor como único ativo com evidência).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitante com a dor pede um site (Priority: P1) 🎯 MVP

Dono de negócio ou agência que já tentou (ou ouviu falar de) builders de IA chega na home, reconhece a própria dor ("o site que a IA me deu não indexa, quebrou, e me cobrou por tentativa de conserto"), entende a proposta ("time de agentes que revisa o próprio trabalho; código seu, em produção") e envia o brief de 5 minutos. O brief vira lead no CRM para o fluxo concierge (Fase 0).

**Why this priority**: é a única conversão que a Fase 0 precisa — a home nova existe para gerar briefs. Sem o intake funcionando, a mudança é só cosmética.

**Independent Test**: acessar `/`, verificar H1/narrativa nova, preencher o formulário de intake e confirmar o lead criado no Sirius CRM.

**Acceptance Scenarios**:

1. **Given** um visitante anônimo em `/`, **When** a página carrega, **Then** o hero apresenta o problema primeiro com H1 "Sites de produção, não protótipos.", CTA primário "Peça seu site — brief de 5 minutos" e CTA secundário apontando para o case.
2. **Given** o visitante no formulário de intake, **When** preenche nome, email e os campos do brief e envia, **Then** recebe confirmação visual de sucesso e o lead é criado no CRM com todo o contexto do brief.
3. **Given** o formulário com email inválido ou nome vazio, **When** envia, **Then** vê mensagem de erro específica e nenhum lead é criado.
4. **Given** o CRM indisponível, **When** envia o brief, **Then** vê mensagem de erro clara ("tente novamente") e os dados digitados NÃO são perdidos do formulário.

---

### User Story 2 - Nada é removido: plataforma continua a 1 clique (Priority: P1)

Usuário atual (ou visitante interessado na plataforma de agentes) continua encontrando tudo: o conteúdo da home atual (orquestração, features, preços de plano, templates) migra para `/plataforma`, e a navegação/rodapé da home nova linkam "Plataforma", "Docs", "Enterprise", "Whitelabel", login e registro.

**Why this priority**: decisão explícita da estratégia — "nada é removido da plataforma". Quebrar o funil existente (login, docs, preço de planos) seria regressão.

**Independent Test**: acessar `/plataforma` e verificar o conteúdo da home atual; verificar que nav/rodapé da nova home dão acesso a dashboard/docs/enterprise/whitelabel em 1 clique.

**Acceptance Scenarios**:

1. **Given** a home nova no ar, **When** o visitante acessa `/plataforma`, **Then** vê o conteúdo que hoje está em `/` (hero de orquestração, features, pricing de planos, templates, FAQ), com metadados próprios.
2. **Given** qualquer página pública, **When** o visitante usa a navegação, **Then** dashboard/login, docs, enterprise e whitelabel continuam acessíveis a 1 clique.
3. **Given** um usuário logado que acessa `/`, **When** a página carrega, **Then** nada quebra no fluxo atual de acesso ao dashboard.

---

### User Story 3 - Visitante cético valida as provas (Priority: P2)

Visitante que conhece Lovable/Base44/Stitch avalia a seção comparativa (fatos publicados com fonte), o case real no ar (estetia.estetiacrm.com.br), o "como funciona" (lead → devs → reviewer → deploy) e o FAQ anti-objeção — e sai convencido de que a diferença é arquitetural, não marketing.

**Why this priority**: o ICP primário já se queimou com builders; sem prova factual a promessa soa igual às demais. Mas a conversão (US1) funciona mesmo sem esta seção completa.

**Independent Test**: verificar que a seção comparativa cita apenas fatos com fonte pública linkada, que nenhum concorrente aparece no hero, e que o case linka para site real no ar.

**Acceptance Scenarios**:

1. **Given** a seção "Por que não um app builder de prompt?", **When** o visitante a lê, **Then** cada crítica citada tem fonte pública (Wiz, The Register, G2 etc. — conforme `02-criticas-concorrentes.md`) e o tom é factual, sem adjetivos.
2. **Given** o hero e as seções de dor, **When** renderizados, **Then** nenhuma marca concorrente é citada fora da seção comparativa dedicada.
3. **Given** a seção de prova, **When** o visitante clica no case, **Then** chega a um site real em produção feito pelo motor.
4. **Given** o FAQ, **When** lido, **Then** cada pergunta espelha uma crítica documentada ("E se eu quiser sair?", "Quem garante que não quebra?", "Vai aparecer no Google?").

---

### User Story 4 - Google e motores de resposta entendem a nova categoria (Priority: P3)

Buscadores e LLMs (ChatGPT/Perplexity/Gemini) indexam a home nova como serviço de criação de sites de produção — title, description, schema.org `Service` e sitemap atualizados; `/plataforma` indexável com canonical próprio.

**Why this priority**: SEO/GEO é o canal do portfólio, mas o efeito é de médio prazo — não bloqueia a Fase 0.

**Independent Test**: inspecionar metadados e JSON-LD da home e de `/plataforma`; validar schema no Rich Results Test; conferir presença no sitemap.

**Acceptance Scenarios**:

1. **Given** a home nova, **When** inspecionada, **Then** title/description/OG refletem o posicionamento "sites de produção" e o JSON-LD inclui `Service` (mantendo `SoftwareApplication` apenas onde fizer sentido — `/plataforma`).
2. **Given** o sitemap, **When** gerado, **Then** inclui `/plataforma` e mantém a home com prioridade máxima.

---

### Edge Cases

- CRM fora do ar ou `SIRIUS_CRM_API_KEY` ausente → erro amigável no formulário, dados preservados no client, log no servidor (já é o comportamento do proxy `/api/crm/lead`).
- Submissão duplicada (duplo clique) → botão desabilitado durante envio (padrão do ContactForm atual).
- Spam no formulário público → honeypot simples; sem captcha na Fase 0 (fricção > risco no volume atual).
- Visitante em URL antiga com âncora (ex.: `/#pricing` vinda de link externo) → âncoras da home antiga não precisam ser preservadas; `/plataforma` tem as suas.
- Rotas `en/` e `es/` da home continuam apontando para o conteúdo antigo → fora de escopo traduzir a home nova (ver Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A rota `/` DEVE apresentar a nova narrativa com as 9 seções do doc `03-home-sites.md` §3: hero (problema primeiro), a dor (3 cartões), como funciona (lead → workers → reviewer → deploy), comparativa única, o que está incluso, prova (case estetia + dogfooding), preço (modelo por entrega, sem "créditos"), FAQ anti-objeção, rodapé/nav com acesso à plataforma.
- **FR-002**: O CTA primário do hero DEVE levar ao formulário de intake ("brief de 5 minutos"); o CTA secundário DEVE levar ao case real.
- **FR-003**: O formulário de intake DEVE coletar: nome, email, WhatsApp/telefone (opcional), nome do negócio, tipo de site (landing / institucional / site + blog), URL do site atual (opcional) e objetivo em texto livre; validação client-side + server-side de nome e email.
- **FR-004**: A submissão do intake DEVE criar um lead no Sirius CRM via proxy público existente `/api/crm/lead`, com o contexto completo do brief (tipo de site, site atual, objetivo) preservado no lead; a origem DEVE ser distinguível dos leads do formulário de contato.
- **FR-005**: O conteúdo atual de `/` DEVE migrar para `/plataforma` (mesmas seções e componentes), com title/description/canonical próprios e schema `SoftwareApplication`.
- **FR-006**: Navegação e rodapé DEVEM manter dashboard/login, docs, enterprise, whitelabel e demais rotas públicas a 1 clique — nenhuma feature removida ou escondida.
- **FR-007**: A seção comparativa DEVE citar somente fatos publicados com fonte linkada (conforme `02-criticas-concorrentes.md`) e NENHUM concorrente pode aparecer fora dela (proibido no hero — lição V2.5).
- **FR-008**: Metadados da home (title, description, OG, twitter, keywords) e JSON-LD DEVEM mudar para o posicionamento de serviço (`Service`), e o sitemap DEVE incluir `/plataforma`.
- **FR-009**: A mudança NÃO PODE tocar dashboard, coordinator, APIs de Teams nem qualquer fluxo autenticado — escopo é landing + narrativa (decisão §6 da estratégia).
- **FR-010**: A seção de preço DEVE comunicar o modelo (preço fechado por entrega + manutenção mensal opcional; "sem créditos, sem API paga") SEM valores numéricos até o Jean definir a tabela (decisão pendente §5); o CTA da seção é o próprio intake.

### Key Entities

- **Brief de intake**: nome, email, telefone (opcional), negócio, tipo de site, site atual (opcional), objetivo. Não persiste no banco da Polaris — vira lead/contato no Sirius CRM (entidade externa já existente).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um visitante consegue ir do hero ao brief enviado em menos de 5 minutos, e o lead aparece no Sirius CRM com o contexto completo.
- **SC-002**: 100% das rotas públicas existentes continuam acessíveis (nav/rodapé) após a troca — zero regressão de funil.
- **SC-003**: Toda crítica citada na seção comparativa tem fonte pública linkada (auditável por inspeção).
- **SC-004**: Home nova e `/plataforma` passam no Rich Results Test sem erros de schema; `/plataforma` presente no sitemap.
- **SC-005**: Performance da home nova não regride vs. a atual (mesmo padrão de componentes; LCP/CLS medidos em produção, não local — Lighthouse local não é confiável).

## Assumptions

- **Idioma**: home nova em pt-BR apenas; rotas `en/`/`es/` mantêm o conteúdo atual (traduzir é iteração futura).
- **Preço sem números**: valores por escopo ainda não decididos (§5 diz "decidir antes da Fase 0") — a seção comunica o modelo e direciona ao intake; inserir números é atualização de conteúdo posterior, não bloqueia esta feature.
- **Case**: estetia.estetiacrm.com.br é o case linkável; screenshot estático da UI de TeamRun serve como visual do "como funciona" (replay ao vivo é iteração futura).
- **Intake reusa o CRM**: o proxy `/api/crm/lead` (Sirius CRM) já está em produção e atende o formulário de contato; o intake usa o mesmo caminho com payload estendido — sem nova tabela, sem novo backend.
- **Sem A/B test**: a troca é direta (decisão estratégica já validada), sem manter as duas homes em paralelo.
- **Design system**: a home nova reusa os componentes de landing existentes (`SectionWrapper`, `AnimatedSection`, `GradientText`, etc.) — visual premium consistente, sem novo design system.

## Clarifications

### Session 2026-07-12

- Q: Para onde vai a submissão do intake? → A: Reusar o proxy público `/api/crm/lead` → Sirius CRM (mesmo caminho do formulário de contato, já em produção); contexto do brief vai no campo de notas; origem distinguível via assunto/tag "site-intake".
- Q: Quais campos compõem o "brief de 5 minutos"? → A: nome, email, WhatsApp (opcional), nome do negócio, tipo de site (landing / institucional / site + blog — espelha §5), URL atual (opcional), objetivo livre. Sem campo de orçamento: o preço é fechado por escopo e comunicado pela Polaris na proposta.
- Q: A seção de preço mostra valores? → A: Não — comunica o modelo (por entrega + manutenção opcional, "sem créditos") e converte para o intake; números entram quando o Jean fechar a tabela (§5 é decisão pendente dele).
- Q: O que acontece com a home atual? → A: Migra 1:1 para `/plataforma` (componentes reutilizados, metadados próprios). Sem redirects: `/` continua existindo com o conteúdo novo.
- Q: Intake é página própria ou seção da home? → A: Página própria `/peca-seu-site` (URL falável/rastreável, CTA aponta pra ela) com o formulário; a home pode embutir uma versão curta na última dobra se o design pedir, mas a página é a fonte canônica.
- Q: i18n? → A: Fora de escopo — pt-BR only nesta feature (ICP é dono de negócio/agência BR).
