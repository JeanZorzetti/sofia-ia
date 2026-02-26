# Analise de Riscos — V3

> Riscos ordenados por probabilidade x impacto. Cada risco tem mitigacao acionavel.

---

## Matriz de Riscos

```
Impacto ↑
         │
  ALTO   │  [R3]        [R1] [R2]
         │
  MEDIO  │  [R6] [R7]   [R4] [R5]
         │
  BAIXO  │  [R9]        [R8]
         │
         └──────────────────────── Probabilidade →
              BAIXA       ALTA
```

---

## R1: Zero Traction (Probabilidade: ALTA | Impacto: ALTO)

**Descricao:** Apos 3 meses de distribuicao, menos de 20 signups e zero pagantes.
**Causa raiz:** Produto complexo demais para self-service, messaging confuso, mercado nao pronto.

**Sinais de alerta:**
- Semana 4: < 5 signups
- Semana 8: < 15 signups
- Semana 8: Zero pagantes

**Mitigacao:**
1. **Imediato:** Simplificar messaging da landing page (focar em 1 caso de uso, nao plataforma generica)
2. **Semana 4:** Se < 5 signups → AB test na landing page (hero, CTA, copy)
3. **Semana 8:** Se zero pagantes → pivotar para consulting model (Sofia como servico: montar orquestracoes para clientes por R$ 500-2000/projeto)
4. **Alternativa:** Focar em vertical especifica (ex: agencias de marketing, que ja e o template mais forte)

---

## R2: Solo Founder Burnout (Probabilidade: ALTA | Impacto: ALTO)

**Descricao:** Um dev/founder fazendo produto + marketing + vendas + suporte = burnout inevitavel.
**Causa raiz:** Scope enorme, nenhuma delegacao.

**Sinais de alerta:**
- Consistencia de LinkedIn cai (< 2 posts/semana)
- Sprints atrasam > 1 semana
- Features bugadas passam para producao
- Motivacao cai (para de medir metricas)

**Mitigacao:**
1. **Time-box rigoroso:** 4h/dia codigo, 2h/dia marketing, 1h/dia admin. Nao misturar.
2. **Automacao:** Tudo que pode ser automatizado (emails, deploys, monitoring) deve ser.
3. **Delegacao rapida:** Quando MRR > R$2K → contratar VA para redes sociais + newsletter.
4. **Pausas planejadas:** 1 dia OFF por sprint (nao negociavel).
5. **Escopo reduzido:** V3 sprints de 2 semanas (nao 1 semana como V1/V2).

---

## R3: Security Incident (Probabilidade: BAIXA | Impacto: ALTO)

**Descricao:** Credenciais hardcoded exploradas, dados de usuarios vazam.
**Causa raiz:** `auth.ts` tem fallback users com senha no codigo; repo e publico.

**Sinais de alerta:**
- Login de IPs desconhecidos no admin
- Dados de teste aparecendo em producao
- Bot activity em rotas de API

**Mitigacao:**
1. **Sprint 1 V3 (imediato):** Remover credenciais hardcoded
2. **Sprint 1 V3:** Audit de API key storage
3. **Sprint 2 V3:** Rate limiting review em todas as rotas publicas
4. **Continuo:** Sentry alerts para patterns suspeitos (muitos 401, muitos signup de mesmo IP)
5. **Futuro:** 2FA para admin, IP allowlist

---

## R4: AI Provider Risk (Probabilidade: ALTA | Impacto: MEDIO)

**Descricao:** Groq muda pricing (fim free tier), OpenRouter aumenta custos, modelo Llama descontinuado.
**Causa raiz:** Dependencia de providers externos com pricing instavel.

**Sinais de alerta:**
- Email de Groq/OpenRouter sobre mudanca de plano
- Error rate aumenta (rate limits do provider)
- Custo por request sobe > 50%

**Mitigacao:**
1. **Ja implementado:** Multi-provider (Groq → OpenRouter → fallback)
2. **Monitorar:** Custo por request, error rate por provider (Sprint 1 V3)
3. **Plano B:** DeepSeek e Qwen como alternativas Groq-like (free, rapido)
4. **Plano C:** Self-host modelo pequeno (Llama 8B) em GPU barata se volume justificar
5. **Repasse:** Custo de IA embutido no pricing dos planos (margem de 60%+)

---

## R5: MercadoPago Issues (Probabilidade: ALTA | Impacto: MEDIO)

**Descricao:** Webhooks falham, PIX nao confirma, checkout quebra.
**Causa raiz:** Integracao complexa, sem testes end-to-end, zero pagamentos reais processados.

**Sinais de alerta:**
- Primeiro checkout falha
- Webhook nao atualiza status no DB
- Usuario paga mas plano nao atualiza

