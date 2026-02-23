# ExcelMCP 完整配置指南

## 概述

你已成功安装了 ExcelMCP（Excel Model Context Protocol），这个强大的工具使 GitHub Copilot 能够在 VS Code 中与 Excel 文件进行交互。

## 📋 系统要求

- ✅ Node.js 18+ (已检查：已安装依赖)
- ✅ npm (已检查：已成功安装包)
- ✅ VS Code 1.75+
- ✅ GitHub Copilot Chat 扩展
- OS: Windows, macOS 或 Linux

## 步骤 1：启动 ExcelMCP 服务器

### Windows 用户（最简单）

1. 打开文件管理器
2. 导航到：`d:\yoka open IDE\excel-mcp-server`
3. 双击：`start-server.bat`
4. 会打开一个命令行窗口，显示服务器正在运行

### 命令行启动

```bash
cd "d:\yoka open IDE\excel-mcp-server"
npm start
```

### 验证服务器启动成功

如果看到类似输出，说明成功：
```
ExcelMCP 服务器运行在端口 3001
```

**保持这个窗口打开，不要关闭它！**

## 步骤 2：配置 VS Code

### 找到 settings.json

1. 在 VS Code 中按 `Ctrl + Shift + P`
2. 输入：`Preferences: Open Settings (JSON)`
3. 按 Enter 打开设置文件

### 添加 MCP 配置

在打开的 `settings.json` 中，找到 `}` 前面，添加以下配置：

```json
{
  "其他现有设置": "...",
  
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

**重要：确保 JSON 格式正确（没有多余的逗号或缺少的括号）**

## 步骤 3：重启 VS Code

方式1：使用快捷键 `Ctrl + Shift + P`，输入 "File: Exit"，然后重启 VS Code

方式2：直接关闭 VS Code，再打开

## 步骤 4：验证配置

配置完成后：

1. 打开 Copilot Chat（按 `Ctrl + I` 或点击左侧 Copilot 图标）
2. 在聊天框中输入测试内容（参考下面的示例）
3. 观察 Copilot 是否能提供使用工具的建议

## 🎯 使用示例

### 示例 1：读取现有 Excel 文件

**在 Copilot Chat 中输入：**
```
请帮我读取位于 d:\yoka open IDE\excel-mcp-server\test_data.xlsx 的 Excel 文件，
并告诉我这个文件中有哪些员工和他们的销售额。
```

**预期结果：** Copilot 会使用 read_excel 工具读取文件，然后分析数据。

---

### 示例 2：创建新的 Excel 文件

**在 Copilot Chat 中输入：**
```
帮我创建一个新的 Excel 文件，包含以下产品信息：
- 产品A，价格 $99.99，库存 100 件
- 产品B，价格 $149.99，库存 50 件
- 产品C，价格 $199.99，库存 25 件

