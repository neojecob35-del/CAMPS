@echo off
title Content Rewards - Preview
cd /d "%~dp0"
node build-preview.js
if errorlevel 1 (
  echo.
  echo Could not reach the local server. Start start.bat first, then run this again.
  pause
  exit /b 1
)
start "" "preview.html"
