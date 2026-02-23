import Anthropic from "@anthropic-ai/sdk";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const client = new Anthropic();
const server = new Server({
  name: "ExcelMCP",
  version: "1.0.0",
});

// Excel 文件操作工具

const tools = [
  {
    name: "read_excel",
    description: "读取 Excel 文件的内容",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Excel 文件的路径",
        },
        sheetName: {
          type: "string",
          description: "工作表名称，如果不指定则读取第一个工作表",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "write_excel",
    description: "写入数据到 Excel 文件",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Excel 文件的路径",
        },
        sheetName: {
          type: "string",
          description: "工作表名称",
        },
        data: {
          type: "array",
          description: "要写入的数据数组",
        },
      },
      required: ["filePath", "data"],
    },
  },
  {
    name: "list_sheets",
    description: "列出 Excel 文件中的所有工作表",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Excel 文件的路径",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "create_excel",
    description: "创建新的 Excel 文件",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "新 Excel 文件的路径",
        },
        data: {
          type: "array",
          description: "初始数据数组",
        },
        sheetName: {
          type: "string",
          description: "工作表名称，默认为 Sheet1",
        },
      },
      required: ["filePath", "data"],
    },
  },
];

// 工具实现

async function readExcel(filePath, sheetName) {
  const workbook = XLSX.readFile(filePath);
  const sheet = sheetName
    ? workbook.Sheets[sheetName]
    : workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    throw new Error(`工作表 ${sheetName} 不存在`);
  }

  const data = XLSX.utils.sheet_to_json(sheet);
  return JSON.stringify(data, null, 2);
}

async function writeExcel(filePath, sheetName, data) {
  let workbook;

  if (fs.existsSync(filePath)) {
    workbook = XLSX.readFile(filePath);
  } else {
    workbook = XLSX.utils.book_new();
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Sheet1");
  XLSX.writeFile(workbook, filePath);

  return `数据已成功写入 ${filePath}`;
}

async function listSheets(filePath) {
  const workbook = XLSX.readFile(filePath);
  return JSON.stringify(workbook.SheetNames, null, 2);
}

async function createExcel(filePath, data, sheetName = "Sheet1") {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filePath);

  return `Excel 文件已创建：${filePath}`;
}

// 设置工具列表处理

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// 设置工具调用处理

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case "read_excel":
        result = await readExcel(args.filePath, args.sheetName);
        break;
      case "write_excel":
        result = await writeExcel(args.filePath, args.sheetName, args.data);
        break;
      case "list_sheets":
        result = await listSheets(args.filePath);
        break;
      case "create_excel":
        result = await createExcel(args.filePath, args.data, args.sheetName);
        break;
      default:
        throw new Error(`未知的工具：${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `错误：${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// 启动服务器

const PORT = process.env.PORT || 18888;

async function main() {
  await server.connect(
    new Anthropic.MessageStream({
      model: "claude-3-5-sonnet-20241022",
    })
  );

  console.log(`ExcelMCP 服务器运行在端口 ${PORT}`);
}

main().catch(console.error);
