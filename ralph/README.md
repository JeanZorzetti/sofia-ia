# Ralph — loop autônomo sobre o Spec Kit (Polaris IA)

Protótipo do padrão **Ralph** (loop autônomo de Claude Code) adaptado do
[frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code), feito
para **conviver com o Spec Kit** já instalado neste repo (`.specify/` + `.claude/skills/`).

## Como funciona
Cada iteração é uma invocação **headless** do Claude Code (`claude -p`) com **contexto novo**.
O agente implementa **uma** task pendente (`- [ ]`) de `specs/<feature>/tasks.md`, roda o gate
de build, commita e para. O `ralph.ps1` re-invoca até não sobrar `- [ ]` (ou bater uma parada).

```
ralph.ps1  ──(loop)──>  claude -p < PROMPT.md  ──>  implementa 1 task  ──>  gate  ──>  commit
   ▲                                                                                      │
   └──────────────── lê STATUS.txt + conta `- [ ]` em tasks.md ◄──────────────────────────┘
```

O **Spec Kit continua sendo o cérebro**: spec.md / plan.md / tasks.md / constitution.md são a
fonte de verdade. O Ralph é só o motorista fino que dá contexto novo por task e persiste o
progresso entre rate limits. Sem framework paralelo de memória/hooks/agent-teams (que colidiria
com `.claude/skills` e com o próprio produto Teams da Polaris).

## Pré-requisitos
- `claude` (Claude Code CLI) no PATH.
- A feature-alvo já com `tasks.md` gerado: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks`.

## Uso
```powershell
# 1 task por vez, com confirmação de permissão (mais seguro p/ testar):
pwsh ralph/ralph.ps1 -FeatureDir specs/002-dashboard-teams

# Autônomo de verdade (sem prompts de permissão — git/npm liberados):
pwsh ralph/ralph.ps1 -FeatureDir specs/002-dashboard-teams -Yolo -MaxIterations 8 -CooldownSec 45
```

## As 3 amarras (da constituição) embutidas
1. **Escopo = UM `tasks.md`, nunca o roadmap inteiro.** `-FeatureDir` aponta para UMA feature.
   Constituição: "um sprint/feature por sessão; não avançar automaticamente".
2. **Gate por iteração, ajustado ao OneDrive.** Antes de commitar: `npm run typecheck` +
   `npm run build` exigindo `Compiled successfully` — **ignorando** a falha de cópia do
   `standalone` (`errno -4094`, ambiental). "1 task = 1 verde". O verde definitivo é o CI/EasyPanel.
3. **Tasks human-gated = parada dura.** Migração de schema (princípio III: `migrate deploy`
   MANUAL no host real `2.24.207.200:5435`) e "E2E em prod"/deploy NÃO são autônomos. Marque
   essas tasks com `[HUMAN]` no `tasks.md`; o agente escreve `RALPH_HALT:` em `STATUS.txt` e o
   loop para.

## Segurança / limites
- `-MaxIterations` (default 12) e `-CooldownSec` (default 60s) — teto de iterações + intervalo
  para não estourar rate limit.
- **Detecção de stall**: se nada progride em 2 iterações seguidas sem `RALPH_HALT`, o loop aborta.
- `-Yolo` usa `--dangerously-skip-permissions` (necessário p/ git/npm rodarem sem prompt). Use só
  num diretório versionado e com o gate confiável — é o "feche o loop de feedback antes de soltar"
  do playbook de operação de agentes.
- O agente faz **o próprio commit** (este repo **não** tem hook de commit no `.specify`; e o hook
  `agent-context` está quebrado neste ambiente — por isso um loop que cuida do próprio git encaixa
  melhor que um que depende da execução de hooks do Spec Kit).

## Arquivos
- `PROMPT.md` — o "auto-prompt" de cada iteração (instruções + amarras + não-negociáveis).
- `ralph.ps1` — o loop (exit detection, stall, cooldown, yolo).
- `STATUS.txt` — log append-only que o agente escreve (`RALPH_OK:` / `RALPH_HALT:`); criado na 1ª run.
