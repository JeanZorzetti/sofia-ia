# Growth Engine — Estrategia de Aquisicao e Conversao

> O produto esta pronto. Agora precisa de usuarios.

---

## 1. Canais de Aquisicao (Ordenados por ROI)

### Canal 1: SEO Organico (ja ativo, otimizar)
**Status:** 70+ artigos publicados, Search Console configurado
**Gap:** Sem dados de ranking real, sem link building ativo

**Acoes:**
- Verificar rankings reais no Search Console (quais artigos rankam?)
- Identificar top 10 artigos por impressoes → otimizar para CTR
- Internal linking audit: cada artigo deve linkar para 2-3 outros
- Atualizar artigos antigos com dados de 2026
- Schema FAQ em artigos que rankam na primeira pagina

**Metricas:** Impressoes, CTR, posicao media, clicks organicos

---

### Canal 2: LinkedIn Founder Brand (nao iniciado, alto ROI)
**Status:** ⬜ Pendente
**Por que:** LinkedIn e o canal #1 para B2B SaaS no Brasil. Zero custo, alto impacto.

**Estrategia:**
- **3 posts/semana** (seg, qua, sex)
- **Formato mix:**
  - 40% "Building in public" (metricas, decisoes, aprendizados)
  - 30% "Thought leadership" (opiniao sobre IA, multi-agente, futuro)
  - 20% "Product demos" (GIF/video curto mostrando feature)
  - 10% "Social proof" (testimonials, cases, numeros)

**Template de post:**
```
[Hook — 1 linha que para o scroll]

[Historia/insight — 3-5 linhas]

[Resultado/aprendizado — 2-3 linhas]

[CTA — "Experimente gratis em sofiaia.roilabs.com.br"]

#IAGenerativa #MultiAgente #SaaS #BuildingInPublic
```

**Meta:** 500 followers em 3 meses, 2.000 em 6 meses

---

### Canal 3: Communities (nao iniciado, medio esforco)
**Status:** ⬜ Pendente

**Onde postar (semanal):**
| Comunidade | Tipo de conteudo | Frequencia |
|-----------|-----------------|------------|
| Reddit r/artificial | Cases de uso, demos | 1x/semana |
| Reddit r/SaaS | Building in public updates | 1x/semana |
| IndieHackers | Revenue milestones, learnings | 2x/mes |
| HackerNews (Show HN) | Launch post + features | 1x/mes |
| Dev.to | Artigos tecnicos (como funciona por dentro) | 2x/mes |
| Twitter/X | Thread resumindo artigo do blog | 2x/semana |
| Discord IA Brasil | Presenca, ajudar membros | Diario |

**Regra:** 80% valor, 20% promocao. Nao ser spam.

---

### Canal 4: Newsletter (infraestrutura pronta, nao ativada)
**Status:** Template + API prontos, zero envios

**Cadencia:** Bi-semanal (a cada 2 semanas)

**Formato:**
```
📬 Sofia AI News #XX

🔥 Feature da semana: [nome + 1 paragrafo + link]
📖 Artigo novo: [titulo + 2 linhas + link]
💡 Dica rapida: [1 uso pratico de IA]
📊 Numero da semana: [metrica interessante]

→ Experimente gratis: [link]
```

**Meta:** 200 subscribers em 3 meses, 1.000 em 6 meses

---

### Canal 5: Parcerias (medio prazo, alto valor)
**Status:** Paginas /whitelabel e /enterprise prontas

**Targets:**
| Tipo | Abordagem | Valor |
|------|-----------|-------|
| Agencias de marketing digital | White-label Sofia para clientes | MRR recorrente |
| Consultores de IA | Recomendar Sofia como plataforma | Afiliados |
| Integradores (n8n, Make) | Sofia como no na automacao | Trafego qualificado |
| Influencers de tech BR | Review/demo em video | Awareness |

**Processo:**
1. Mapear 20 potenciais parceiros
2. Outreach personalizado (LinkedIn DM)
3. Demo 1:1 (30 min)
4. Trial gratuito 30 dias
5. Contrato/acordo de afiliacao

---

### Canal 6: Product Demos (YouTube/Loom)
**Status:** ⬜ Nao iniciado

**Videos prioritarios (5 primeiros):**
1. "Sofia AI em 3 minutos — overview" (awareness)
2. "Criando uma orquestracao com IA em 60 segundos" (Magic Create)
3. "Pipeline de Marketing automatizado com 3 agentes" (caso de uso)
4. "Knowledge Base: ensine IA com seus documentos" (feature)
5. "Sofia vs CrewAI vs AutoGen — comparacao ao vivo" (comparativo)

**Distribuicao de cada video:**
- YouTube (SEO de longo prazo)
- LinkedIn (post com preview)
- Blog (embed no artigo relacionado)
- Landing page (hero ou features)

---

## 2. Estrategia de Conversao (Visitante → Pagante)

### Funil Atual
```
Visitante → Signup → Onboarding → Uso Free → Upgrade → Pagante
   ???       ???       ???          ???        ???       0
```

Todos os numeros sao "???" porque nao ha tracking.

### Funil Target
```
Visitante → Signup → Ativado → Power User → Pagante
  100%       5%       60%        30%          5%
  5.000    250       150         75           12
```

### Otimizacoes por Etapa

