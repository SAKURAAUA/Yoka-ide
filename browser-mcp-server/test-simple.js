#!/usr/bin/env node

/**
 * 简单测试 - 只验证服务器可以启动
 */

console.log('🧪 测试 Browser MCP Server 安装...\n');

// 测试 1: 检查 Puppeteer 是否安装
try {
  const puppeteer = await import('puppeteer');
  console.log('✅ Puppeteer 已安装');
} catch (error) {
  console.error('❌ Puppeteer 未安装:', error.message);
  process.exit(1);
}

// 测试 2: 启动浏览器
try {
  const puppeteer = await import('puppeteer');
  console.log('🚀 正在启动浏览器...');
  
  const browser = await puppeteer.default.launch({
    headless: false,
    devtools: true,
    args: ['--start-maximized']
  });
  
  console.log('✅ 浏览器启动成功');
  
  // 创建新页面
  const page = await browser.newPage();
  console.log('✅ 创建新页面成功');
  
  // 导航到测试网站
  await page.goto('https://example.com');
  console.log('✅ 导航到 example.com 成功');
  
  // 获取页面标题
  const title = await page.title();
  console.log(`✅ 页面标题: ${title}`);
  
  // 截图测试
  await page.screenshot({ path: 'test-screenshot.png' });
  console.log('✅ 截图成功: test-screenshot.png');
  
  console.log('\n🎉 所有测试通过！');
  console.log('浏览器将在 5 秒后关闭...');
  
  setTimeout(async () => {
    await browser.close();
    console.log('👋 浏览器已关闭');
    process.exit(0);
  }, 5000);
  
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  process.exit(1);
}
