#!/usr/bin/env node

/**
 * 测试 Browser MCP Server
 */

import { spawn } from 'child_process';

async function testBrowserMCP() {
  console.log('🧪 启动 Browser MCP Server 测试...\n');

  // 启动服务器
  const server = spawn('node', ['server.js'], {
    cwd: process.cwd()
  });

  let responseBuffer = '';

  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    
    // 尝试解析响应
    const lines = responseBuffer.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      try {
        const response = JSON.parse(lines[i]);
        console.log('📥 响应:', JSON.stringify(response, null, 2));
      } catch (e) {
        // 忽略解析错误
      }
    }
    responseBuffer = lines[lines.length - 1];
  });

  server.stderr.on('data', (data) => {
    console.log('ℹ️ 服务器日志:', data.toString());
  });

  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 测试 1: 初始化
  console.log('📤 测试 1: 初始化');
  server.stdin.write(JSON.stringify({
    method: 'initialize',
    params: {}
  }) + '\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 测试 2: 列出工具
  console.log('\n📤 测试 2: 列出工具');
  server.stdin.write(JSON.stringify({
    method: 'list_tools',
    params: {}
  }) + '\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 测试 3: 创建新页面并导航
  console.log('\n📤 测试 3: 创建新页面并导航到 example.com');
  server.stdin.write(JSON.stringify({
    method: 'call_tool',
    params: {
      name: 'browser_new_page',
      arguments: {
        url: 'https://example.com'
      }
    }
  }) + '\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // 测试 4: 获取页面标题
  console.log('\n📤 测试 4: 获取页面标题');
  server.stdin.write(JSON.stringify({
    method: 'call_tool',
    params: {
      name: 'browser_evaluate',
      arguments: {
        code: 'document.title'
      }
    }
  }) + '\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 测试 5: 列出所有页面
  console.log('\n📤 测试 5: 列出所有页面');
  server.stdin.write(JSON.stringify({
    method: 'call_tool',
    params: {
      name: 'browser_list_pages',
      arguments: {}
    }
  }) + '\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n✅ 测试完成！浏览器窗口将保持打开，按 Ctrl+C 关闭。');
  
  // 保持进程运行
  process.on('SIGINT', () => {
    console.log('\n👋 关闭服务器...');
    server.kill();
    process.exit(0);
  });
}

testBrowserMCP().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
