# UI组件规格说明书（修正版 v3.0 - 白+粉主题）

> 版本：v3.0  
> 日期：2026-02-21  
> 主题：**白+粉配色方案** ⭐  
> 新增：智能体设置、本地处理、文件索引显示

---

## 1. 全局设计系统（白+粉主题）

### 1.1 配色方案（重大更新 - 白+粉主题）

```css
/* ============================================
   主题色板 - 白+粉配色方案
   ============================================ */

/* === 主色调 - 粉色系 === */
--color-primary: #ff6b9d;              /* 主粉色 - 柔和珊瑚粉 */
--color-primary-hover: #ff5a8a;          /* 悬停 - 深粉色 */
--color-primary-active: #f04d7a;         /* 按下 - 更深粉色 */
--color-primary-light: #ffb8d0;          /* 浅粉 - 用于背景 */
--color-primary-lighter: #ffe4ed;        /* 更浅粉 - 用于hover背景 */

/* === 背景色 - 白色系 === */
--color-bg-primary: #ffffff;             /* 主背景 - 纯白 */
--color-bg-secondary: #fafafa;           /* 次级背景 - 极浅灰白 */
--color-bg-tertiary: #f5f5f5;            /* 三级背景 - 浅灰 */
--color-bg-hover: #fff0f3;               /* 悬停背景 - 极浅粉 */
--color-bg-active: #ffe4ed;              /* 激活背景 - 浅粉 */

/* === 边框和分割 - 粉色系 === */
--color-border: #ffe4ed;                 /* 默认边框 - 浅粉 */
--color-border-hover: #ffb8d0;           /* 悬停边框 - 中粉 */
--color-border-active: #ff6b9d;          /* 激活边框 - 主粉 */
--color-divider: #fff0f3;                /* 分割线 - 极浅粉 */

/* === 文字颜色 - 深灰+粉色 === */
--color-text-primary: #1a1a1a;           /* 主文字 - 深黑 */
--color-text-secondary: #666666;         /* 次级文字 - 中灰 */
--color-text-tertiary: #999999;          /* 辅助文字 - 浅灰 */
--color-text-inverse: #ffffff;           /* 反色文字 - 白 */
--color-text-primary-pink: #ff6b9d;      /* 粉色文字 - 主粉 */

/* === 状态色 - 粉色系 === */
--color-success: #10b981;                /* 成功 - 翠绿 */
--color-success-light: #d1fae5;          /* 成功浅 - 浅绿 */
--color-warning: #f59e0b;                /* 警告 - 琥珀黄 */
--color-warning-light: #fef3c7;          /* 警告浅 - 浅黄 */
--color-error: #ef4444;                /* 错误 - 红 */
--color-error-light: #fee2e2;            /* 错误浅 - 浅红 */
--color-info: #ff6b9d;                   /* 信息 - 主粉 */
--color-info-light: #ffe4ed;             /* 信息浅 - 浅粉 */

/* === 特殊效果 === */
--shadow-sm: 0 1px 2px rgba(255, 107, 157, 0.05);
--shadow-md: 0 4px 6px rgba(255, 107, 157, 0.07);
--shadow-lg: 0 10px 15px rgba(255, 107, 157, 0.1);
--shadow-xl: 0 20px 25px rgba(255, 107, 157, 0.15);
--shadow-pink: 0 4px 12px rgba(255, 107, 157, 0.2);
--shadow-pink-lg: 0 8px 24px rgba(255, 107, 157, 0.25);

/* === 圆角 === */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-full: 9999px;
--radius-pill: 20px;
```

### 1.2 动画和过渡规范（白+粉主题）

```css
/* === 动画时长 === */
--transition-instant: 50ms;
--transition-fast: 100ms;
--transition-normal: 200ms;
--transition-slow: 300ms;
--transition-slower: 400ms;
--transition-slowest: 500ms;

/* === 缓动函数 === */
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

/* === 粉色主题特有的动画效果 === */
--animation-fade-pink: fade-pink 300ms ease-out;
--animation-pulse-pink: pulse-pink 2s ease-in-out infinite;
--animation-shimmer-pink: shimmer-pink 1.5s linear infinite;

@keyframes fade-pink {
  from {
    opacity: 0;
    background-color: rgba(255, 107, 157, 0.1);
  }
  to {
    opacity: 1;
    background-color: transparent;
  }
}

@keyframes pulse-pink {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 107, 157, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 107, 157, 0);
  }
}

@keyframes shimmer-pink {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

### 1.3 字体规范

```css
/* === 字体族 === */
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
--font-mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'Courier New', monospace;
--font-display: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;

