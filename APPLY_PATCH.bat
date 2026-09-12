@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo Dear Sunshine Song Library 패치
echo ================================================
echo.
echo package.json이 들어 있는 Dear Sunshine 프로젝트 폴더를
echo 아래 창에 끌어다 놓은 뒤 Enter를 눌러주세요.
echo.
set /p PROJECT=프로젝트 폴더: 

node "%~dp0APPLY_PATCH.js" "%PROJECT%"

echo.
pause
