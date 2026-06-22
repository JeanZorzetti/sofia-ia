# Phase 1 — Quickstart: Validação da Sidebar UX

Roteiro de validação manual/E2E que prova a feature ponta a ponta. Mapeia cenários de aceitação (spec) e critérios de sucesso (SC).

## Pré-requisitos

- App rodando (desenvolvimento Windows+OneDrive: `next dev --webpack` — Turbopack quebra nesse ambiente).
- Login no dashboard em viewport ≥ `lg` (a sidebar é desktop-only).
- DevTools aberto (aba Elements para conferir ausência de layout shift; Application → Local Storage para a chave de persistência).

## Cenário 1 — Rail + expansão por hover (US1)

1. Carregar `/dashboard` sem preferência salva → sidebar inicia como **rail de ícones**. *(FR-001)*
2. Passar o mouse sobre a sidebar → expande mostrando rótulos, workspace selector e cartões do rodapé em < 150 ms. *(FR-002/FR-004, SC-002)*
3. Observar o conteúdo principal **não** se mover durante a expansão (Elements: bounding box do `<main>` inalterado). *(FR-003, SC-003)*
4. Tirar o mouse → recolhe ao rail. *(FR-002)*
5. No rail, passar o mouse sobre um ícone → tooltip com o nome; rota ativa destacada. *(FR-005/FR-006, SC-004)*

## Cenário 2 — Barra de rolagem (US2)

1. Reduzir a altura da janela até a lista do menu transbordar.
2. Passar o mouse/rolar a área do menu → indicador fino e discreto aparece. *(FR-010, SC-006)*
3. Conferir que os itens **não** deslocam horizontalmente quando o indicador surge. *(FR-011)*
4. Parar de interagir → indicador some discretamente. *(FR-010)*
5. Aumentar a janela até tudo caber → nenhum indicador. *(FR-012, SC-006)*

## Cenário 3 — Fixar + persistência (US3)

1. Acionar o controle **fixar** → sidebar trava expandida e o `<main>` acomoda-se ao lado (footprint in-flow). *(FR-007)*
2. Application → Local Storage: `sofia_sidebar_pinned = '1'`. *(FR-009)*
3. Recarregar a página → sidebar reabre **fixada**. *(FR-009, SC-005)*
4. Acionar **soltar** → volta ao rail/hover; `sofia_sidebar_pinned = '0'`; recarregar confirma rail. *(FR-008/FR-009)*

## Cenário 4 — Robustez & acessibilidade (US4)

1. A partir do rail, navegar por **Tab** até um item da sidebar → ela expande (focus-within). *(FR-013, SC-007)*
2. Navegar somente por teclado até qualquer seção → alcançável sem mouse. *(SC-007)*
3. Ativar "reduzir movimento" no SO → expandir/recolher ocorre **sem** animação. *(FR-014)*
4. Abrir o seletor de workspace e mover o mouse até o menu suspenso (saindo da sidebar) → a sidebar **permanece** expandida até o menu fechar. *(FR-015)*

## Não-regressão

- Todos os links levam às rotas corretas; destaque de ativo correto. *(FR-016)*
- Workspace selector troca de workspace como antes; cartões do rodapé com links intactos.
- Nenhuma requisição de rede nova introduzida pela sidebar (Network limpo além das já existentes `usage`/`organizations`).

## Gate real (constituição V — verificação antes de concluir)

Validação E2E **autenticada em produção** (EasyPanel + login em `polarisia.com.br`) após deploy é o gate final; testes locais de score/visual nesta máquina (Windows+OneDrive) são indicativos, não definitivos.