/* === 字号 === */
--text-2xs: 10px;      /* 极小号 - 标签、徽章 */
--text-xs: 11px;       /* 小号 - 辅助文字、时间 */
--text-sm: 12px;       /* 小 - 菜单项、按钮 */
--text-base: 13px;     /* 基础 - 正文、列表 */
--text-md: 14px;       /* 中 - 标题、导航 */
--text-lg: 16px;       /* 大 - 小标题 */
--text-xl: 18px;       /* 特大 - 章节标题 */
--text-2xl: 20px;      /* 超大 - 大标题 */
--text-3xl: 24px;      /* 极 - 主标题 */

/* === 字重 === */
--font-thin: 100;
--font-extralight: 200;
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
--font-black: 900;

/* === 行高 === */
--leading-none: 1;           /* 无行距 - 紧凑 */
--leading-tight: 1.25;       /* 紧凑 - 标题 */
--leading-snug: 1.375;       /* 稍紧 - 短段落 */
--leading-normal: 1.5;       /* 正常 - 正文 */
--leading-relaxed: 1.625;    /* 稍松 - 长段落 */
--leading-loose: 2;          /* 宽松 - 强调 */

/* === 字距 === */
--tracking-tighter: -0.05em;
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
--tracking-widest: 0.1em;
```

---

## 2. 智能体设置规格（新增）

### 2.1 OpenCode 4个默认智能体

```typescript
interface AgentSettings {
  // OpenCode 4个默认智能体
  defaultAgents: {
    codeAssistant: Agent;        // 代码助手
    architect: Agent;              // 架构师
    reviewer: Agent;               // 代码审查员
    debugger: Agent;               // 调试专家
  };
  
  // 用户自定义智能体
  customAgents: CustomAgent[];
  
  // 当前激活的智能体
  activeAgentId: string;
  
  // 智能体切换设置
  autoSwitch: {
    enabled: boolean;              // 是否启用自动切换
    rules: AutoSwitchRule[];       // 自动切换规则
  };
}

