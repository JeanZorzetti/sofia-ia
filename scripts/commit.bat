@echo off

echo.
echo =================================================
echo    SCRIPT DE COMMIT E PUSH PARA O GITHUB
echo =================================================
echo.

echo Adicionando todos os arquivos modificados ao stage...
git add .
echo Arquivos adicionados.

echo.
set /p commit_message="Digite a mensagem do commit e pressione ENTER: "

echo.
echo Realizando o commit com a mensagem...
git commit -m "%commit_message%"


echo.
echo Enviando alteracoes para o GitHub (origin main)...
git push origin main


echo.
echo =================================================
echo   PROCESSO CONCLUIDO COM SUCESSO!
echo =================================================
echo.

pause
