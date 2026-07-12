# Handoff — Blog (cadência "1 artigo novo/dia" da agenda do ROI Hub)

> Última sessão: 2026-07-12. Commit `47dc38d`.

## O que foi feito

- **Artigo 91 publicado**: `site-feito-por-ia-prototipo-vs-producao` — no ar em https://polarisia.com.br/blog/site-feito-por-ia-prototipo-vs-producao (verificado HTTP 200 em prod).
- **Bug de renderização corrigido na raiz**: `remark-gfm` não estava ligado no `MDXRemote`. Tabelas markdown dos **64 artigos** que usam tabela saíam como texto cru com pipes em produção. Fix: `options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}` em `src/app/(public)/blog/[slug]/page.tsx`. Verificado em prod que os artigos antigos agora renderizam `<table>` de verdade.

## Decisões

- **Tema escolhido pelo gap estratégico**: o blog tinha 90 artigos e **zero** sobre o posicionamento V4 ("sites de produção, não protótipos"). O artigo é a primeira peça de conteúdo que sustenta a home nova (spec 012) — a home vende o resultado, o artigo prova a tese.
- **Críticas a concorrentes só com fonte pública** (The Register, Wiz, G2, Trustpilot, HN), conforme a regra do `docs/strategy_V4/02-criticas-concorrentes.md`. Nenhum número inventado, nenhum adjetivo — risco jurídico ≈ zero.
- **Autor = "Equipe Polaris IA"** (default do `src/lib/blog.ts`). Os 73 artigos antigos usam "Equipe Sofia" — legado do rename, não corrigido em massa de propósito.

## Estado do blog

- 91 artigos. Antes desta sessão, o último era de **2026-02-25** — a cadência estava parada há ~5 meses.
- Não existe fila de pautas formal no repo. Os temas abaixo são a fila sugerida (todos derivados do V4 + lacunas reais do índice atual).

## Próximos (fila de pautas, em ordem)

1. **"Quanto custa um site feito por IA? Crédito vs entrega"** — ataca a dor nº2 do V4 (créditos queimados), keyword comercial.
2. **"SSR, SSG ou SPA: qual o Google e o ChatGPT realmente enxergam"** — técnico, sustenta a promessa de SEO/GEO da home nova.
3. **"Como um revisor de IA reprova o próprio time (e por que isso importa)"** — dogfooding: explica o reviewer + diff isolado por task (F010).
4. **"Migrar um protótipo de app builder para produção: o roteiro"** — captura quem já se queimou (intenção alta).
5. **"O que é GEO/AEO e por que seu site precisa ser citável por IA"** — complementa o `llms.txt` já publicado.

## Pendências

- **Marcar a task na agenda do hub** (https://hub.roilabs.com.br/agenda): não consegui — a rota devolve **401** para fetch não-autenticado. Precisa ser marcada por você no navegador.
- **Indexação**: o sitemap (`src/app/sitemap.ts`) já inclui o post automaticamente via `getAllPosts()`. Falta pedir indexação no GSC.
- **Autor legado**: 73 artigos ainda assinam "Equipe Sofia". Troca em massa é 1 comando de `sed` — decidir se vale.

## Gotchas

- **`next-mdx-remote` não liga GFM por padrão.** Tabela e task list (`- [ ]`) só funcionam com `remark-gfm` explícito. Falha silenciosa: build passa, tsc passa, só o HTML sai errado. Se for escrever tabela em artigo, o plugin agora está ligado — mas confira antes em qualquer outro repo.
- **Build local não é confiável** (OneDrive). A validação real usada aqui foi: `npx tsc --noEmit` + script node checando frontmatter e links internos + `curl` na prod depois do deploy.
- **Deploy EasyPanel leva ~4 min** após o push em `main` (8 tentativas de poll a 30s, com um 502 no meio — normal).
