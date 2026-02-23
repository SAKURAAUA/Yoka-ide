#!/usr/bin/env node

/**
 * Browser Automation MCP Server
 * 使用 Puppeteer 提供浏览器自动化和调试功能
 */

import puppeteer from 'puppeteer';

class BrowserMCPServer {
  constructor() {
    this.browser = null;
    this.pages = new Map();
    this.currentPageId = null;
  }

  async start() {
    // 启动 Puppeteer 浏览器
    this.browser = await puppeteer.launch({
      headless: false, // 显示浏览器窗口，方便调试
      devtools: true,  // 自动打开开发者工具
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    console.error('Browser MCP Server started successfully');
    this.setupMCPServer();
  }

  setupMCPServer() {
    // 监听标准输入的 MCP 请求
    let buffer = '';

    process.stdin.on('data', async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const request = JSON.parse(line);
          const response = await this.handleRequest(request);
          console.log(JSON.stringify(response));
        } catch (error) {
          console.error('Error processing request:', error);
          console.log(JSON.stringify({
            error: error.message,
            stack: error.stack
          }));
        }
      }
    });

    // 优雅关闭
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  async handleRequest(request) {
    const { method, params = {} } = request;

    try {
      switch (method) {
        case 'initialize':
          return await this.initialize(params);
        
        case 'list_tools':
          return this.listTools();
        
        case 'call_tool':
          return await this.callTool(params);
        
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: error.message,
          data: { stack: error.stack }
        }
      };
    }
  }

  async initialize(params) {
    return {
      result: {
        protocolVersion: '1.0',
        serverInfo: {
          name: 'browser-mcp-server',
          version: '1.0.0'
        },
        capabilities: {
          tools: true
        }
      }
    };
  }

  listTools() {
    return {
      result: {
        tools: [
          {
            name: 'browser_navigate',
            description: '导航到指定 URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: '要访问的 URL' },
                pageId: { type: 'string', description: '页面 ID（可选，不提供则使用当前页面）' }
              },
              required: ['url']
            }
          },
          {
            name: 'browser_new_page',
            description: '创建新的浏览器标签页',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: '初始 URL（可选）' }
              }
            }
          },
          {
            name: 'browser_screenshot',
            description: '对当前页面截图',
            inputSchema: {
              type: 'object',
              properties: {
                pageId: { type: 'string', description: '页面 ID（可选）' },
                fullPage: { type: 'boolean', description: '是否截取完整页面（默认 false）' }
              }
            }
          },
          {
            name: 'browser_click',
            description: '点击页面元素',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string', description: 'CSS 选择器' },
                pageId: { type: 'string', description: '页面 ID（可选）' }
              },
              required: ['selector']
            }
          },
          {
            name: 'browser_type',
            description: '在页面元素中输入文本',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string', description: 'CSS 选择器' },
                text: { type: 'string', description: '要输入的文本' },
                pageId: { type: 'string', description: '页面 ID（可选）' }
              },
              required: ['selector', 'text']
            }
          },
          {
            name: 'browser_evaluate',
            description: '在页面中执行 JavaScript 代码',
            inputSchema: {
              type: 'object',
              properties: {
                code: { type: 'string', description: '要执行的 JavaScript 代码' },
                pageId: { type: 'string', description: '页面 ID（可选）' }
              },
              required: ['code']
            }
          },
          {
            name: 'browser_get_content',
            description: '获取页面的 HTML 内容',
            inputSchema: {
              type: 'object',
              properties: {
                pageId: { type: 'string', description: '页面 ID（可选）' }
              }
            }
          },
          {
            name: 'browser_list_pages',
            description: '列出所有打开的页面',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'browser_close_page',
            description: '关闭指定页面',
            inputSchema: {
              type: 'object',
              properties: {
                pageId: { type: 'string', description: '页面 ID' }
              },
              required: ['pageId']
            }
          }
        ]
      }
    };
  }

  async callTool(params) {
    const { name, arguments: args = {} } = params;

    try {
      let result;

      switch (name) {
        case 'browser_navigate':
          result = await this.navigate(args);
          break;
        
        case 'browser_new_page':
          result = await this.newPage(args);
          break;
        
        case 'browser_screenshot':
          result = await this.screenshot(args);
          break;
        
        case 'browser_click':
          result = await this.click(args);
          break;
        
        case 'browser_type':
          result = await this.type(args);
          break;
        
        case 'browser_evaluate':
          result = await this.evaluate(args);
          break;
        
        case 'browser_get_content':
          result = await this.getContent(args);
          break;
        
        case 'browser_list_pages':
          result = await this.listPages();
          break;
        
        case 'browser_close_page':
          result = await this.closePage(args);
          break;
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        result: {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        }
      };
    } catch (error) {
      return {
        result: {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        }
      };
    }
  }

  async getPage(pageId) {
    if (pageId && this.pages.has(pageId)) {
      return this.pages.get(pageId);
    }
    
    if (this.currentPageId && this.pages.has(this.currentPageId)) {
      return this.pages.get(this.currentPageId);
    }

    // 如果没有页面，创建一个新页面
    const page = await this.browser.newPage();
    const id = `page-${Date.now()}`;
    this.pages.set(id, page);
    this.currentPageId = id;
    return page;
  }

  async navigate(args) {
    const { url, pageId } = args;
    const page = await this.getPage(pageId);
    await page.goto(url, { waitUntil: 'networkidle2' });
    return `Successfully navigated to: ${url}`;
  }

  async newPage(args) {
    const { url } = args;
    const page = await this.browser.newPage();
    const id = `page-${Date.now()}`;
    this.pages.set(id, page);
    this.currentPageId = id;

    if (url) {
      await page.goto(url, { waitUntil: 'networkidle2' });
    }

    return {
      pageId: id,
      message: `New page created${url ? ` and navigated to: ${url}` : ''}`
    };
  }

  async screenshot(args) {
    const { pageId, fullPage = false } = args;
    const page = await this.getPage(pageId);
    const buffer = await page.screenshot({ fullPage });
    const base64 = buffer.toString('base64');
    return `Screenshot captured (${buffer.length} bytes)\nBase64: data:image/png;base64,${base64.substring(0, 100)}...`;
  }

  async click(args) {
    const { selector, pageId } = args;
    const page = await this.getPage(pageId);
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.click(selector);
    return `Clicked element: ${selector}`;
  }

  async type(args) {
    const { selector, text, pageId } = args;
    const page = await this.getPage(pageId);
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.type(selector, text);
    return `Typed "${text}" into element: ${selector}`;
  }

  async evaluate(args) {
    const { code, pageId } = args;
    const page = await this.getPage(pageId);
    const result = await page.evaluate(code);
    return result;
  }

  async getContent(args) {
    const { pageId } = args;
    const page = await this.getPage(pageId);
    const content = await page.content();
    return content;
  }

  async listPages() {
    const pages = await Promise.all(
      Array.from(this.pages.entries()).map(async ([id, page]) => ({
        id,
        url: page.url(),
        title: await page.title(),
        isCurrent: id === this.currentPageId,
      }))
    );
    return { pages, count: pages.length };
  }

  async closePage(args) {
    const { pageId } = args;
    if (!this.pages.has(pageId)) {
      throw new Error(`Page not found: ${pageId}`);
    }

    const page = this.pages.get(pageId);
    await page.close();
    this.pages.delete(pageId);

    if (this.currentPageId === pageId) {
      this.currentPageId = this.pages.keys().next().value || null;
    }

    return `Page closed: ${pageId}`;
  }

  async cleanup() {
    console.error('Cleaning up...');
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 启动服务器
const server = new BrowserMCPServer();
server.start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
