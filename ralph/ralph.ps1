<#
  Ralph — loop autônomo de execução de tasks do Spec Kit (Polaris IA).
  Padrão "Ralph" (Geoffrey Huntley) adaptado ao frankbria/ralph-claude-code,
  com as 3 amarras da constituição da Polaris embutidas.

  Cada iteração = uma invocação HEADLESS do Claude Code (`claude -p`) com contexto
  NOVO, que implementa UMA task pendente de $FeatureDir/tasks.md e para.

  Uso:
    pwsh ralph/ralph.ps1 -FeatureDir specs/002-dashboard-teams
    pwsh ralph/ralph.ps1 -FeatureDir specs/002-dashboard-teams -MaxIterations 8 -CooldownSec 45 -Yolo

  Pré-requisitos: `claude` no PATH; a feature já com tasks.md gerado (/speckit-tasks).
#>
param(
  [Parameter(Mandatory = $true)][string]$FeatureDir,
  [int]$MaxIterations = 12,
  [int]$CooldownSec = 60,
  # -Yolo usa --dangerously-skip-permissions (necessário p/ git/npm sem prompt).
  # Sem -Yolo, usa --permission-mode acceptEdits (edições sem prompt; git/npm podem pedir).
  [switch]$Yolo
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot   # ralph/ mora na raiz do repo
Set-Location $repo

$tasks      = Join-Path $repo "$FeatureDir/tasks.md"
$promptFile = Join-Path $PSScriptRoot 'PROMPT.md'
$status     = Join-Path $PSScriptRoot 'STATUS.txt'

if (-not (Test-Path $tasks)) {
  Write-Error "tasks.md não encontrado em $tasks. Rode /speckit-tasks para essa feature antes."
  exit 1
}
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Error 'CLI `claude` não está no PATH.'
  exit 1
}

$permArgs = if ($Yolo) { @('--dangerously-skip-permissions') } else { @('--permission-mode', 'acceptEdits') }

function Count-Open { (Select-String -Path $tasks -Pattern '^\s*- \[ \]').Count }

"== Ralph start $(Get-Date -Format o) feature=$FeatureDir perm=$($permArgs -join ' ') ==" |
  Out-File $status -Encoding utf8

$prev = -1
for ($i = 1; $i -le $MaxIterations; $i++) {
  $open = Count-Open
  if ($open -eq 0) { Write-Host "✓ Todas as tasks de $FeatureDir estão [X]. Concluído." -ForegroundColor Green; break }

  Write-Host "── Iteração $i/$MaxIterations — $open task(s) pendente(s) ──" -ForegroundColor Cyan
  $prompt = (Get-Content $promptFile -Raw) -replace '\$FEATURE_DIR', $FeatureDir

  # Invocação headless, contexto novo. O prompt vai por stdin.
  $prompt | claude -p @permArgs

  # Lê o que o agente auto-reportou nesta volta.
  $last = (Get-Content $status -Tail 1)
  if ($last -match '^RALPH_HALT') {
    Write-Host "🛑 $last" -ForegroundColor Yellow
    Write-Host 'Loop parado — ação humana necessária. Resolva e re-execute.' -ForegroundColor Yellow
    break
  }

  # Detecção de stall: nada progrediu e não houve HALT explícito → não queime iterações.
  $now = Count-Open
  if ($now -eq $open -and $now -eq $prev) {
    Write-Host '⚠ Sem progresso em 2 iterações seguidas e sem RALPH_HALT — abortando para não queimar rate limit.' -ForegroundColor Yellow
    "RALPH_HALT: stall (sem progresso em 2 iterações)" | Add-Content $status
    break
  }
  $prev = $open

  if ($i -lt $MaxIterations -and $now -gt 0) {
    Write-Host "   cooldown ${CooldownSec}s…" -ForegroundColor DarkGray
    Start-Sleep -Seconds $CooldownSec
  }
}

Write-Host "== Ralph end $(Get-Date -Format o) — restam $(Count-Open) task(s) ==" -ForegroundColor Cyan
Write-Host "Log de status: $status"
