@echo off
chcp 65001 > nul
cd /d "%~dp0\.."
echo ============================================================
echo   RÉINITIALISATION DU SERVEUR (RESET DONNÉES DE TEST)
echo ============================================================
echo.
node tools/clean-test-data.mjs
echo.
pause
