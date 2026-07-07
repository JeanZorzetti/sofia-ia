# Críticas Reais a Lovable, Base44 e Google Stitch (V4)

> Data: 2026-07-07. Pesquisa via last30days (Hacker News com engajamento real, Trustpilot, G2, imprensa de segurança, fóruns oficiais) + WebSearch.
> Limitações declaradas: Reddit por query estava 403 (fallback RSS = ruído, descartado); X/YouTube/TikTok sem credencial. Para Base44 e Stitch o volume de 30 dias é baixo — janela ampliada para ~6 meses, sinalizado.
> Brutos salvos em `C:\Users\jeanz\Documents\Last30Days\*-raw-critique.md`.

---

## Veredito transversal

As três plataformas convergem para a mesma frase, quase literal: **"ótimo para chegar a um protótipo rápido, arriscado para produção real."** Lovable ("chega a 70% do caminho, você briga com os 30% finais"), Base44 ("quem cresce além do MVP conta outra história"), Stitch ("amado como ponto de partida, não confiado como finalizador").

## Temas transversais rankeados

| # | Tema | Quem | Frequência |
|---|------|------|------------|
| 1 | **Gap protótipo → produção** | as três | muito recorrente |
| 2 | **Fricção no modelo de créditos** (queimados em loop de bug, ou teto sem opção de comprar mais) | as três | muito recorrente |
| 3 | **"Conserta um, quebra outro"** — a IA reintroduz bugs e cobra por tentativa | Lovable + Base44 | muito recorrente |
| 4 | **Segurança**: vulnerabilidades críticas divulgadas publicamente | Lovable + Base44 | recorrente, alto engajamento HN |
| 5 | **Exportação/portabilidade com fricção** | as três | pontual→recorrente |
| 6 | **Suporte distante, reembolso difícil** | Lovable + Base44 | recorrente |

Frase-síntese do HN (recorrente nos comentários das duas threads de segurança): *"Vibe coding democratizou o deploy sem democratizar a responsabilidade."*

---

## Lovable (lovable.dev) — janela 30d + eventos de segurança ~5 meses

1. **Loop de bug queimando créditos** (muito recorrente) — conserta uma coisa, quebra outra, e cada tentativa consome créditos pagos. Queixa nº1 em G2 e Trustpilot ("credit costs are unpredictable and add up fast, the loudest complaint by far" — G2).
2. **Qualidade/manutenibilidade do código** (muito recorrente) — "menos engenharia, mais aposta: nunca saber o que o próximo prompt vai quebrar" (Trustpilot via Superblocks); "nunca vi dívida técnica acumular tão rápido".
3. **Protótipo vs produção** (muito recorrente) — "70% do caminho; os 30% finais são briga"; migrar para stack de produção é "messy and time-consuming" (Superblocks).
4. **Segurança — RLS quebrado em escala** (recorrente) — 170 de 1.645 apps públicos (10,3%) com falhas críticas de Row Level Security expondo e-mails, telefones, pagamentos e API keys; caso de fev/2026 expôs 18 mil usuários de um único app. HN: **140 pontos / 35 comentários** (The Register).
5. **SEO — shell vazio** (recorrente) — apps saem como SPA React/Vite 100% client-side; crawler recebe HTML quase vazio e não indexa (prerender.io); SSR só chegou em abril/2026, recepção mista.
6. **Exportação indireta** (recorrente) — código sai só via GitHub, fluxo indireto (Rapid Dev).
7. **Suporte genérico** (recorrente) — Trustpilot fortemente polarizado: 64% cinco estrelas vs 17% uma estrela; respostas "distantes, sem foco no problema".
8. **Sem debug de verdade** (pontual) — sem breakpoints/stack; IA declara bug corrigido sem estar, gastando créditos em "reparos fantasma".

## Base44 (base44.com) — janela ampliada ~6 meses

1. **Bypass total de autenticação** (muito recorrente nas fontes) — Wiz: qualquer app da plataforma podia ser tomado só com o `app_id` (não-secreto) em endpoints não documentados. HN: **122 pontos / 74 comentários** (Wiz, Imperva, Dark Reading).
2. **Créditos queimados por bugs que a própria IA reintroduz** (muito recorrente) — mesmo padrão da Lovable; agravante: a IA pede confirmação a cada passo ("type yes every single time, wasting credits") e créditos não acumulam para o mês seguinte.
3. **Suporte lento, reembolso difícil** (recorrente) — dias de espera, tickets públicos de reembolso no próprio fórum de feedback.
4. **Marketing > substância** (recorrente) — HN: "só conheço a Base44 pelo bombardeio de ads no YouTube"; "estouraram o orçamento em ads em vez de engenheiros".
5. **Teto de MVP** (recorrente) — quem tenta crescer além do MVP "conta outra história" (Emergent).
6. **Só web app** (pontual) — publicar em app store é difícil e demorado.
7. **Incerteza pós-aquisição Wix** (pontual) — ceticismo, ainda sem volume de queixa.

## Google Stitch (stitch.withgoogle.com) — janela 6 meses, sinal fraco

Sem threads substanciais de Reddit; não listado em G2/Capterra; threads HN de 1–5 pontos. É ferramenta de **design/UI** (não gera backend/deploy), então escapa das falhas de segurança, mas:

1. **Output com "cara de IA", genérico** (muito recorrente) — sem edição fina pós-geração (Superdesign).
2. **Teto diário de créditos sem opção de pagar** (muito recorrente) — pedido nº1 no fórum oficial do Google.
3. **Sem design system/marca** (recorrente) — não impõe tokens, componentes ou brand guidelines; cor da marca é re-promptada à mão toda vez (Mindstudio).
4. **Código exportado ≠ produção** (recorrente) — Tailwind/Flutter "usável mas não shippável sem review"; dados mock, sem auth/API reais.
5. **Solo tool** (pontual) — sem colaboração de time; export Figma restrito ao modo experimental; hangs ocasionais.
6. **Risco estrutural** (sinal de analistas) — beta experimental do Google Labs sem tier pago = sem compromisso de longo prazo.

---

## O que isso significa para a Polaris

Cada crítica dominante mapeia para algo que o Motor (Teams) **já faz por arquitetura**, não por promessa:

| Crítica dominante do mercado | Resposta estrutural da Polaris |
|------------------------------|--------------------------------|
| "Conserta um, quebra outro", sem revisão | Time com **reviewer obrigatório**; cada task julgada pelo próprio diff (F010); não é um modelo solo iterando às cegas |
| Cobrança por tentativa (créditos queimados em loop) | Preço por **entrega**, não por prompt — o custo do retrabalho é nosso, não do cliente |
| Protótipo que trava nos 30% finais | Saída = **código real em repositório git + deploy em produção** — o mesmo pipeline que já shipou sites reais |
| RLS quebrado / auth bypass da plataforma-mãe | O site entregue **não roda "dentro" da Polaris**: é um site próprio, estático/SSR, sem backend compartilhado exposto |
| SPA shell vazio, invisível pro Google | Sites saem **SSR/SSG com HTML real**, sitemap, schema.org — e o playbook SEO/GEO/AEO da ROI Labs aplicado |
| Lock-in / exportação com fricção | O repositório é do cliente **desde o primeiro commit**; deploy onde quiser |
| Design genérico "cara de IA" | Design dirigido por design system definido por projeto, não template default |
| Suporte distante | Fase concierge é literalmente **humano no loop** |

A proposta de home que operacionaliza isso está em `03-home-sites.md`.
