# Metricas & KPIs — Framework de Medicao V3

> "Se voce nao mede, voce nao gerencia." O que nao e trackeado nao existe.

---

## 1. North Star Metric

**Monthly Recurring Revenue (MRR)**

Todas as outras metricas sao leading indicators do MRR.

---

## 2. Funil AARRR (Pirate Metrics)

### Acquisition (Como chegam)
| Metrica | Onde medir | Target Mes 3 | Target Mes 6 | Target Mes 12 |
|---------|------------|--------------|--------------|---------------|
| Visitantes unicos/mes | Google Analytics 4 | 1.000 | 5.000 | 15.000 |
| Trafego organico (%) | GA4 | 40% | 60% | 70% |
| Trafego direto (%) | GA4 | 20% | 15% | 10% |
| Trafego social (%) | GA4 | 30% | 20% | 15% |
| Trafego referral (%) | GA4 | 10% | 5% | 5% |
| Impressoes Google Search | Search Console | 5K | 30K | 100K |
| CTR medio Search | Search Console | 3% | 4% | 5% |
| Keywords top 10 | Search Console | 10 | 50 | 150 |

### Activation (Primeira experiencia de valor)
| Metrica | Onde medir | Target |
|---------|------------|--------|
| Signup rate (visitante → cadastro) | Custom event | 5-8% |
| Onboarding completion rate | Custom event | 60% |
| Time to first orchestration | Custom event | < 10 min |
| First agent created (%) | DB query | 80% dos signups |
| First orchestration executed (%) | DB query | 50% dos signups |
| Template test-drive usage (landing) | Custom event | 15% dos visitantes |

### Retention (Voltam?)
| Metrica | Onde medir | Target |
|---------|------------|--------|
| DAU / MAU ratio | Custom tracking | > 20% |
| Semana 1 retention | Cohort analysis | 40% |
| Semana 4 retention | Cohort analysis | 20% |
| Orchestrations executadas/usuario/semana | DB query | 3+ |
| Sessoes/usuario/semana | GA4 | 2+ |

### Revenue (Pagam?)
| Metrica | Onde medir | Target Mes 3 | Target Mes 6 | Target Mes 12 |
|---------|------------|--------------|--------------|---------------|
| MRR | MercadoPago + DB | R$ 600 | R$ 5.000 | R$ 20.000 |
| Paying users | DB | 2 | 15 | 60 |
| ARPU (average revenue per user) | Calculado | R$ 300 | R$ 333 | R$ 333 |
| Free → Paid conversion rate | DB | 3% | 5% | 7% |
| Churn rate mensal | DB | < 10% | < 8% | < 5% |
| LTV (lifetime value) | Calculado | - | R$ 2.000 | R$ 4.000 |

### Referral (Indicam?)
| Metrica | Onde medir | Target |
|---------|------------|--------|
| NPS score | NPS survey | > 40 |
| Referral signups (via afiliados) | DB ref tracking | 10% dos signups |
| "Powered by Sofia" clicks | Custom event | 5/semana |
| GitHub stars | GitHub API | 100 (mes 3), 500 (mes 12) |

---

## 3. Metricas de Produto (Health)

### Performance
| Metrica | Onde medir | Target |
|---------|------------|--------|
| LCP (Largest Contentful Paint) | Lighthouse / Vercel | < 2.5s |
| FID (First Input Delay) | Web Vitals | < 100ms |
| CLS (Cumulative Layout Shift) | Web Vitals | < 0.1 |
| TTFB (Time to First Byte) | Vercel analytics | < 400ms |
| API p95 latency | Sentry / custom | < 500ms |
| Orchestration exec time (median) | DB | < 30s |

### Reliability
| Metrica | Onde medir | Target |
|---------|------------|--------|
| Uptime | UptimeRobot / Vercel | 99.5% |
| Error rate (4xx/5xx) | Sentry | < 1% |
| Build success rate | GitHub Actions | > 95% |
| DB connection pool usage | Prisma metrics | < 80% |

