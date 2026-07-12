# Quickstart — validação E2E da 012 (produção)

Pré-condição: deploy na `main` concluído (EasyPanel, app público). Medições de performance SÓ em produção.

## Cenário 1 — Home nova no ar (US1)

1. Abrir `https://polarisia.com.br/`.
2. Verificar: H1 "Sites de produção, não protótipos."; sub sobre o time dev/reviewer/líder; CTA primário "Peça seu site — brief de 5 minutos" → `/peca-seu-site`; CTA secundário → case.
3. Rolar as 9 seções na ordem do doc §3 (dor → como funciona → comparativa → incluso → prova → preço → FAQ → rodapé).
4. Confirmar que NENHUM concorrente aparece antes da seção comparativa.

## Cenário 2 — Intake cria lead no CRM (US1) ⭐ crítico

1. Abrir `/peca-seu-site`, preencher brief completo (nome, email, WhatsApp, negócio, tipo=landing, site atual, objetivo).
2. Enviar → confirmação de sucesso na tela.
3. No Sirius CRM (`sirius.roilabs.com.br`), confirmar o contato criado com notes contendo `site-intake`, tipo de site e objetivo.
4. Negativo: enviar com email inválido → erro específico, sem lead; simular duplo clique → 1 lead só.

## Cenário 3 — /plataforma herda a home antiga (US2)

1. Abrir `/plataforma` → conteúdo da home atual (hero de orquestração, features, pricing de planos, templates, FAQ).
2. View-source: title/canonical próprios (`/plataforma`), JSON-LD `SoftwareApplication`.
3. Nav/rodapé da home nova: "Plataforma", Docs, Enterprise, Whitelabel, Login — todos a 1 clique e respondendo 200.

## Cenário 4 — Comparativa factual com fontes (US3)

1. Na seção "Por que não um app builder de prompt?", conferir que CADA linha tem link de fonte pública (Wiz/The Register/G2 conforme `02-criticas-concorrentes.md`) e que os links abrem.
2. Seção de prova: link do case abre `https://estetia.estetiacrm.com.br` (site real no ar).

## Cenário 5 — SEO/GEO (US4)

1. View-source da home: title/description novos; JSON-LD `Service` válido (Rich Results Test sem erros).
2. `https://polarisia.com.br/sitemap.xml` inclui `/plataforma` e `/peca-seu-site`.
3. PSI/CrUX em produção: LCP/CLS da home nova ≤ home antiga (baseline: medir antes do deploy).

## Registro

Evidências (prints/URLs/IDs de contato no CRM) vão no `handoff.md` da spec ao concluir.
