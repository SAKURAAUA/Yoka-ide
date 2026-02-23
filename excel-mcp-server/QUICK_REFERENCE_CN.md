# ExcelMCP 快速参考

## 🚀 3 步启动

### 1️⃣ 启动服务器
```bash
# Windows: 双击 start-server.bat
# 或命令行:
cd d:\yoka open IDE\excel-mcp-server
npm start
```

### 2️⃣ 配置 VS Code
1. `Ctrl + Shift + P` → 搜索 "Settings JSON"
2. 添加配置（参考完整指南）
3. 重启 VS Code

### 3️⃣ 在 Copilot Chat 中使用
```
在 Copilot Chat 中输入你的需求，
Copilot 会自动调用相关工具
```

---

## 🛠️ 4 个工具一览

| 工具 | 作用 | 命令参数 |
|-----|------|--------|
| **read_excel** | 读取 Excel | filePath, [sheetName] |
| **write_excel** | 写入 Excel | filePath, data, [sheetName] |
| **list_sheets** | 列出工作表 | filePath |
| **create_excel** | 创建 Excel | filePath, data, [sheetName] |

---

## 💬 常用 Copilot 提示

### 读取数据
```
读取 d:\data\file.xlsx 并分析其中的数据
```

### 创建文件
```
创建一个包含以下数据的 Excel 文件：
[数据内容]
保存到 d:\output.xlsx
```

### 列出工作表
```
d:\data\file.xlsx 中有哪些工作表？
```

### 数据转换
```
从 d:\input.xlsx 读取数据并将其转换为...
然后保存到 d:\output.xlsx
```

---

## ⚠️ 常见错误及解决

| 错误 | 解决方案 |
|-----|--------|
| 找不到文件 | 使用完整路径：D:\folder\file.xlsx |
| 权限错误 | 以管理员运行 VS Code |
| 服务器未运行 | 重新启动 start-server.bat |
| Copilot 无响应 | 重启 VS Code，检查配置 |

---

## 📁 文件位置

```
d:\yoka open IDE\excel-mcp-server\
├── start-server.bat          ← Windows 快速启动
├── server.js                 ← 服务器程序
├── test_data.xlsx           ← 测试数据
└── 文档.md                   ← 各种指南
```

---

## 🔑 关键概念

- **MCP 服务器**：后台运行的程序，提供 Excel 工具给 Copilot
- **工作表**：Excel 文件中的页签标签
- **JSON 数据**：工具传输数据的格式
- **绝对路径**：从磁盘根开始的完整文件路径

---

## 📖 进一步学习

- **完整配置指南**：[COMPLETE_SETUP_GUIDE_CN.md](./COMPLETE_SETUP_GUIDE_CN.md)
- **详细使用说明**：[USAGE_GUIDE_CN.md](./USAGE_GUIDE_CN.md)
- **安装完成信息**：[INSTALLATION_COMPLETE_CN.md](./INSTALLATION_COMPLETE_CN.md)

---

**保存此页面以便快速查阅！** 📌
