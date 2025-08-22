@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Applicant Connect - Auto Setup Script
echo ============================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo Minimum required version: Node 18+
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
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Downloading images...
call npm run download-images
if errorlevel 1 (
    echo WARNING: Image download failed, but continuing...
)

echo.
echo Setup complete!
echo.
echo Available commands:
echo   npm run dev        - Start development server
echo   npm run build      - Build for production
echo   npm run preview    - Preview production build
echo   npm run download-images - Download/refresh images
echo.
echo Starting development server...
echo Server will be available at: http://localhost:8080
echo Press Ctrl+C to stop the server
echo.

call npm run dev