# 🛑 FORÇAR PARADA PORTA 8000 E REINICIAR SOFIA IA
Write-Host "🛑 FORÇAR PARADA E REINICIAR BACKEND SOFIA IA" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow

# 🔍 Encontrar processo na porta 8000
Write-Host "`n🔍 Procurando processo na porta 8000..." -ForegroundColor Cyan
$process = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -First 1

if ($process) {
    $pid = $process.OwningProcess
    Write-Host "📍 Processo encontrado: PID $pid" -ForegroundColor Yellow
    
    # 🛑 Matar processo específico
    Write-Host "🛑 Finalizando processo PID $pid..." -ForegroundColor Red
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    
    if ($?) {
        Write-Host "✅ Processo finalizado com sucesso" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao finalizar processo" -ForegroundColor Red
    }
} else {
    Write-Host "ℹ️ Nenhum processo encontrado na porta 8000" -ForegroundColor Gray
}

# ⏳ Aguardar liberação da porta
Write-Host "`n⏳ Aguardando 2 segundos..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# 🔍 Verificar se porta foi liberada
Write-Host "🔍 Verificando se porta 8000 foi liberada..." -ForegroundColor Cyan
$stillRunning = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

if ($stillRunning) {
    Write-Host "⚠️ Porta ainda em uso - forçando limpeza adicional..." -ForegroundColor Yellow
    taskkill /f /im node.exe 2>$null
    Start-Sleep -Seconds 2
} else {
    Write-Host "✅ Porta 8000 liberada com sucesso" -ForegroundColor Green
}

# 📁 Navegar para diretório
Write-Host "`n📁 Navegando para diretório backend..." -ForegroundColor Cyan
Set-Location "C:\Users\jeanz\OneDrive\Desktop\ROI Labs\Imob\Sofia IA\backend"

# 🚀 Iniciar backend
Write-Host "`n🚀 Iniciando Sofia IA Backend v2.3.0..." -ForegroundColor Green
Write-Host "🎯 QR Code Production Service carregando..." -ForegroundColor Green
Write-Host ""

# Executar o backend
node src\app.js

Write-Host "`n❌ Backend finalizado" -ForegroundColor Red
Read-Host "Pressione Enter para sair"
