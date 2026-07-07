# Handoff — Strategy V4 (auditoria de valor + home "sites")

> Sessão de 2026-07-07.

## O que foi feito

1. **`01-auditoria-valor.md`** — auditoria das 180+ features em 5 camadas (Motor / Substrato / Commodity / Legado Sofia / Infra à frente da demanda). Conclusão: o único ativo difícil de copiar e com uso real é o Motor (Teams + Squads 009 + Empresas Agênticas 005/006 + resiliência 007/008 + diff isolado 010) — e ele é invisível na home.
2. **`02-criticas-concorrentes.md`** — pesquisa (last30days: HN com engajamento, Trustpilot, G2, Wiz/The Register; Reddit 403 → descartado; janela ~6 meses p/ Base44/Stitch) das críticas a Lovable, Base44 e Google Stitch, com mapa crítica → resposta estrutural da Polaris. Brutos em `C:\Users\jeanz\Documents\Last30Days\`.
3. **`03-home-sites.md`** — proposta de reposicionamento: home vende UMA coisa ("sites de produção, não protótipos"), estrutura seção a seção, faseamento (0 concierge → 1 produtizar → 2 self-service), modelo comercial por entrega (anti-créditos), e lista do que NÃO fazer.

## Decisões (e por quê)

- **Tudo continua disponível** — decisão explícita do Jean; a mudança é só de narrativa/home. Conteúdo da home atual migra para `/plataforma`.
- **Concorrentes só em 1 seção, com fatos sourced** — para não repetir o erro V2.5 ("mais simples que CrewAI" = posicionamento derivativo).
- **Fase 0 é concierge, não self-service** — "fazer sites" existe como capacidade interna (estetia via squad), não como fluxo de produto; concierge valida demanda sem construir nada além de landing + form.
- **Preço por entrega, não créditos** — ataca a queixa nº1 documentada das três plataformas.

## Próximos passos (em ordem)

1. ~~Jean valida os 3 docs~~ **VALIDADO 2026-07-07.** Decisão adicional na validação: **BYOS** — usuário não precisa de API paga; adiciona token da própria assinatura Claude (`claude setup-token`) em campo exclusivo por conta, com instruções na UI (registrado no §4/§5 do 03; spec própria criada).
2. Spec BYOS (campos por usuário + injeção no executor) → clarify/plan/tasks/implement.
3. `speckit-specify` da nova home usando `03-home-sites.md` como insumo (escopo: home nova + `/plataforma` + form de intake, nada além).
4. Definir preços da Fase 0 antes de publicar a home (CTA promete brief → precisa de resposta comercial pronta).
5. Preparar o case estetia como prova (screenshot, métricas de performance/SEO).

## Pendências / decisões em aberto

- H1 final e tom da seção comparativa (nominal vs "app builders de prompt").
- Preço fechado por escopo (landing / institucional / site+blog) — sem número ainda.
- Prazo prometido no CTA depende do pool claude-cli (não prometer o que o rate limit não sustenta).

## Gotchas

- A home em produção ainda tem o copy condenado pelo V2.5 (fev/2026) — o diagnóstico nunca foi executado; V4 só vale se virar spec e código.
- Pesquisa: Reddit por query está 403 (gotcha já conhecido); X/YouTube sem credencial — se quiser sinal social mais fino, configurar tokens antes de repetir.
- Repo em OneDrive: jest não roda local; docs ok.