### AI Quality
| Metrica | Onde medir | Target |
|---------|------------|--------|
| Orchestration success rate | DB (completed/total) | > 90% |
| RAG relevance score | Custom eval | > 0.7 |
| Agent response time (p50) | DB | < 5s |
| Groq API error rate | Sentry | < 2% |

---

## 4. Metricas de Conteudo (SEO/GEO)

| Metrica | Onde medir | Target Mes 6 |
|---------|------------|--------------|
| Artigos indexados | Search Console | 70+ |
| Artigos top 10 Google | Search Console | 20 |
| Artigos top 3 Google | Search Console | 5 |
| Domain Authority | Ahrefs / Moz | 20+ |
| Backlinks unicos | Ahrefs | 50+ |
| Mencoes em LLMs | Manual (perguntar ChatGPT/Perplexity) | 5+ |

---

## 5. Dashboard Admin — Metricas Essenciais

O `/admin/metrics` ja existe. Precisa ser expandido para incluir:

### Tela 1: Overview (diario)
```
┌─────────────────────────────────────────────┐
│  MRR: R$ X.XXX     Pagantes: XX             │
│  Signups hoje: X    Signups mes: XX          │
│  Churn mes: X%      ARPU: R$ XXX            │
├─────────────────────────────────────────────┤
│  [Grafico] Signups ultimos 30 dias          │
│  [Grafico] MRR ultimos 6 meses             │
│  [Grafico] Funil: Visit→Signup→Active→Paid  │
└─────────────────────────────────────────────┘
```

### Tela 2: Cohort (semanal)
```
┌─────────────────────────────────────────────┐
│  Retention heatmap por cohort semanal       │
│  Semana 0: 100% | S1: XX% | S4: XX%        │
├─────────────────────────────────────────────┤
│  Feature adoption: % que usou cada feature  │
│  Agentes: XX% | Orq: XX% | KB: XX%         │
└─────────────────────────────────────────────┘
```

### Tela 3: Revenue (mensal)
```
┌─────────────────────────────────────────────┐
│  MRR breakdown: Pro XX × R$297 + Biz XX     │
│  Churn: XX usuarios (R$ XXXX perdido)       │
│  Expansion: XX upgrades (R$ XXXX ganho)     │
│  Net new MRR: R$ XXXX                       │
└─────────────────────────────────────────────┘
```

---

## 6. Instrumentacao Necessaria

### Eventos de tracking (analytics-collector.ts)
Ja existe o tracking basico. Eventos adicionais necessarios:

```typescript
// Acquisition
track('landing_page_view', { source, utm_params })
track('template_test_drive_started', { template_name })
track('template_test_drive_completed', { template_name, duration_ms })

// Activation
track('signup_completed', { method: 'email' | 'google' })
track('onboarding_step_completed', { step: 1-4 })
track('first_agent_created', { method: 'manual' | 'magic_create' })
track('first_orchestration_executed', { template: string | null })

// Retention
track('session_started', { days_since_signup })
track('orchestration_executed', { strategy, agent_count })
track('kb_document_uploaded', { type: 'pdf' | 'docx' | 'csv' | 'text' | 'url' })

// Revenue
track('plan_upgrade_clicked', { from_plan, to_plan })
track('checkout_started', { plan })
track('checkout_completed', { plan, amount })
track('plan_limit_hit', { resource, current, limit })

// Referral
track('share_clicked', { where: 'result' | 'sidebar' })
track('affiliate_link_clicked', { referrer_id })
```

### Onde armazenar
- **Eventos em tempo real:** PostgreSQL tabela `AnalyticsEvent` (ja existe `AnalyticsDaily`)
- **Agregados diarios:** Job cron que consolida events → `AnalyticsDaily`
- **Externo (futuro):** PostHog ou Mixpanel quando volume justificar

---

## 7. Cadencia de Revisao

| Frequencia | O que revisar | Quem |
|------------|---------------|------|
| Diario | Signups, erros, uptime | Founder (5 min) |
| Semanal | Funil AARRR, feature adoption | Founder (30 min) |
| Mensal | MRR, churn, cohort, SEO | Founder (2h) |
| Trimestral | Strategy review, pivotar? | Founder + advisors |
