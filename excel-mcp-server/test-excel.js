import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

console.log('🧪 ExcelMCP 功能测试脚本\n');

// 测试 1: 创建 Excel 文件
console.log('测试 1: 创建 Excel 文件...');
const testData = [
  { 姓名: '张三', 部门: '销售部', 销售额: 50000, 日期: '2024-01-01' },
  { 姓名: '李四', 部门: '技术部', 销售额: 0, 日期: '2024-01-01' },
  { 姓名: '王五', 部门: '销售部', 销售额: 75000, 日期: '2024-01-02' },
  { 姓名: '赵六', 部门: '人力部', 销售额: 0, 日期: '2024-01-02' },
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(testData);
XLSX.utils.book_append_sheet(workbook, worksheet, '员工销售数据');
XLSX.writeFile(workbook, 'test_data.xlsx');
console.log('✓ 创建成功：test_data.xlsx\n');

// 测试 2: 读取 Excel 文件
console.log('测试 2: 读取 Excel 文件...');
const readWorkbook = XLSX.readFile('test_data.xlsx');
const readSheet = readWorkbook.Sheets[readWorkbook.SheetNames[0]];
const readData = XLSX.utils.sheet_to_json(readSheet);
console.log('✓ 读取成功，共', readData.length, '行数据');
console.log('数据预览：', JSON.stringify(readData.slice(0, 2), null, 2), '\n');

// 测试 3: 列出工作表
console.log('测试 3: 列出工作表...');
console.log('✓ 工作表列表：', readWorkbook.SheetNames.join(', '), '\n');

// 测试 4: 写入多个工作表
console.log('测试 4: 创建多工作表 Excel...');
const wb = XLSX.utils.book_new();

const sheet1Data = [
  { 产品: '产品A', 价格: 100, 数量: 50 },
  { 产品: '产品B', 价格: 200, 数量: 30 },
];

const sheet2Data = [
  { 月份: '1月', 销售额: 100000 },
  { 月份: '2月', 销售额: 120000 },
];

XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1Data), '产品列表');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2Data), '销售统计');
XLSX.writeFile(wb, 'test_multi_sheet.xlsx');
console.log('✓ 多工作表文件创建成功：test_multi_sheet.xlsx\n');

// 测试 5: 验证多工作表
console.log('测试 5: 验证多工作表文件...');
const multiWb = XLSX.readFile('test_multi_sheet.xlsx');
console.log('✓ 工作表数量：', multiWb.SheetNames.length);
console.log('✓ 工作表名称：', multiWb.SheetNames.join(', '), '\n');

console.log('✅ 所有测试完成！');
console.log('\n生成的测试文件：');
console.log('  - test_data.xlsx');
console.log('  - test_multi_sheet.xlsx');
console.log('\n这些文件可以用于测试 ExcelMCP 的读写功能。');