**Mitigacao:**
1. **Sprint 2 V3:** Testes E2E de billing (checkout + webhook)
2. **Sprint 2 V3:** Testar com pagamento real (R$ 1 PIX test)
3. **Alertas:** Sentry alert para webhook failures
4. **Fallback manual:** Se billing automatico falhar → oferecer PIX manual + upgrade manual pelo admin
5. **Alternativa:** Se MercadoPago for muito problemático → considerar Stripe (funciona no Brasil desde 2023)

---

## R6: SEO Nao Performa (Probabilidade: BAIXA | Impacto: MEDIO)

**Descricao:** 70+ artigos mas zero ranking significativo.
**Causa raiz:** Domain authority baixo, competicao forte, artigos sem backlinks.

**Sinais de alerta:**
- Search Console: < 1K impressoes/mes apos 3 meses
- Zero artigos no top 10
- Bounce rate > 80% nos artigos

**Mitigacao:**
1. **Verificar agora:** O que ja rankea? Otimizar esses artigos primeiro.
2. **Link building:** Guest posts em blogs BR de tech (5/mes)
3. **HARO/Connectively:** Responder queries de jornalistas sobre IA
4. **Paralelizar:** LinkedIn + Communities como canais de distribuicao que nao dependem de SEO
5. **Long game:** SEO leva 6-12 meses. Nao abandonar, mas nao depender exclusivamente.

---

## R7: Produto Complexo Demais (Probabilidade: BAIXA | Impacto: MEDIO)

**Descricao:** Usuarios se cadastram mas nao entendem o que fazer. Dashboard com muitas opcoes. Conceito de "orquestracao" e abstrato.
**Causa raiz:** Plataforma generica tentando servir muitos casos de uso.

**Sinais de alerta:**
- Onboarding completion < 30%
- Time to first orchestration > 30 min
- NPS < 20
- Feedback recorrente: "nao entendi o que fazer"

**Mitigacao:**
1. **Simplificar onboarding:** Magic Create como primeiro step (descreve → gera → executa em 60s)
2. **Guided experience:** Tooltip tour nas primeiras sessoes
3. **Focus:** Comunicar 1 caso de uso claro (ex: "Automatize producao de conteudo com IA")
4. **Templates como porta de entrada:** Nao pedir para criar do zero, oferecer template pronto
5. **Video de 60s:** "O que e Sofia AI em 1 minuto" embeddado no hero

---

## R8: Database Scaling (Probabilidade: ALTA | Impacto: BAIXO)

**Descricao:** PostgreSQL single-instance em easypanel nao aguenta carga.
**Causa raiz:** Instancia simples, sem replicacao, sem autoscaling.

**Sinais de alerta:**
- Query time p95 > 500ms
- Connection pool saturado
- Downtime por memory/disk

**Mitigacao:**
1. **Backup:** Verificar se GitHub Action de backup esta rodando (Sprint 1)
2. **Monitorar:** Tamanho das tabelas, connection usage
3. **Quando necessario (> 100 DAU):** Migrar para managed DB (Supabase, Neon)
4. **Caching:** Redis ja configurado, usar mais agressivamente
5. **Custo:** ~$15-25/mes por managed DB — justificavel com 5+ pagantes

---

## R9: Competicao (Probabilidade: BAIXA | Impacto: BAIXO)

**Descricao:** CrewAI, Relevance AI, Dify lancam feature ou pricing que torna Sofia irrelevante.
**Causa raiz:** Mercado competitivo, competidores com funding.

**Sinais de alerta:**
- Competidor lanca plano gratuito melhor
- Competidor domina keywords de SEO
- Usuarios mencionam competidor no feedback

**Mitigacao:**
1. **Diferencial:** Sofia e a unica plataforma BR com White-label + i18n PT/ES + MercadoPago
2. **Foco local:** Competidores sao EN-first. Sofia e BR-first.
3. **Custo zero:** Groq + free tier = custo de operacao quase zero vs competidores que pagam OpenAI
4. **Agilidade:** Solo founder pivota em dias, corporacoes pivotam em meses
5. **Nao competir em features:** Competir em experiencia e caso de uso especifico

---

## Plano de Contingencia Global

```
Se apos 4 meses (Sprint 8):
  MRR = 0 e Signups < 50

Opcoes:
  A) Pivotar para vertical (agencias de marketing + white-label)
  B) Pivotar para consulting (montar orquestracoes sob demanda)
  C) Pivotar para open-source puro (monetizar hosting/support)
  D) Pausar e reavaliar com mentor/advisor

Criterio para escolher:
  - A se houve interesse em white-label (leads em /contato)
  - B se houve interesse manual (DMs, emails)
  - C se houve GitHub stars/PRs (comunidade ativa)
  - D se nenhuma tracao em nenhum canal
```

---

## Revisao de Riscos

| Frequencia | Acao |
|------------|------|
| Semanal | Check rapido: algum sinal de alerta ativo? |
| Por sprint | Review: riscos mudaram? Novos riscos? |
| Mensal | Deep review: metricas vs targets, rebalancear prioridades |
| Trimestral | Go/No-Go decision: continuar, pivotar ou pausar |
