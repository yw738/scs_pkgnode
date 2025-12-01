@echo off

REM 打开第一个应用
start "" "C:\Path\To\App1.exe"

REM 打开第二个应用
start "" "C:\Path\To\App2.exe"

REM 等待前面程序启动 3 秒（可选）
timeout /t 3 /nobreak >nul

REM 打开第三个应用
start "" "C:\Path\To\App3.exe"

exit
