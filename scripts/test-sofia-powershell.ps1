# 🧪 Teste Sofia IA - PowerShell Commands
# Execute cada comando individualmente

Write-Host "🔍 1. Verificar se servidor está rodando..." -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Servidor ativo na porta 8000!" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Servidor não está rodando na porta 8000" -ForegroundColor Red
    Write-Host "Tentando porta 8001..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -Method GET -TimeoutSec 5
        Write-Host "✅ Servidor ativo na porta 8001!" -ForegroundColor Green
        $global:SOFIA_PORT = "8001"
    } catch {
        Write-Host "❌ Nenhum servidor Sofia IA encontrado. Execute o start script primeiro." -ForegroundColor Red
        exit
    }
}

if (-not $global:SOFIA_PORT) {
    $global:SOFIA_PORT = "8000"
}

Write-Host ""
Write-Host "🚀 2. Testando criação de instância WhatsApp..." -ForegroundColor Green

$body = @{
    name = "teste-qr-real-ps"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:$global:SOFIA_PORT/api/whatsapp/instances" -Method POST -Body $body -Headers $headers -TimeoutSec 10
    Write-Host "✅ Instância criada com sucesso!" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Erro ao criar instância:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "📱 3. Testando obtenção de QR Code..." -ForegroundColor Green

try {
    $response = Invoke-WebRequest -Uri "http://localhost:$global:SOFIA_PORT/api/whatsapp/instances/teste-qr-real-ps/qr" -Method GET -TimeoutSec 20
    Write-Host "✅ QR Code obtido!" -ForegroundColor Green
    $qrData = $response.Content | ConvertFrom-Json
    
    if ($qrData.success) {
        Write-Host "🎯 Fonte: $($qrData.data.source)" -ForegroundColor Yellow
        Write-Host "⏰ Expira em: $($qrData.data.expires_in) segundos" -ForegroundColor Yellow
        Write-Host "📷 QR Code: $($qrData.data.qr_data_url.Substring(0, 50))..." -ForegroundColor Cyan
        Write-Host "✅ QR Code real obtido com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro no QR Code: $($qrData.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erro ao obter QR Code:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "📊 4. Verificando estatísticas do webhook..." -ForegroundColor Green

try {
    $response = Invoke-WebRequest -Uri "http://localhost:$global:SOFIA_PORT/webhook/evolution/stats" -Method GET -TimeoutSec 5
    Write-Host "✅ Estatísticas obtidas!" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Erro ao obter estatísticas:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "🎯 TESTE CONCLUÍDO!" -ForegroundColor Green