@echo off
REM ExcelMCP Server 启动脚本

echo 启动 ExcelMCP Server...
echo.

cd /d "%~dp0"

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
)

REM 启动服务器
echo 服务器运行在端口 3001
echo 按 Ctrl+C 停止服务器
echo.

node server.js

pause