#### Visitante → Signup (target: 5-8%)
- [ ] CTA mais agressivo no hero ("Comece gratis em 30 segundos")
- [ ] Social proof no hero (X usuarios, X orquestracoes executadas)
- [ ] Template test-drive SEM precisar de login (ja funciona)
- [ ] Exit-intent popup com oferta (trial Pro 7 dias)
- [ ] Signup com Google (1 click, ja implementado)

#### Signup → Ativado (target: 60%)
- [ ] Onboarding wizard ja existe — medir completion rate
- [ ] Email de boas-vindas com "proximos passos" claros
- [ ] In-app checklist ("Crie seu primeiro agente", "Execute uma orquestracao")
- [ ] Template pre-carregado no onboarding (executar demo real)
- [ ] Email D+1: "Voce criou seu primeiro agente?" (nurturing)

#### Ativado → Power User (target: 30%)
- [ ] Email semanal com dicas de uso
- [ ] In-app notifications de features nao usadas
- [ ] Knowledge Base prompts ("Conecte seus documentos")
- [ ] Webhooks prompts ("Receba resultados no Slack")

#### Power User → Pagante (target: 5-7%)
- [ ] Limites do plano Free visiveis e claros
- [ ] Upgrade prompt quando atinge limite (nao bloquear, mostrar)
- [ ] Trial Pro 7 dias automatico apos 3 orquestracoes
- [ ] Email com case de sucesso + CTA upgrade
- [ ] Desconto primeiro mes (20% off Pro)

---

## 3. Retention Playbook

### Semana 1 (critica)
| Dia | Acao | Canal |
|-----|------|-------|
| D+0 | Email boas-vindas + link dashboard | Email |
| D+1 | Email: "Crie seu primeiro agente em 2 min" | Email |
| D+3 | Email: "Conheca o Magic Create" (se nao criou orquestracao) | Email |
| D+5 | Email: "3 templates prontos para testar" | Email |
| D+7 | Email: "Como esta sua experiencia?" + NPS | Email |

### Semana 2-4 (engajamento)
| Frequencia | Acao | Canal |
|------------|------|-------|
| Semanal | Dica de uso + feature highlight | Email |
| Semanal | Newsletter (se inscrito) | Email |
| In-app | Notificacao de feature nao usada | Dashboard |
| In-app | Progresso: "Voce usou 3/5 features" | Dashboard |

### Mes 2+ (expansao)
| Trigger | Acao | Canal |
|---------|------|-------|
| 10+ orquestracoes | Email: "Hora de conectar webhooks" | Email |
| Atinge limite Free | Prompt upgrade + trial | In-app + Email |
| Inativo 7 dias | Email: "Sentimos sua falta" + novidade | Email |
| Inativo 30 dias | Email final: "Sua conta sera pausada em 15 dias" | Email |

---

## 4. Pricing Optimization

### Pricing Atual
| Plano | Preco | Conversao esperada |
|-------|-------|--------------------|
| Free | R$ 0 | Porta de entrada |
| Pro | R$ 297/mes | PMEs e freelancers |
| Business | R$ 997/mes | Times e empresas |
| Enterprise | Custom | Grandes empresas |

### Analise
- **Gap:** R$ 0 → R$ 297 e um salto grande demais
- **Proposta:** Considerar plano intermediario ou trial com creditos

### Opcoes a testar
1. **Trial Pro 7 dias** automatico para todo signup (sem cartao)
2. **Plano Starter R$ 97/mes** (5 agentes, 500 msgs, 2 KBs) entre Free e Pro
3. **Credit system** em vez de hard limits (mais flexivel, menos fricao)
4. **Annual discount** 20% (R$ 237/mes Pro, R$ 797/mes Business)

**Decisao:** Testar Trial Pro 7 dias primeiro (menor esforco, maior impacto).

---

## 5. Viral Loops

### Loop 1: "Powered by Sofia AI"
- Resultados compartilhados de orquestracoes incluem badge "Powered by Sofia AI"
- Link para landing page com referral do usuario
- Incentivo: 1 mes gratis por cada pagante indicado

### Loop 2: Template Sharing
- Usuarios publicam templates no marketplace
- Templates linkam para o perfil do criador
- Top templates aparecem na landing page

### Loop 3: "Invite your team"
- Workspace colaborativo incentiva convites
- Email: "Seu colega [nome] esta usando Sofia AI"
- Free tier permite 2 membros (incentiva upgrade para mais)

---

## 6. Calendario de Execucao (Primeiros 90 Dias)

### Mes 1: Foundation
- [ ] Implementar tracking de eventos (analytics-collector)
- [ ] Configurar GA4 detalhado (funnels, goals)
- [ ] Primeiro post LinkedIn
- [ ] Primeiro envio de newsletter
- [ ] Verificar rankings SEO reais

### Mes 2: Activation
- [ ] Implementar email drip (D+0 a D+7)
- [ ] In-app onboarding checklist
- [ ] Trial Pro 7 dias
- [ ] 12 posts LinkedIn (3/semana)
- [ ] 2 newsletters
- [ ] Primeiro video demo

### Mes 3: Conversion
- [ ] Upgrade prompts contextuais
- [ ] Plan limit visibility
- [ ] 12 posts LinkedIn
- [ ] 2 newsletters
- [ ] Community posts (Reddit, IndieHackers)
- [ ] Primeiro parceiro/afiliado
