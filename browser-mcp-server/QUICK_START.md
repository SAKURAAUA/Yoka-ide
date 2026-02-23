# Browser MCP Server 快速上手指南

## 📦 已安装内容

- ✅ Puppeteer 浏览器自动化库
- ✅ Browser MCP Server 主程序
- ✅ 测试脚本和启动脚本
- ✅ MCP 配置已更新

## 🚀 快速开始

### 方式 1: 直接启动服务器

```bash
cd d:\yoka open IDE\browser-mcp-server
npm start
```

或者双击运行：
```
start-server.bat
```

### 方式 2: 运行测试

```bash
cd d:\yoka open IDE\browser-mcp-server
npm test
```

测试将自动：
1. 启动浏览器
2. 打开 example.com
3. 获取页面标题
4. 列出所有打开的页面

## 🔧 MCP 配置

配置已添加到 `excel-mcp-server/mcp-config.json`：

```json
{
  "modelContextProtocol": {
    "servers": {
      "browserMCP": {
        "command": "node",
        "args": [
          "${workspaceFolder}/browser-mcp-server/server.js"
        ]
      }
    }
  }
}
```

## 🛠️ 可用工具

1. **browser_navigate** - 导航到 URL
2. **browser_new_page** - 创建新标签页
3. **browser_screenshot** - 页面截图
4. **browser_click** - 点击元素
5. **browser_type** - 输入文本
6. **browser_evaluate** - 执行 JavaScript
7. **browser_get_content** - 获取 HTML
8. **browser_list_pages** - 列出所有页面
9. **browser_close_page** - 关闭页面

## 📝 使用示例

### 示例 1: 打开网页并截图

```javascript
// 1. 创建新页面并导航
{
  "method": "call_tool",
  "params": {
    "name": "browser_new_page",
    "arguments": {
      "url": "https://github.com"
    }
  }
}

// 2. 截图
{
  "method": "call_tool",
  "params": {
    "name": "browser_screenshot",
    "arguments": {
      "fullPage": true
    }
  }
}
```

### 示例 2: 填写表单

```javascript
// 1. 输入文本
{
  "method": "call_tool",
  "params": {
    "name": "browser_type",
    "arguments": {
      "selector": "#search",
      "text": "puppeteer tutorial"
    }
  }
}

// 2. 点击搜索按钮
{
  "method": "call_tool",
  "params": {
    "name": "browser_click",
    "arguments": {
      "selector": "#submit"
    }
  }
}
```

### 示例 3: 执行自定义 JavaScript

```javascript
{
  "method": "call_tool",
  "params": {
    "name": "browser_evaluate",
    "arguments": {
      "code": "document.querySelectorAll('a').length"
    }
  }
}
```

## ⚙️ 特性

- ✅ **自动打开 DevTools**：方便调试和观察
- ✅ **非 Headless 模式**：可以看到浏览器操作过程
- ✅ **多标签管理**：支持同时管理多个页面
- ✅ **完整的错误处理**：清晰的错误信息
- ✅ **等待机制**：自动等待页面加载和元素出现

## 📋 系统要求

- Node.js 14 或更高版本
- Windows/Mac/Linux 系统
- 至少 500MB 磁盘空间（Chromium 大小）
- 至少 2GB 内存

## 🔍 故障排除

### 首次运行很慢
首次运行会下载 Chromium（约 150MB），这是正常的。

### 浏览器无法启动
确保没有防火墙阻止 Node.js 或 Chrome。

### 命令不工作
检查 CSS 选择器是否正确，使用浏览器 DevTools 测试选择器。

## 📚 更多信息

- [Puppeteer 文档](https://pptr.dev/)
- [MCP 协议规范](https://github.com/modelcontextprotocol)

## 🎯 下一步

1. 在 GitHub Copilot 或其他 MCP 客户端中启用 browserMCP
2. 使用自然语言命令控制浏览器
3. 自动化网页测试和数据抓取

祝使用愉快！🎉
