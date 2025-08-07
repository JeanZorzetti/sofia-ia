@echo off
echo.
echo =======================================
echo 🔧 TESTE CORS CORRIGIDO - SOFIA IA
echo =======================================
echo.
echo 🎯 Testando acesso de sofia-dash.roilabs.com.br
echo    para sofia-api.roilabs.com.br
echo.

echo ============================================
echo 📊 1. TESTE HEALTH CHECK COM CORS DEBUG
echo ============================================
curl -v -H "Origin: https://sofia-dash.roilabs.com.br" ^
     -H "Access-Control-Request-Method: GET" ^
     -H "Access-Control-Request-Headers: Content-Type" ^
     -X OPTIONS "http://localhost:8000/health"

echo.
echo ============================================
echo 📊 2. TESTE DASHBOARD OVERVIEW COM CORS
echo ============================================
curl -v -H "Origin: https://sofia-dash.roilabs.com.br" ^
     -H "Content-Type: application/json" ^
     "http://localhost:8000/api/dashboard/overview"

echo.
echo ============================================
echo 📱 3. TESTE WHATSAPP INSTANCES COM CORS
echo ============================================
curl -v -H "Origin: https://sofia-dash.roilabs.com.br" ^
     -H "Content-Type: application/json" ^
     "http://localhost:8000/api/whatsapp/instances"

echo.
echo ============================================
echo 🎯 4. TESTE REAL TIME STATS COM CORS
echo ============================================
curl -v -H "Origin: https://sofia-dash.roilabs.com.br" ^
     -H "Content-Type: application/json" ^
     "http://localhost:8000/api/realtime/stats"

echo.
echo ============================================
echo ✅ RESULTADO DOS TESTES CORS:
echo ============================================
echo Se os testes mostrarem headers CORS corretos:
echo Access-Control-Allow-Origin: https://sofia-dash.roilabs.com.br
echo.
echo Então o frontend deveria funcionar!
echo.
echo 🔧 Se ainda tiver erro, pode ser cache do browser.
echo    Solução: Ctrl+Shift+R no browser para hard refresh
echo.
pause