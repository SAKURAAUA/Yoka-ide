@echo off
REM ExcelMCP Server 安装脚本 (Windows)

echo 开始安装 ExcelMCP Server...
echo.

REM 进入项目目录
cd /d "%~dp0"

REM 安装依赖
echo 正在安装依赖...
call npm install

if errorlevel 1 (
    echo 依赖安装失败！
    pause
    exit /b 1
)

echo.
echo ✓ ExcelMCP Server 安装完成！
echo.
echo 使用方式：
echo 1. 启动服务器: npm start 或运行 start-server.bat
echo 2. 在 VS Code 中配置 MCP
echo 3. 在 Copilot Chat 中使用 Excel 工具
echo.
pause