保存到 d:\data\products.xlsx
```

**预期结果：** Copilot 会使用 create_excel 工具创建文件。

---

### 示例 3：列出工作表

**在 Copilot Chat 中输入：**
```
d:\yoka open IDE\excel-mcp-server\test_multi_sheet.xlsx 这个文件中有哪些工作表？
```

**预期结果：** Copilot 使用 list_sheets 工具列出所有工作表名称。

---

### 示例 4：数据分析

**在 Copilot Chat 中输入：**
```
读取 d:\yoka open IDE\excel-mcp-server\test_data.xlsx 中的数据，
然后统计每个部门的人数和总销售额。
```

**预期结果：** Copilot 读取数据后进行分析和计算。

## 🔍 工具说明

### 1. read_excel - 读取 Excel 文件

**用途：** 获取 Excel 文件中的数据

**参数：**
- `filePath` (必需): 完整文件路径，例如 `D:\data\file.xlsx`
- `sheetName` (可选): 工作表名称，如果不指定则读第一个

**使用场景：**
- 分析 Excel 数据
- 提取特定信息
- 数据验证

---

### 2. write_excel - 写入 Excel 文件

**用途：** 修改或追加数据到既有 Excel 文件

**参数：**
- `filePath` (必需): 文件路径
- `sheetName` (可选): 工作表名称
- `data` (必需): 数据数组

**使用场景：**
- 更新现有数据
- 添加新工作表
- 数据导入

---

### 3. list_sheets - 列出所有工作表

**用途：** 查看 Excel 文件包含哪些工作表

**参数：**
- `filePath` (必需): 文件路径

**使用场景：**
- 浏览文件结构
- 找到特定数据的工作表
- 文件验证

---

### 4. create_excel - 创建 Excel 文件

**用途：** 从数据创建全新的 Excel 文件

**参数：**
- `filePath` (必需): 新文件保存位置
- `data` (必需): 初始数据数组
- `sheetName` (可选): 工作表名称，默认 Sheet1

**使用场景：**
- 导出数据到 Excel
- 创建报表
- 数据备份

## ⚠️ 故障排除

### 问题 1：服务器无法启动

**错误信息：** `command not found: node`

**解决方案：**
1. 检查 Node.js 安装：打开命令行，输入 `node --version`
2. 如果未安装，从 https://nodejs.org 下载并安装 LTS 版本
3. 重启命令行，重试启动

---

### 问题 2：JS 找不到文件

**错误信息：** `找不到 Excel 文件`

**解决方案：**
1. 使用绝对路径（如 `D:\data\file.xlsx`）
2. 确保文件确实存在
3. 检查文件名是否拼写正确（区分大小写在某些系统上)
4. 确保有读取权限

---

### 问题 3：配置后 Copilot 不提供工具建议

**解决方案：**
1. 检查 settings.json 中的 JSON 格式是否正确
2. 确保 ExcelMCP 服务器正在运行
3. 重启 VS Code
4. 查看 VS Code 的问题控制台是否有错误提示

---

### 问题 4：文件保存位置没有权限

**错误信息：** `权限被拒绝` 或 `Access Denied`

**解决方案：**
1. 尝试保存到用户目录或文档文件夹
2. 以管理员身份运行 VS Code
3. 检查文件夹权限和文件是否被其他程序占用

---

### 问题 5：大型 Excel 文件处理慢

**最佳实践：**
1. 对于 > 50MB 的文件，考虑拆分工作表
2. 只读取需要的数据范围
3. 避免频繁读写同一文件

## 📊 测试数据说明

已生成的测试文件位置：`d:\yoka open IDE\excel-mcp-server\`

### test_data.xlsx
包含员工销售数据：
- 4 行员工记录
- 字段：姓名、部门、销售额、日期
- 用途：测试 read_excel 功能

### test_multi_sheet.xlsx
多工作表文件：
- 工作表 1："产品列表" - 3 个产品
- 工作表 2："销售统计" - 2 个月份的销售数据
- 用途：测试 list_sheets 和跨表操作

## 📈 高级用法

### 自动数据处理管道

```
1. 读取输入 Excel 文件
2. Copilot 提取和清理数据
3. 写入处理后的数据到新文件
4. 生成汇总报告
```

### 数据格式转换

```
导入 CSV -> 转换为 Excel 格式 -> 添加计算列 -> 生成报表
```

### 批量操作

```
同时处理多个 Excel 文件
并生成汇总统计表
```

## 🔐 安全建议

1. **不要共享包含敏感数据的 Excel 文件路径**
2. **使用强权限控制保护包含个人信息的文件**
3. **定期备份重要数据**
4. **避免将 Copilot 聊天记录导出到不安全位置**

## 📞 获得帮助

- 查看 [USAGE_GUIDE_CN.md](./USAGE_GUIDE_CN.md) 获取详细使用说明
- 查看 [README.md](./README.md) 获取技术细节
- 检查已生成的测试文件学习工具用法

## ✅ 验证清单

确保完成以下步骤：

- [ ] ExcelMCP 服务器已启动（命令行窗口正在运行）
- [ ] VS Code settings.json 已添加 MCP 配置
- [ ] VS Code 已重启
- [ ] 测试了至少一个使用示例
- [ ] Copilot Chat 能够提供工具建议

## 🎊 完成！

恭喜！你已经成功配置了 ExcelMCP。现在你可以在 GitHub Copilot 中充分利用 Excel 工具的强大功能了！

---

**需要帮助？** 参考本指南中的故障排除部分或查看其他文档。