// OpenCode 4个默认智能体详情
const defaultAgentsConfig = {
  codeAssistant: {
    id: 'opencode-code-assistant',
    name: '代码助手',
    nameEn: 'Code Assistant',
    icon: 'Code2',
    color: '#ff6b9d',                    // 粉色
    description: '协助代码编写、重构和优化',
    descriptionEn: 'Assist with code writing, refactoring and optimization',
    capabilities: [
      'code_completion',
      'code_generation',
      'code_refactoring',
      'code_optimization',
      'code_explanation',
    ],
    defaultModel: 'claude-3-sonnet',
    systemPrompt: `You are an expert code assistant. Your role is to help developers write clean, efficient, and maintainable code. You should:
1. Provide accurate and helpful code suggestions
2. Explain your reasoning clearly
3. Follow best practices and coding standards
4. Consider performance and readability
5. Offer alternative solutions when appropriate`,
    shortcuts: {
      activation: 'Ctrl+Shift+C',
      quickComplete: 'Tab',
    },
  },
  
  architect: {
    id: 'opencode-architect',
    name: '架构师',
    nameEn: 'Architect',
    icon: 'Building2',
    color: '#a78bfa',                    // 紫色
    description: '设计系统架构和技术方案',
    descriptionEn: 'Design system architecture and technical solutions',
    capabilities: [
      'architecture_design',
      'system_analysis',
      'technology_selection',
      'design_patterns',
      'performance_planning',
    ],
    defaultModel: 'claude-3-opus',
    systemPrompt: `You are an experienced software architect. Your role is to help design robust, scalable, and maintainable software systems. You should:
1. Analyze requirements thoroughly
2. Propose well-structured architectures
3. Consider trade-offs and constraints
4. Recommend appropriate technologies
5. Think about long-term maintainability and evolution`,
    shortcuts: {
      activation: 'Ctrl+Shift+A',
      quickDiagram: 'Ctrl+D',
    },
  },
  
  reviewer: {
    id: 'opencode-reviewer',
    name: '审查员',
    nameEn: 'Code Reviewer',
    icon: 'Eye',
    color: '#34d399',                    // 绿色
    description: '审查代码质量和潜在问题',
    descriptionEn: 'Review code quality and potential issues',
    capabilities: [
      'code_review',
      'bug_detection',
      'security_analysis',
      'style_checking',
      'best_practices_validation',
    ],
    defaultModel: 'claude-3-sonnet',
    systemPrompt: `You are a meticulous code reviewer. Your role is to identify issues, suggest improvements, and ensure code quality. You should:
1. Identify bugs and potential issues
2. Check for security vulnerabilities
3. Verify adherence to best practices
4. Suggest specific improvements
5. Be constructive and explain your reasoning`,
    shortcuts: {
      activation: 'Ctrl+Shift+R',
      quickReview: 'Ctrl+R',
    },
  },
  
  debugger: {
    id: 'opencode-debugger',
    name: '调试专家',
    nameEn: 'Debug Expert',
    icon: 'Bug',
    color: '#fbbf24',                    // 琥珀色
    description: '协助定位和修复Bug',
    descriptionEn: 'Assist in locating and fixing bugs',
    capabilities: [
      'error_analysis',
      'stack_trace_parsing',
      'breakpoint_suggestions',
      'variable_inspection',
      'fix_recommendations',
    ],
    defaultModel: 'claude-3-sonnet',
    systemPrompt: `You are an expert debugger. Your role is to help identify the root cause of issues and suggest fixes. You should:
1. Analyze error messages and stack traces
2. Identify the root cause
3. Suggest specific fixes
4. Explain your reasoning step by step
5. Consider edge cases and potential side effects`,
    shortcuts: {
      activation: 'Ctrl+Shift+D',
      quickDebug: 'F8',
    },
  },
};
```

### 2.2 智能体设置面板

```typescript
// 智能体设置组件
interface AgentSettingsPanelProps {
  agents: {
    default: Agent[];           // 4个默认智能体
    custom: CustomAgent[];      // 用户自定义智能体
  };
  activeAgentId: string;
  onSwitchAgent: (id: string) => void;
  onConfigureAgent: (id: string, config: AgentConfig) => void;
  onCreateCustomAgent: () => void;
  onEditCustomAgent: (id: string) => void;
  onDeleteCustomAgent: (id: string) => void;
}

// 智能体配置项
interface AgentConfiguration {
  // 基础设置
  basic: {
    name: string;
    description: string;
    icon: string;
    color: string;
    isDefault: boolean;           // 是否为默认智能体
  };
  
