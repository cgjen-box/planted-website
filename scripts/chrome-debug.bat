@echo off
REM Chrome Debug Mode Launcher for Website Review Capability
REM Launches Chrome with remote debugging enabled on port 9222
REM Uses persistent profile for authenticated sessions

SET CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
SET PROFILE_DIR=%USERPROFILE%\.chrome-debug-profile
SET DEBUG_PORT=9222

REM Create profile directory if it doesn't exist
if not exist "%PROFILE_DIR%" mkdir "%PROFILE_DIR%"

REM Check if Chrome is already running on debug port
netstat -ano | findstr ":%DEBUG_PORT%" > nul
if %ERRORLEVEL% equ 0 (
    echo Chrome debug instance already running on port %DEBUG_PORT%
    echo Connect with: --browserUrl=http://127.0.0.1:%DEBUG_PORT%
    exit /b 0
)

echo Starting Chrome with remote debugging...
echo Profile: %PROFILE_DIR%
echo Port: %DEBUG_PORT%

start "" %CHROME_PATH% ^
    --remote-debugging-port=%DEBUG_PORT% ^
    --user-data-dir="%PROFILE_DIR%" ^
    --no-first-run ^
    --no-default-browser-check ^
    --disable-features=Translate ^
    --disable-popup-blocking ^
    --disable-infobars

timeout /t 3 /nobreak > nul

echo.
echo Chrome started successfully!
echo.
echo You can now:
echo   1. Login to admin.planted.com in the Chrome window (for production auth)
echo   2. Run website reviews with: /review-website [local^|admin^|prod]
echo   3. Your auth state will persist across sessions
echo.
echo Profile directory: %PROFILE_DIR%
echo Debug URL: http://127.0.0.1:%DEBUG_PORT%
