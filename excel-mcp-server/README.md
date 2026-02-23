# ExcelMCP Server

这是一个 Model Context Protocol (MCP) 服务器，使 GitHub Copilot 能够与 Excel 文件进行交互。

## 安装

### 前置要求

- Node.js 18+
- npm 或 yarn

### 本地安装

```bash
cd excel-mcp-server
npm install
```

## 使用

### 启动服务器

```bash
npm start
```

### 在 VS Code 中配置

编辑 VS Code 的 `settings.json`（或 `%APPDATA%\Code\User\settings.json`）：

```json
{
  "modelContextProtocol": {
    "servers": {
      "excelMCP": {
        "command": "node",
        "args": ["path/to/excel-mcp-server/server.js"],
        "env": {
          "ANTHROPIC_API_KEY": "your-api-key"
        }
      }
    }
  }
}
```

## 可用工具

### 1. read_excel
读取 Excel 文件的内容

**参数：**
- `filePath`（必需）：Excel 文件的路径
- `sheetName`（可选）：工作表名称

**示例：**
```
读取 Excel 文件：C:\data\sales.xlsx 的第一个工作表
```

### 2. write_excel
写入数据到 Excel 文件

**参数：**
- `filePath`（必需）：Excel 文件的路径
- `sheetName`（可选）：工作表名称
- `data`（必需）：要写入的数据数组

### 3. list_sheets
列出 Excel 文件中的所有工作表

**参数：**
- `filePath`（必需）：Excel 文件的路径

### 4. create_excel
创建新的 Excel 文件

**参数：**
- `filePath`（必需）：新 Excel 文件的路径
- `data`（必需）：初始数据数组
- `sheetName`（可选）：工作表名称，默认为 Sheet1

## 许可证

MIT
