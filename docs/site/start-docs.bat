@echo off
title SAST Integration Documentation Server
echo.
echo ========================================
echo   SAST Integration Documentation Server
echo ========================================
echo.
echo Starting server on http://localhost:8000
echo Press Ctrl+C to stop.
echo.

REM Try Python 3 first, then Python 2
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "" http://localhost:8000
    python -m http.server 8000
) else (
    where python3 >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        start "" http://localhost:8000
        python3 -m http.server 8000
    ) else (
        echo ERROR: Python not found.
        echo Please install Python 3 from https://www.python.org
        echo.
        pause
        exit /b 1
    )
)
