# Rotação de contas no Claude CLI (3 subscriptions pagas)

Runbook para alternar o Claude Code entre **3 contas pagas** quando uma bate o limite de uso
(janela móvel de ~5h ou cap semanal), em vez de ficar parado até o reset.

> **Plataforma:** Windows 11 + PowerShell. Caminhos assumem `C:\Users\<voce>\.claude`.

---

## Como funciona

O Claude Code guarda a credencial OAuth num **único arquivo de texto**:
`C:\Users\<voce>\.claude\.credentials.json`. Ele mantém **uma conta logada por vez**.

Rotacionar = **trocar esse arquivo** pelo snapshot de outra conta e **reabrir** o `claude`
(as credenciais são lidas no startup do processo).

Mantemos **um único config dir** (`~/.claude`), então todas as suas skills, plugins, agents,
commands e MCP são preservados — diferente de usar `CLAUDE_CONFIG_DIR` com 3 diretórios isolados,
que perderia (ou exigiria replicar) todo o ambiente.

### Arquitetura

```
~/.claude/
├─ .credentials.json          # arquivo "ao vivo" — quem está logado AGORA
└─ accounts/                   # VAULT — secrets, fora do OneDrive e fora do git
   ├─ claude-accounts.ps1      # script núcleo (save / use / next / status)
   ├─ acct1.json               # snapshot de credencial da conta 1
   ├─ acct2.json               # snapshot da conta 2
   ├─ acct3.json               # snapshot da conta 3
   └─ state.json               # conta ativa + labels + limitedUntil
```

**Sync bidirecional (evita invalidar tokens):** o Claude reescreve `.credentials.json` ao renovar
o access token. Por isso, antes de trocar de conta, o script salva o `.credentials.json` atual de
volta no snapshot da conta ativa (captura tokens renovados) e só então copia o snapshot destino
para o arquivo ao vivo. Assim os snapshots nunca ficam stale.

**Seleção limit-aware:** ao rotacionar, a conta atual é marcada como `limitedUntil = agora + 5h` e
o script escolhe a próxima conta livre (round-robin). Se todas estiverem limitadas, pega a de reset
mais próximo.

> ⚠️ **Segurança:** `acct*.json`, `state.json` e `.credentials.json` são **credenciais completas**.
> Ficam **só** em `~/.claude/accounts/` (fora do OneDrive, fora de qualquer repositório).
> **Nunca** copie esses arquivos para `docs/` nem faça commit deles. Este runbook contém apenas
> código e instruções — nenhum token.

---

## Scripts

### 1) Núcleo — `~/.claude/accounts/claude-accounts.ps1`

> ⚠️ **Mantenha o `.ps1` em ASCII** (sem acentos nem travessão `—`). O Windows PowerShell 5.1 lê
> arquivos `.ps1` como ANSI; um `—` UTF-8 vira aspa inteligente e quebra o parse. As mensagens
> abaixo já estão sem acento de propósito — não "corrija" os acentos.

```powershell
# claude-accounts.ps1 - rotaciona subscriptions do Claude Code trocando .credentials.json
# (mensagens em ASCII de proposito: PS 5.1 le .ps1 como ANSI e quebra com acentos/travessao)
[CmdletBinding()]
param(
  [Parameter(Position=0)][ValidateSet('save','use','next','status')]
  [string]$Command = 'status',
  [Parameter(Position=1)][string]$Arg,
  [Parameter(Position=2)][string]$Label
)
$ErrorActionPreference = 'Stop'
$ClaudeDir = Join-Path $env:USERPROFILE '.claude'
$LiveCreds = Join-Path $ClaudeDir '.credentials.json'
$Vault     = Join-Path $ClaudeDir 'accounts'
$StateFile = Join-Path $Vault 'state.json'
$WindowHours = 5
if (-not (Test-Path $Vault)) { New-Item -ItemType Directory -Path $Vault | Out-Null }

function Load-State {
  if (Test-Path $StateFile) { return Get-Content $StateFile -Raw | ConvertFrom-Json }
  return [pscustomobject]@{ active = 0; accounts = [pscustomobject]@{} }
}
function Save-State($s) { $s | ConvertTo-Json -Depth 6 | Set-Content $StateFile -Encoding utf8 }
function Acct-File($n) { Join-Path $Vault "acct$n.json" }
function Ensure-Acct($s, $n) {
  if (-not $s.accounts.PSObject.Properties["$n"]) {
    $s.accounts | Add-Member -MemberType NoteProperty -Name "$n" `
      -Value ([pscustomobject]@{ label=''; limitedUntil=$null }) -Force
  }
}

