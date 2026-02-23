# Browser MCP Server

使用 Puppeteer 提供浏览器自动化和调试功能的 MCP 服务器。

## 功能特性

- 🌐 **浏览器导航**：打开和导航网页
- 📸 **页面截图**：捕获整页或可视区域截图
- 🖱️ **元素交互**：点击、输入文本
- 💻 **代码执行**：在页面上下文中执行 JavaScript
- 📄 **内容提取**：获取页面 HTML 内容
- 🗂️ **多标签管理**：创建、切换、关闭多个浏览器标签

## 安装

```bash
cd browser-mcp-server
npm install
```

## 使用

### 启动服务器

```bash
npm start
```

### 可用工具

1. **browser_navigate** - 导航到指定 URL
   ```json
   {
     "url": "https://example.com",
     "pageId": "page-123" // 可选
   }
   ```

2. **browser_new_page** - 创建新标签页
   ```json
   {
     "url": "https://example.com" // 可选
   }
   ```

3. **browser_screenshot** - 截图
   ```json
   {
     "pageId": "page-123", // 可选
     "fullPage": true // 可选，默认 false
   }
   ```

4. **browser_click** - 点击元素
   ```json
   {
     "selector": "#submit-button",
     "pageId": "page-123" // 可选
   }
   ```

5. **browser_type** - 输入文本
   ```json
   {
     "selector": "#search-input",
     "text": "搜索内容",
     "pageId": "page-123" // 可选
   }
   ```

6. **browser_evaluate** - 执行 JavaScript
   ```json
   {
     "code": "document.title",
     "pageId": "page-123" // 可选
   }
   ```

7. **browser_get_content** - 获取页面 HTML
   ```json
   {
     "pageId": "page-123" // 可选
   }
   ```

8. **browser_list_pages** - 列出所有页面
   ```json
   {}
   ```

9. **browser_close_page** - 关闭页面
   ```json
   {
     "pageId": "page-123"
   }
   ```

## 配置

在你的 MCP 客户端配置文件中添加：

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

## 测试

```bash
npm test
```

## 特性说明

- **自动打开 DevTools**：浏览器启动时会自动打开开发者工具，方便调试
- **非 Headless 模式**：默认显示浏览器窗口，便于观察自动化过程
- **多标签支持**：可以同时管理多个浏览器标签页
- **错误处理**：完善的错误捕获和报告机制

## 注意事项

- 首次运行会下载 Chromium 浏览器（约 150MB）
- 确保有足够的磁盘空间和内存
- 在 Windows 上可能需要允许防火墙访问

## 许可证

MIT
