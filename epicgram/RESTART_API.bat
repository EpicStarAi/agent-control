@echo off
cd /d "%~dp0"
echo Stopping API on :8788 ...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr 127.0.0.1:8788 ^| findstr LISTENING') do taskkill /F /PID %%a
timeout /t 2 >nul
echo Starting API ...
start "EPICGRAM API" cmd /k node services\api\src\server.mjs
echo Done. New operator endpoints loaded. Keep this window's child open.
