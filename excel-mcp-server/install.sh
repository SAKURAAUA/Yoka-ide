#!/bin/bash

# ExcelMCP Server 安装脚本

echo "开始安装 ExcelMCP Server..."

# 进入项目目录
cd "$(dirname "$0")"

# 安装依赖
echo "正在安装依赖..."
npm install

# 创建示例 Excel 文件
echo "正在创建示例文件..."

cat > create-sample.js << 'EOF'
import XLSX from 'xlsx';

const data = [
  { 姓名: "张三", 部门: "销售部", 销售额: 50000 },
  { 姓名: "李四", 部门: "技术部", 销售额: 0 },
  { 姓名: "王五", 部门: "销售部", 销售额: 75000 }
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(workbook, worksheet, "员工信息");
XLSX.writeFile(workbook, "sample.xlsx");

console.log("示例 Excel 文件已创建：sample.xlsx");
EOF

node create-sample.js
rm create-sample.js

echo ""
echo "✓ ExcelMCP Server 安装完成！"
echo ""
echo "使用方式："
echo "1. 启动服务器: npm start"
echo "2. 在 VS Code 中按 Ctrl+Shift+P，输入 'MCP' 加载服务器"
echo "3. 即可在 Copilot Chat 中使用 Excel 工具"