switch ($Command) {
  'save' {
    if (-not $Arg) { throw 'uso: claude-accounts save <n> [label]' }
    if (-not (Test-Path $LiveCreds)) { throw "sem credencial ativa em $LiveCreds - faca /login primeiro" }
    Copy-Item $LiveCreds (Acct-File $Arg) -Force
    $s = Load-State; Ensure-Acct $s $Arg
    if ($Label) { $s.accounts."$Arg".label = $Label }
    $s.accounts."$Arg".limitedUntil = $null
    $s.active = [int]$Arg
    Save-State $s
    Write-Host "[acct$Arg] snapshot salvo. $($s.accounts."$Arg".label)" -ForegroundColor Green
  }
  'use' {
    if (-not $Arg) { throw 'uso: claude-accounts use <n>' }
    $target = Acct-File $Arg
    if (-not (Test-Path $target)) { throw "sem snapshot da conta $Arg - rode o setup/save antes" }
    $s = Load-State
    if ([int]$s.active -ge 1 -and (Test-Path $LiveCreds)) {
      Copy-Item $LiveCreds (Acct-File $s.active) -Force   # persiste tokens renovados
    }
    Copy-Item $target $LiveCreds -Force
    Ensure-Acct $s $Arg
    $s.active = [int]$Arg
    Save-State $s
    Write-Host "[acct$Arg] ativa. $($s.accounts."$Arg".label)" -ForegroundColor Cyan
    Write-Host "  -> reabra o 'claude' para a troca valer." -ForegroundColor DarkGray
  }
  'next' {
    $s = Load-State
    $cur = [int]$s.active
    if ($cur -ge 1) {
      Ensure-Acct $s $cur
      $s.accounts."$cur".limitedUntil = (Get-Date).AddHours($WindowHours).ToString('o')
    }
    # ordem round-robin comecando depois da atual
    $order = 1..3 | ForEach-Object { ((($cur - 1) + $_) % 3) + 1 }
    $now = Get-Date
    $pick = $null
    foreach ($n in $order) {
      if (-not (Test-Path (Acct-File $n))) { continue }
      $lim = if ($s.accounts.PSObject.Properties["$n"]) { $s.accounts."$n".limitedUntil } else { $null }
      if (-not $lim -or [datetime]$lim -lt $now) { $pick = $n; break }
    }
    if (-not $pick) {
      # todas limitadas: pega a de reset mais cedo (entre as que tem snapshot)
      $pick = ($order | Where-Object { Test-Path (Acct-File $_) } |
        Sort-Object { [datetime]$s.accounts."$_".limitedUntil } | Select-Object -First 1)
    }
    if (-not $pick) { throw 'nenhuma conta com snapshot disponivel - rode o setup' }
    Save-State $s
    & $PSCommandPath use $pick
  }
  'status' {
    $s = Load-State
    Write-Host "Conta ativa: $($s.active)" -ForegroundColor Cyan
    foreach ($p in $s.accounts.PSObject.Properties) {
      $a = $p.Value
      $lim = if ($a.limitedUntil) { "limitada ate $([datetime]$a.limitedUntil)" } else { 'livre' }
      $mark = if ([int]$p.Name -eq [int]$s.active) { '*' } else { ' ' }
      Write-Host ("  {0} acct{1}  {2,-30} {3}" -f $mark, $p.Name, $a.label, $lim)
    }
    if (Test-Path $LiveCreds) {
      $f = Get-Item $LiveCreds
      Write-Host ("  .credentials.json: {0} bytes, modificado {1}" -f $f.Length, $f.LastWriteTime) -ForegroundColor DarkGray
    }
  }
}
```

### 2) Atalhos — cole no seu `$PROFILE`

Abra com `notepad $PROFILE` (crie se não existir) e cole:

```powershell
# --- Claude account rotation ---
$global:CCScript = Join-Path $env:USERPROFILE '.claude\accounts\claude-accounts.ps1'
function claude-accounts { & $global:CCScript @args }
function ccwho  { & $global:CCScript status }
function cc1    { & $global:CCScript use 1; if ($?) { claude } }
function cc2    { & $global:CCScript use 2; if ($?) { claude } }
function cc3    { & $global:CCScript use 3; if ($?) { claude } }
function ccnext { & $global:CCScript next;  if ($?) { claude } }

