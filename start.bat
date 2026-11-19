@echo off
title Content Rewards - Campaign Board
cd /d "%~dp0"
echo.
echo   Starting local campaign board with automatic server reload...
echo   Open: http://127.0.0.1:4173
echo.
start "" "http://127.0.0.1:4173"
node watch-server.js
pause
