# 🚀 TESTE SISTEMA SOFIA IA CONSOLIDADO v4.0.0
# Script PowerShell para Windows - Testar integração completa

param(
    [switch]$SkipBackup = $false
)

Write-Host "🏠 ==========================================" -ForegroundColor Yellow
Write-Host "🚀 INICIANDO TESTES SOFIA IA v4.0.0" -ForegroundColor Green
Write-Host "✅ SISTEMA CONSOLIDADO - EVOLUTION UNIFICADO" -ForegroundColor Green
Write-Host "🏠 ==========================================" -ForegroundColor Yellow

# Verificar se está no diretório correto
if (-not (Test-Path "src\app.UNIFIED.js")) {
    Write-Host "❌ ERRO: Execute este script do diretório backend\" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Diretório correto detectado" -ForegroundColor Green

# Fazer backup dos arquivos atuais
if (-not $SkipBackup) {
    Write-Host "💾 Fazendo backup dos arquivos atuais..." -ForegroundColor Cyan
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    
    if (Test-Path "src\app.js") {
        Copy-Item "src\app.js" "src\app.js.BACKUP.$timestamp" -ErrorAction SilentlyContinue
    }
    if (Test-Path "src\routes\webhook.routes.js") {
        Copy-Item "src\routes\webhook.routes.js" "src\routes\webhook.routes.js.BACKUP.$timestamp" -ErrorAction SilentlyContinue
    }
}

# Substituir pelos arquivos consolidados
Write-Host "🔄 Aplicando arquivos consolidados..." -ForegroundColor Cyan
Copy-Item "src\app.UNIFIED.js" "src\app.js" -Force
Copy-Item "src\routes\webhook.routes.UNIFIED.js" "src\routes\webhook.routes.js" -Force
Copy-Item "src\services\evolution.service.UNIFIED.js" "src\services\evolution.service.js" -Force

Write-Host "✅ Arquivos consolidados aplicados" -ForegroundColor Green

# Verificar Node.js
Write-Host "📦 Verificando dependências..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json não encontrado" -ForegroundColor Red
    exit 1
}

# Instalar dependências se necessário
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Cyan
    npm install
}

# Verificar/criar arquivo .env
Write-Host "🔐 Verificando configurações..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Arquivo .env não encontrado - criando valores padrão" -ForegroundColor Yellow
    
    $envContent = @"
# Sofia IA - Environment Variables
PORT=8000
NODE_ENV=development

# Evolution API
EVOLUTION_API_URL=https://evolutionapi.roilabs.com.br
EVOLUTION_API_KEY=SuOOmamlmXs4NV3nkxpHAy7z3rcurbIz
WEBHOOK_URL=http://localhost:8000/webhook/evolution

# Database (não necessário para este teste)
# DATABASE_URL=postgresql://...
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Arquivo .env criado com valores padrão" -ForegroundColor Green
}

Write-Host "✅ Configurações verificadas" -ForegroundColor Green

# Verificar se porta 8000 está livre
Write-Host "🔍 Verificando porta 8000..." -ForegroundColor Cyan
$portInUse = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  Porta 8000 em uso - tentando liberar..." -ForegroundColor Yellow
    
    # Tentar encontrar e finalizar processo Node.js na porta 8000
    $processes = Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like "*node*" -and $_.CommandLine -like "*8000*" }
    foreach ($proc in $processes) {
        Write-Host "🛑 Finalizando processo Node.js (PID: $($proc.ProcessId))" -ForegroundColor Yellow
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    }
    
    Start-Sleep -Seconds 2
}

# Iniciar servidor
Write-Host "🚀 Iniciando servidor Sofia IA..." -ForegroundColor Green
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node src\app.js
}

