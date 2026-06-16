@echo off
setlocal enabledelayedexpansion
:: تأمين الانتقال لمجلد المشروع حتى عند التشغيل كمسؤول
cd /d "%~dp0"

title ZAEM POS SYSTEM - STARTUP MANAGER

echo ===================================================
echo    ZAEM POS SYSTEM - STARTUP MANAGER
echo ===================================================

:: 1. Backend Service
echo [1/3] Starting Backend Service...
if not exist "backend" (
    echo [ERROR] Backend folder not found at %cd%\backend
    pause
    exit /b
)
cd backend

:: محاولة إصلاح PM2 إذا كان معلقاً
echo Checking PM2 Status...
call pm2 ping >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] PM2 Daemon is stuck. Resetting...
    call pm2 kill >nul 2>&1
)

:: تشغيل السيرفر
echo Launching Backend via PM2...
call pm2 delete zaem-backend >nul 2>&1
call pm2 start ecosystem.config.js

:: التحقق إذا اشتغل PM2 فعلاً
timeout /t 2 >nul
pm2 status zaem-backend | findstr "online" >nul
if %errorlevel% equ 0 (
    echo [SUCCESS] Backend is running via PM2.
) else (
    echo [WARNING] PM2 failed to start. Launching direct mode...
    start "Zaem Backend (Emergency Mode)" cmd /c "npm run start:dev"
)

:: 2. Frontend Setup
echo.
echo [2/3] Starting Frontend UI...
cd /d "%~dp0"
cd frontend

:: تشغيل الواجهة في نافذة جديدة
start "Zaem Frontend UI" cmd /c "npm run dev"

:: 3. فتح المتصفح
echo.
echo [3/3] System is initializing...
timeout /t 8
echo Opening browser...
start http://localhost:5173

echo.
echo ===================================================
echo    DONE! SYSTEM IS RUNNING
echo    Backend: Port 3000 | Frontend: Port 5173
echo ===================================================
pause



git add .
git commit -m "تحديث سعر الوقت المفتوح مع الهلل"
git push origin main
