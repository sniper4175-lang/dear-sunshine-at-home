@echo off
cd /d "%~dp0"
echo.
echo Dear Sunshine Library rollback
echo ===============================
echo.
echo Drag the PROJECT ROOT folder here and press Enter.
echo The project root is the folder that contains package.json.
echo.
set /p PROJECT=Project folder: 
node "%~dp0RESTORE_BROKEN_PATCH.js" "%PROJECT%"
echo.
pause