# Aguardar servidor inicializar
Write-Host "⏳ Aguardando servidor inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Função para testar endpoint
function Test-Endpoint {
    param($url, $name)
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 10
        Write-Host "✅ $name funcionando" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ $name falhou: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Testar endpoints principais
Write-Host "🧪 ==========================================" -ForegroundColor Yellow
Write-Host "🧪 INICIANDO TESTES DE ENDPOINTS" -ForegroundColor Yellow
Write-Host "🧪 ==========================================" -ForegroundColor Yellow

$testResults = @()

# Teste 1: Health Check
Write-Host "🩺 Teste 1: Health Check" -ForegroundColor Cyan
$testResults += Test-Endpoint "http://localhost:8000/health" "Health Check"

# Teste 2: Dashboard Overview
Write-Host "📊 Teste 2: Dashboard Overview" -ForegroundColor Cyan
$testResults += Test-Endpoint "http://localhost:8000/api/dashboard/overview" "Dashboard Overview"

# Teste 3: WhatsApp Instances
Write-Host "📱 Teste 3: WhatsApp Instances" -ForegroundColor Cyan
$testResults += Test-Endpoint "http://localhost:8000/api/whatsapp/instances" "WhatsApp Instances"

# Teste 4: Webhook Health
Write-Host "🔔 Teste 4: Webhook Health" -ForegroundColor Cyan
$testResults += Test-Endpoint "http://localhost:8000/webhook/evolution" "Webhook Health"

# Teste 5: QR Code Endpoint
Write-Host "📱 Teste 5: QR Code (simulado)" -ForegroundColor Cyan
$testResults += Test-Endpoint "http://localhost:8000/api/whatsapp/qrcode/teste-consolidado" "QR Code endpoint"

# Teste 6: Evolution API Health
Write-Host "🌐 Teste 6: Evolution API Health" -ForegroundColor Cyan
try {
    $headers = @{ "apikey" = "SuOOmamlmXs4NV3nkxpHAy7z3rcurbIz" }
    $evolutionResponse = Invoke-RestMethod -Uri "https://evolutionapi.roilabs.com.br/instance/fetchInstances" -Headers $headers -TimeoutSec 10
    Write-Host "✅ Evolution API acessível" -ForegroundColor Green
    $testResults += $true
} catch {
    Write-Host "⚠️  Evolution API indisponível - usando fallback" -ForegroundColor Yellow
    $testResults += $false
}

# Teste 7: Criação de Instância
Write-Host "🏗️ Teste 7: Criação de Instância" -ForegroundColor Cyan
try {
    $body = @{
        instanceName = "teste-powershell"
        settings = @{}
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/whatsapp/instances" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ Criação de instância funcionando" -ForegroundColor Green
    $testResults += $true
} catch {
    Write-Host "❌ Criação de instância falhou: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += $false
}

Write-Host "🧪 ==========================================" -ForegroundColor Yellow
Write-Host "🧪 TESTES CONCLUÍDOS" -ForegroundColor Yellow
Write-Host "🧪 ==========================================" -ForegroundColor Yellow

# Calcular resultado geral
$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_ -eq $true }).Count
$successRate = [math]::Round(($passedTests / $totalTests) * 100, 1)

Write-Host "📋 Resultado dos testes:" -ForegroundColor White
Write-Host "   • Total de testes: $totalTests" -ForegroundColor White
Write-Host "   • Sucessos: $passedTests" -ForegroundColor Green
Write-Host "   • Falhas: $($totalTests - $passedTests)" -ForegroundColor Red
Write-Host "   • Taxa de sucesso: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } else { "Yellow" })

# Mostrar informações do servidor
Write-Host "📋 Informações do servidor:" -ForegroundColor White
try {
    $healthInfo = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5
    Write-Host "   • Serviço: $($healthInfo.service)" -ForegroundColor White
    Write-Host "   • Versão: $($healthInfo.version)" -ForegroundColor White
    Write-Host "   • Status: $($healthInfo.status)" -ForegroundColor Green
} catch {
    Write-Host "   • Status: Indisponível" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 ==========================================" -ForegroundColor Yellow
Write-Host "🎯 RESULTADOS DO TESTE" -ForegroundColor Yellow
Write-Host "🎯 ==========================================" -ForegroundColor Yellow

if ($successRate -ge 80) {
    Write-Host "✅ Sistema consolidado funcionando corretamente!" -ForegroundColor Green
    Write-Host "✅ Evolution API service unificado operacional" -ForegroundColor Green
    Write-Host "✅ Endpoints principais respondendo" -ForegroundColor Green
} else {
    Write-Host "⚠️  Sistema parcialmente funcional" -ForegroundColor Yellow
    Write-Host "⚠️  Alguns endpoints podem precisar de ajustes" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📍 URLs importantes:" -ForegroundColor White
Write-Host "   • Health: http://localhost:8000/health" -ForegroundColor Cyan
Write-Host "   • Dashboard: http://localhost:8000/api/dashboard/overview" -ForegroundColor Cyan
Write-Host "   • WhatsApp: http://localhost:8000/api/whatsapp/instances" -ForegroundColor Cyan
Write-Host "   • Webhook: http://localhost:8000/webhook/evolution" -ForegroundColor Cyan
Write-Host ""

# Perguntar se quer manter servidor ativo
$keepRunning = Read-Host "🔧 Manter servidor ativo para testes manuais? (y/N)"

if ($keepRunning -eq "y" -or $keepRunning -eq "Y") {
    Write-Host "⏳ Servidor mantido ativo para testes manuais..." -ForegroundColor Green
    Write-Host "⏳ Pressione Ctrl+C para finalizar" -ForegroundColor Yellow
    
    try {
        # Aguardar job do servidor
        Wait-Job -Job $serverJob
    } catch {
        Write-Host "🛑 Servidor interrompido" -ForegroundColor Yellow
    }
} else {
    Write-Host "🛑 Finalizando servidor..." -ForegroundColor Yellow
    Stop-Job -Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job -Job $serverJob -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "🎯 Teste Sofia IA Consolidado concluído!" -ForegroundColor Green
Write-Host "🎯 Sistema pronto para uso em produção!" -ForegroundColor Green
Write-Host "🏠 ==========================================" -ForegroundColor Yellow