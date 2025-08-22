@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Applicant Connect - Complete Installer
echo ============================================
echo.

:: Get current directory
set "PROJECT_DIR=%~dp0"
set "PROJECT_NAME=Applicant Connect"

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js first:
    echo 1. Go to https://nodejs.org/
    echo 2. Download and install Node.js LTS version
    echo 3. Restart this installer after installation
    echo.
    pause
    exit /b 1
)

:: Display Node version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

:: Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

echo.
echo Installing project dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Installing server dependencies...
cd server
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install server dependencies
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo Downloading project images...
call npm run download-images
if errorlevel 1 (
    echo WARNING: Image download failed, but continuing...
)

echo.
echo Creating desktop shortcut...

:: Create a launcher script
set "LAUNCHER_SCRIPT=%PROJECT_DIR%launch-applicant-connect.bat"
(
@echo off
setlocal
cd /d "%PROJECT_DIR%"
echo Starting Applicant Connect...

:: Start dev server in a separate minimized window so this script can continue
start "Applicant Connect Dev Server" /MIN cmd /c "cd /d "%PROJECT_DIR%" && npm run dev"

echo Waiting for local server to be ready...
:: Try default port 8080 and common fallback 8081 (Vite picks next free port when 8080 is busy)
powershell -NoProfile -ExecutionPolicy Bypass -Command "\
  $ports=@(8080,8081); \
  for($i=0;$i -lt 90;$i++){ \
    foreach($p in $ports){ \
      if((Test-NetConnection -ComputerName 'localhost' -Port $p -InformationLevel Quiet)){ \
        Start-Process ('http://localhost:' + $p + '/'); \
        exit 0 \
      } \
    } \
    Start-Sleep -Seconds 1 \
  }; \
  exit 1"

if errorlevel 1 (
  echo Could not detect running dev server automatically. You can open: http://localhost:8080 or http://localhost:8081
)

:: Exit this launcher; the dev server keeps running in its own window
exit /b 0
) > "%LAUNCHER_SCRIPT%"

:: Create desktop shortcut
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP%\%PROJECT_NAME%.lnk"

:: Use PowerShell to create the shortcut
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%LAUNCHER_SCRIPT%'; $Shortcut.WorkingDirectory = '%PROJECT_DIR%'; $Shortcut.Description = 'Launch Applicant Connect Dashboard'; $Shortcut.Save()"

if exist "%SHORTCUT_PATH%" (
    echo Desktop shortcut created successfully!
) else (
    echo WARNING: Could not create desktop shortcut
)

echo.
echo ============================================
echo           Installation Complete!
echo ============================================
echo.
echo Project installed to: %PROJECT_DIR%
echo Desktop shortcut: %PROJECT_NAME%.lnk
echo.
echo To start the application:
echo 1. Double-click the desktop shortcut, OR
echo 2. Run: %LAUNCHER_SCRIPT%
echo 3. Wait for server to start
echo 4. Open browser to: http://localhost:8080
echo.
echo Available npm commands:
echo   npm run dev        - Start development server
echo   npm run build      - Build for production
echo   npm run server     - Start backend server only
echo   npm run download-images - Refresh images
echo.

:: Ask if user wants to start now
set /p START_NOW="Start Applicant Connect now? (y/n): "
if /i "%START_NOW%"=="y" (
    echo.
    echo Starting Applicant Connect...
    call "%LAUNCHER_SCRIPT%"
) else (
    echo.
    echo Installation complete. Use the desktop shortcut to start later.
    pause
)