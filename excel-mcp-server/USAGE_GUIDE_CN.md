# ExcelMCP 集成指南

## 概述

ExcelMCP 是一个 Model Context Protocol 服务器，使 GitHub Copilot 能够在 VS Code 中与 Excel 文件进行交互。

## 快速开始

### 步骤 1：安装依赖

依赖已在上一步安装完成。

### 步骤 2：启动 ExcelMCP 服务器

在 VS Code 中打开终端并运行：

```bash
cd excel-mcp-server
npm start
```

或在 Windows 上双击 `start-server.bat`

### 步骤 3：配置 VS Code

编辑 VS Code 的 `settings.json`：

**Windows:**
```
%APPDATA%\Code\User\settings.json
```

**Mac:**
```
~/Library/Application Support/Code/user-settings/settings.json
```

**Linux:**
```
~/.config/Code/User/settings.json
```

添加以下配置：

```json
{
  "modelContextProtocol": {
    "servers": {
      "excelMCP": {
        "command": "node",
        "args": [
          "d:\\yoka open IDE\\excel-mcp-server\\server.js"
        ]
      }
    }
  }
}
```

### 步骤 4：在 Copilot Chat 中使用

在 Copilot Chat 中，你现在可以使用以下命令：

```
读取 Excel 文件：d:\data\sales.xlsx

创建一个新的 Excel 文件，包含员工信息：d:\data\employees.xlsx

在 sales.xlsx 中列出所有工作表
```

## 可用工具详解

### 1. read_excel - 读取 Excel 文件

**用途：** 读取 Excel 文件中的数据

**输入参数：**
- `filePath` (必需): Excel 文件的完整路径
- `sheetName` (可选): 工作表名称

**示例：**
- 基本用法：读取 C:\data\data.xlsx
- 指定工作表：读取 C:\data\data.xlsx 的 "销售数据" 工作表

**输出：** JSON 格式的行数据

---

### 2. write_excel - 写入数据到 Excel

**用途：** 将数据写入到 Excel 文件

**输入参数：**
- `filePath` (必需): Excel 文件的路径
- `sheetName` (可选): 工作表名称，默认为 Sheet1
- `data` (必需): 数据数组，每个元素是一行

**示例：**
```
将以下数据写入 C:\data\output.xlsx：
[
  { 姓名: "张三", 部门: "销售部", 工资: 8000 },
  { 姓名: "李四", 部门: "技术部", 工资: 12000 }
]
```

---

### 3. list_sheets - 列出工作表

**用途：** 查看 Excel 文件中有哪些工作表

**输入参数：**
- `filePath` (必需): Excel 文件的路径

**示例：** 列出 C:\data\data.xlsx 中的所有工作表

**输出：** 工作表名称数组

---

### 4. create_excel - 创建新 Excel 文件

**用途：** 从数据创建全新的 Excel 文件

**输入参数：**
- `filePath` (必需): 新文件的保存路径
- `data` (必需): 初始数据数组
- `sheetName` (可选): 工作表名称，默认为 Sheet1

**示例：**
```
创建一个新的 Excel 文件 C:\data\new.xlsx，包含以下数据：
[
  { 产品: "产品A", 价格: 100, 库存: 50 },
  { 产品: "产品B", 价格: 200, 库存: 30 }
]
```

---

## 常见用途示例

### 批量导入数据

```
从这个数据列表创建 Excel 文件：
- 用户 1, 2024-01-01, 100 元
- 用户 2, 2024-01-02, 200 元
- 用户 3, 2024-01-03, 150 元

保存到 D:\data\users.xlsx
```

### 数据分析

```
读取 D:\data\sales.xlsx 并统计每个部门的平均销售额
```

### 数据转换

```
从 D:\data\old.xlsx 读取数据，转换格式后写入 D:\data\new.xlsx
```

## 故障排除

### 问题：找不到文件

确保文件路径是完整的且正确。使用绝对路径通常更可靠。

### 问题：权限错误

确保你有权限读写指定位置的文件。在 Windows 上，可能需要以管理员身份运行 VS Code。

### 问题：工作表名称错误

使用 `list_sheets` 工具先查看文件中有哪些工作表。

### 问题：数据格式错误

确保传递的数据是有效的 JSON 格式，且每行数据的字段名一致。

## 性能提示

- 对于大型 Excel 文件（>10MB），可能需要较长的处理时间
- 避免频繁读取相同文件，考虑缓存数据
- 对于批量操作，尽量合并成单次写入

## 安全提示

- 不要在文件路径中包含敏感信息
- 确保只在受信任的工作区使用此工具
- 避免处理包含个人隐私信息的 Excel 文件

---

**更多帮助？** 在 VS Code 中按 `Ctrl+Shift+P` 搜索 "MCP" 来管理服务器。
