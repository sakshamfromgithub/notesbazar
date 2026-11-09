@echo off
title NoteBazaar - Local Preview
cd /d "%~dp0"
echo ================================================
echo    NoteBazaar - Local Preview Server
echo ================================================
echo.
echo  Browser will open at:  http://localhost:8000
echo  Keep this window OPEN while previewing.
echo  Press Ctrl+C here to stop the server.
echo.
echo  NOTE: Login / notes will fully work only after
echo  you paste your Firebase keys in js\firebase-config.js
echo  (see FIREBASE-SETUP.md). Upload to InfinityFree to go live.
echo.
where python >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000
    python -m http.server 8000
    goto end
)
where py >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000
    py -m http.server 8000
    goto end
)
echo [X] Python not found on this PC.
echo.
echo  Option 1: Install Python from https://www.python.org/downloads/
echo           (tick "Add Python to PATH" while installing), then run this file again.
echo.
echo  Option 2: Skip preview - just upload these files to InfinityFree.
echo           The website works there directly, no Python needed!
echo.
pause
:end