  // 模型设置
  model: {
    provider: 'anthropic' | 'openai' | 'local';
    model: string;                  // 模型ID
    temperature: number;            // 0-2
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  
  // 系统提示词
  systemPrompt: {
    content: string;
    variables: string[];            // 可插入的变量
  };
  
  // 能力开关
  capabilities: {
    codeCompletion: boolean;
    codeGeneration: boolean;
    codeReview: boolean;
    debugging: boolean;
    architecture: boolean;
    fileOperations: boolean;
    gitOperations: boolean;
    webSearch: boolean;
    mcpTools: boolean;
  };
  
  // 快捷键
  shortcuts: {
    activation: string;
    quickAction: string;
  };
  
  // 自动切换规则
  autoSwitch: {
    enabled: boolean;
    rules: {
      fileExtension: string[];          // 根据文件扩展名
      keywords: string[];             // 根据关键词
      context: 'coding' | 'debugging' | 'reviewing';
    }[];
  };
}
```

### 2.3 用户自定义智能体

```typescript
// 用户自定义智能体
interface CustomAgent extends Agent {
  isCustom: true;
  createdAt: Date;
  updatedAt: Date;
  isShared: boolean;                    // 是否分享给团队
  shareLink?: string;
}

// 创建自定义智能体向导
interface CreateAgentWizard {
  steps: [
    {
      id: 'basic-info';
      title: '基础信息';
      fields: ['name', 'description', 'icon', 'color'];
    },
    {
      id: 'model-settings';
      title: '模型设置';
      fields: ['provider', 'model', 'temperature', 'maxTokens'];
    },
    {
      id: 'system-prompt';
      title: '系统提示词';
      fields: ['systemPrompt'];
      templateLibrary: string[];        // 提示词模板库
    },
    {
      id: 'capabilities';
      title: '能力开关';
      fields: ['capabilities'];
    },
    {
      id: 'shortcuts';
      title: '快捷键';
      fields: ['shortcuts'];
    },
    {
      id: 'review';
      title: '预览';
      action: 'previewAgent';
    },
  ];
}

// 智能体模板库
const agentTemplates = [
  {
    id: 'frontend-expert',
    name: '前端专家',
    description: '专注于React、Vue、Angular等前端框架的开发',
    icon: 'Layout',
    color: '#61dafb',
    systemPrompt: '你是一位资深前端开发专家，精通React、Vue、Angular等主流框架...',
    capabilities: {
      codeCompletion: true,
      codeGeneration: true,
      codeReview: true,
      debugging: true,
      architecture: false,
      fileOperations: true,
      gitOperations: true,
      webSearch: true,
      mcpTools: true,
    },
  },
  {
    id: 'backend-expert',
    name: '后端专家',
    description: '专注于Node.js、Python、Go等后端开发',
    icon: 'Server',
    color: '#339933',
    systemPrompt: '你是一位资深后端开发专家，精通Node.js、Python、Go等后端技术...',
    capabilities: {
      codeCompletion: true,
      codeGeneration: true,
      codeReview: true,
      debugging: true,
      architecture: true,
      fileOperations: true,
      gitOperations: true,
      webSearch: true,
      mcpTools: true,
    },
  },
  {
    id: 'data-scientist',
    name: '数据科学家',
    description: '专注于数据分析、机器学习、AI模型开发',
    icon: 'Brain',
    color: '#ff6b9d',
    systemPrompt: '你是一位资深数据科学家，精通Python数据分析、机器学习...',
    capabilities: {
      codeCompletion: true,
      codeGeneration: true,
      codeReview: true,
      debugging: true,
      architecture: false,
      fileOperations: true,
      gitOperations: true,
      webSearch: true,
      mcpTools: true,
    },
  },
  {
    id: 'security-expert',
    name: '安全专家',
    description: '专注于代码安全、漏洞分析、安全审计',
    icon: 'Shield',
    color: '#dc2626',
    systemPrompt: '你是一位资深安全专家，专注于代码安全、漏洞分析...',
    capabilities: {
      codeCompletion: false,
      codeGeneration: false,
      codeReview: true,
      debugging: true,
      architecture: true,
      fileOperations: true,
      gitOperations: true,
      webSearch: true,
      mcpTools: true,
    },
  },
];
```

---

## 3. 模型选择菜单 - 本地处理选项（新增）

### 3.1 本地处理流程

```typescript
interface LocalProcessingOptions {
  // 启用本地处理
  enabled: boolean;
  