# Wrapper interativo semi-automático: roda claude em loop; ao sair, oferece rotacionar+reabrir
function cc {
  while ($true) {
    claude @args
    Write-Host ''
    $ans = Read-Host '[cc] Sessao encerrada. Rotacionar p/ proxima conta e reabrir? (Y/n)'
    if ($ans -match '^(n|no)$') { break }
    & $global:CCScript next
    $args = @()   # apos a 1a rotacao, abre sessao limpa
  }
}

# Wrapper headless auto-retry: captura saida, detecta limite, rotaciona e re-tenta
function ccrun {
  param([Parameter(Mandatory)][string]$Prompt)
  for ($i = 1; $i -le 3; $i++) {
    $out = (claude -p $Prompt 2>&1 | Out-String)
    Write-Host $out
    if ($out -match 'usage limit|rate limit|limit reached|resets? at|429') {
      Write-Host "[ccrun] limite detectado - rotacionando (tentativa $i)..." -ForegroundColor Yellow
      & $global:CCScript next | Out-Host
      continue
    }
    break
  }
}
```

Recarregue o profile: `. $PROFILE`

> **Nota PowerShell 5.1:** `2>&1` em executável nativo embrulha linhas de stderr, mas aqui a saída
> só vira string para o regex — é aceitável. A detecção do wrapper interativo (`cc`) é semi-auto
> por design: a TUI não expõe o buffer ao processo pai. O `ccrun` headless é o caminho de
> auto-detecção real.

---

## Setup (uma vez)

1. Garanta que `claude-accounts.ps1` está em `~/.claude/accounts/` e o snippet está no `$PROFILE`.
2. Para **cada** uma das 3 contas:
   - No `claude`: `/logout`, depois `/login` e autentique na conta N.
   - Saia do `claude` e rode no PowerShell:
     ```powershell
     claude-accounts save 1 "email-ou-rotulo-conta-1"
     # repita para 2 e 3, logando na conta certa antes de cada save
     ```
3. Ao final você fica na conta 3. Confirme com `ccwho`.

---

## Uso diário

| Situação | Comando |
|---|---|
| Bati o limite, quero a próxima conta livre | `/exit` no claude → `ccnext` (troca + reabre) |
| Quero uma conta específica | `cc1` / `cc2` / `cc3` |
| Ver qual conta está ativa e o estado de limite | `ccwho` |
| Sessão longa com rotação semi-automática | iniciar com `cc` em vez de `claude` |
| Tarefa headless com auto-retry na próxima conta | `ccrun "seu prompt"` |

---

## Verificação

1. **Setup ok:** após os 3 `save`, `ccwho` lista 3 contas com labels e marca a ativa (`*`).
2. **Troca real:** `claude-accounts use 1` e depois `use 2` → `.credentials.json` muda de tamanho/
   `LastWriteTime` no `ccwho`.
3. **Limit-aware:** `ccnext` marca a conta atual como "limitada até <agora+5h>" e ativa a próxima.
4. **Sessão real:** após `ccnext`, abra `claude` e mande um prompt — se a conta anterior estava no
   limite e agora responde, a rotação funcionou.
5. **Headless:** `ccrun "diga oi"` responde; com a conta no limite, aparece o log de rotação e a
   resposta vem na 2ª tentativa.
6. **Sync de token:** `use 1` → sessão longa (renova token) → `use 2` → volta `use 1`: o login deve
   persistir sem pedir re-auth.

---

## Troubleshooting

- **Pediu re-login após trocar:** o snapshot daquela conta está velho. Logue de novo e rode
  `claude-accounts save N` para regravar.
- **`state.json` divergiu** (fez `/login` manual sem `save`): rode `ccwho` para ver e um novo
  `save N` para reconciliar.
- **Cap semanal** (não só a janela de 5h): o `limitedUntil` assume 5h; mesmo assim `ccnext`
  rotaciona em round-robin entre as contas restantes. Se todas estiverem no cap semanal, só o reset
  resolve.
- **Troca não fez efeito:** é preciso **reabrir** o `claude` — os atalhos (`cc1/ccnext/cc`) já
  reabrem; se rodou o script direto, abra o `claude` de novo.
- **Política de execução do PowerShell** bloqueando o script:
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
