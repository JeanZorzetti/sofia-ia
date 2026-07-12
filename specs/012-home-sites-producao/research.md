# Research — 012 Home V4

**Date**: 2026-07-12. Decisões tomadas contra o codebase real e os docs de estratégia validados (`docs/strategy_V4/`).

## R1 — Destino do intake: reusar `/api/crm/lead`

**Decisão**: o formulário de intake POSTa no proxy público existente `src/app/api/crm/lead/route.ts` (→ Sirius CRM), estendido de forma retrocompatível.

**Rationale**: o proxy já está em produção servindo o `ContactForm` de `/contato` — já resolve env vars (`SIRIUS_CRM_API_KEY`, `SIRIUS_CRM_URL`), validação server-side de nome/email, tratamento de erro do CRM e logging. Criar rota nova duplicaria tudo isso.

**Alternativas rejeitadas**:
- *Nova tabela na Polaris* — persistir brief no Postgres exigiria migração (gate constituição III), UI de gestão e sync com CRM; o CRM já é o lugar de lead.
- *Rota nova `/api/intake`* — duplicação do proxy inteiro para mudar 3 campos.

**Extensão**: campos opcionais `siteType`, `currentSite`, `goal` concatenados em `notes`; `subject: 'site-intake'` distingue a origem; honeypot server-side (campo oculto preenchido → 200 sem forward ao CRM). Contato atual continua byte-idêntico (não envia os campos novos).

## R2 — Intake em página própria `/peca-seu-site`

**Decisão**: página dedicada, não só seção da home.

**Rationale**: URL falável (rádio-teste), linkável de qualquer canal (Instagram, proposta, assinatura de email), rastreável no GSC como página de conversão. CTA do hero e da seção de preço apontam pra ela.

**Alternativa rejeitada**: modal/seção na home — não linkável externamente, polui a home e dificulta medir conversão por página.

## R3 — Fonte da copy: strategy_V4, tipada em `src/data/home-v4.ts`

**Decisão**: toda a copy estruturada (cartões de dor, linhas da comparativa com `source: {label, url}` obrigatório, itens de "incluso", FAQ) vive em `src/data/home-v4.ts`; as páginas só renderizam.

**Rationale**: padrão da casa (`src/data/home.ts`, `pricing.ts`); o tipo com `source` obrigatório na comparativa **força** o FR-007 (crítica sem fonte não compila).

## R4 — Schema.org: `Service` na home, `SoftwareApplication` em `/plataforma`

**Decisão**: home nova emite `Service` (serviceType "Criação de sites", provider `Organization` ROI Labs/Polaris, areaServed BR); `/plataforma` leva o JSON-LD `SoftwareApplication` atual sem mudança.

**Rationale**: a home passa a vender um serviço; o produto SaaS continua descrito onde ele mora. sameAs conforme perfis canônicos ROI Labs (linkedin `roi-labs-curadoria`, instagram `roilabs.curadoria` — nunca handles "roilabs" de terceiros).

## R5 — Sem redirects nem âncoras legadas

**Decisão**: `/` troca de conteúdo in-place; nenhum redirect. Âncoras da home antiga (ex.: `/#pricing`) não são preservadas.

**Rationale**: a URL raiz continua existindo (sem 404); links externos com âncora apenas aterrissam no topo da home nova — degradação aceitável e temporária. `/plataforma` define as próprias âncoras.

## R6 — Prova visual do "como funciona"

**Decisão**: screenshot estático (PNG otimizado em `public/`) da UI real de TeamRun mostrando lead → workers → reviewer; case linka `https://estetia.estetiacrm.com.br` (site real no ar feito pelo motor).

**Rationale**: replay ao vivo/embed do dashboard é Fase 1+ (produtizar o pipeline); screenshot real já diferencia de mockup e não adiciona JS.

**Pendência de asset**: capturar o screenshot de um run real bonito (fazer durante a implementação; não bloqueia o resto).