  // 处理方式
  processing: {
    // 提示词预处理
    promptPreprocessing: {
      enabled: boolean;
      steps: [
        {
          name: 'contextEnrichment';     // 上下文丰富
          enabled: boolean;
          description: '根据项目索引自动添加相关上下文';
        },
        {
          name: 'promptOptimization';     // 提示词优化
          enabled: boolean;
          description: '优化提示词结构，提高模型理解度';
        },
        {
          name: 'keywordExtraction';     // 关键词提取
          enabled: boolean;
          description: '提取关键词用于索引匹配';
        },
      ];
    };
    
    // 索引处理
    indexProcessing: {
      enabled: boolean;
      flow: [
        {
          step: 1;
          name: 'fileDiscovery';           // 文件发现
          action: '扫描项目文件，识别需要索引的文件';
        },
        {
          step: 2;
          name: 'contentExtraction';       // 内容提取
          action: '提取文件内容、函数定义、类结构等';
        },
        {
          step: 3;
          name: 'semanticAnalysis';       // 语义分析
          action: '使用本地模型分析代码语义，生成向量表示';
        },
        {
          step: 4;
          name: 'indexStorage';            // 索引存储
          action: '将索引存储在项目文件夹的.opencode/index目录';
        },
      ];
      
      // 索引配置
      config: {
        includePatterns: string[];       // 包含的文件模式
        excludePatterns: string[];       // 排除的文件模式
        maxFileSize: number;            // 最大文件大小（MB）
        enableGitignore: boolean;       // 是否遵循.gitignore
        enableSemanticIndexing: boolean; // 是否启用语义索引
        indexUpdateStrategy: 'realtime' | 'onSave' | 'manual'; // 索引更新策略
      };
    };
    
    // 上下文增强
    contextEnhancement: {
      enabled: boolean;
      strategies: [
        {
          name: 'relevantFileRetrieval';  // 相关文件检索
          enabled: boolean;
          description: '基于当前编辑文件检索相关文件';
          maxFiles: 5;
        },
        {
          name: 'functionSignatureLookup'; // 函数签名查找
          enabled: boolean;
          description: '查找使用的函数的签名和文档';
        },
        {
          name: 'importedModuleAnalysis';  // 导入模块分析
          enabled: boolean;
          description: '分析导入的模块和库';
        },
        {
          name: 'gitHistoryContext';         // Git历史上下文
          enabled: boolean;
          description: '提供相关的Git提交历史';
          maxCommits: 3;
        },
      ];
    };
  };
  
  // 本地模型配置
  localModel: {
    // 使用的本地模型
    model: {
      id: string;                     // 模型ID，如'llama3.2', 'phi4'
      provider: 'ollama' | 'lmstudio' | 'localai';
      version: string;
    };
    
    // 连接配置
    connection: {
      host: string;                   // 默认'localhost'
      port: number;                   // Ollama默认11434
      timeout: number;                // 超时时间（秒）
      retries: number;                // 重试次数
    };
    
    // 生成参数
    generation: {
      temperature: number;              // 0-2
      topP: number;                    // 0-1
      maxTokens: number;               // 最大生成token数
      frequencyPenalty: number;        // -2 to 2
      presencePenalty: number;         // -2 to 2
      stopSequences: string[];         // 停止序列
    };
    
    // 性能优化
    optimization: {
      enableBatching: boolean;         // 启用批处理
      batchSize: number;               // 批处理大小
      enableCaching: boolean;          // 启用缓存
      cacheSize: number;               // 缓存大小（MB）
      contextWindow: number;           // 上下文窗口大小
    };
  };
  
  // UI配置
  ui: {
    // 本地处理指示器
    indicator: {
      enabled: boolean;                // 是否显示指示器
      position: 'top-right' | 'bottom-right' | 'inline'; // 指示器位置
      showProgress: boolean;           // 是否显示处理进度
      showLatency: boolean;            // 是否显示延迟
    };
    
    // 索引管理界面
    indexManager: {
      enabled: boolean;
      showInStatusBar: boolean;        // 在状态栏显示索引状态
      allowManualReindex: boolean;     // 允许手动重建索引
      showIndexStats: boolean;           // 显示索引统计
    };
    
    // 本地模型管理界面
    modelManager: {
      enabled: boolean;
      allowModelDownload: boolean;     // 允许下载模型
      allowModelSwitch: boolean;       // 允许切换模型
      showModelStats: boolean;         // 显示模型统计
      showGPUMemory: boolean;          // 显示GPU内存
    };
  };
}
```

---

由于篇幅限制，我将继续完善其他组件的规格。你希望我先完成哪个部分？

1. **文件管理器索引显示规格**（文件名后显示索引名/功能描述）
2. **索引文档存储与Git同步规格**（存储在项目文件夹并同步到Git）
3. **整理完整规格报告**（汇总所有设计到一份完整文档）

**请回复 1、2 或 3！** 🎯