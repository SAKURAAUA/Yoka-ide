# OpenCode IDE - UI设计规格最终版（整合所有澄清）

> 版本：Final v1.0  
> 日期：2026-02-21  
> 状态：所有关键概念已澄清，可直接用于开发

---

## 执行摘要

基于详细澄清，核心设计如下：

### 架构核心
1. **独立窗口系统**：输入框和聊天日志是独立窗口，可单独存在
2. **关联机制**：通过右键菜单或拖拽将输入框关联到特定对话
3. **合并窗口**：多个窗口可停靠合并成容器窗口，内部分栏布局
4. **实例管理**：可创建多个独立窗口实例，关闭后不保留

### 关键设计决策
| 功能 | 设计决策 |
|------|----------|
| 输入框与日志 | 独立窗口，可关联但不强制绑定 |
| 待办清单 | AI控制，显示AI当前操作，用户可取消 |
| 模型切换 | 不影响对话上下文 |
| 本地处理 | 提供预处理服务，可选择预处理类型，也可单独作为问答模型 |
| 云端模型 | 可选"无"，纯本地模式 |

---

## 1. 输入框组件详细规格

### 1.1 基础架构

```typescript
// 输入框窗口实例
interface InputBoxWindow {
  id: string;
  type: 'input-box';
  
  // 窗口状态
  state: {
    mode: 'floating' | 'docked' | 'merged';  // 浮动/停靠/合并
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    isVisible: boolean;
    isFocused: boolean;
  };
  
  // 关联的对话（可选，未关联时为独立输入框）
  associatedConversation?: {
    conversationId: string;
    projectId: string;
    isLinked: boolean;  // 是否已建立关联
  };
  
  // 如果处于合并状态
  mergedContainer?: {
    containerId: string;
    layout: 'split-horizontal' | 'split-vertical' | 'tabbed';
    siblingWindows: string[];  // 同容器中的其他窗口ID
  };
  
  // 输入框内容
  content: {
    text: string;
    selection: { start: number; end: number };
    attachments: Attachment[];
    mentionContext: MentionContext[];
  };
  
  // 待办清单（AI控制）
  todoList: AITodoItem[];
  
  // 当前AI操作
  currentAIOperations: AIOperation[];
  
  // 模型配置
  modelConfig: {
    selectedModel: string;  // 'claude-3.5-sonnet' | 'gpt-4' | 'local-llama3.2' | 'none'
    localProcessing: {
      enabled: boolean;
      preprocessingType: 'none' | 'standard' | 'deep' | 'custom';
      customConfig?: CustomPreprocessingConfig;
    };
  };
}
```

### 1.2 窗口模式详解

#### 模式1：浮动模式（Floating）

```typescript
interface FloatingMode {
  type: 'floating';
  
  // 窗口尺寸
  defaultSize: {
    width: 500;
    height: 'auto';  // 根据内容自适应，最小100px，最大300px
  };
  
  // 可调整大小
  resizable: {
    enabled: true;
    minWidth: 300;
    maxWidth: 800;
    minHeight: 100;
    maxHeight: 500;
    rememberSize: true;  // 记住用户调整后的尺寸
  };
  
  // 位置
  position: {
    initial: 'center-screen' | 'remember-last' | 'near-trigger';
    draggable: true;
    snapToEdges: true;
    snapDistance: 20;
  };
  
  // 外观
  appearance: {
    borderRadius: 8;
    shadow: 'lg';
    opacity: 1;
    alwaysOnTop: false;
  };
}
```

#### 模式2：停靠模式（Docked）

```typescript
interface DockedMode {
  type: 'docked';
  
  // 停靠位置
  position: 'left' | 'right' | 'bottom';
  
  // 竖条模式（停靠时的特殊形态）
  collapsedForm: {
    enabled: true;
    width: 40;  // 竖条宽度
    height: 'parent-height';  // 与父容器同高
    showIcon: true;  // 显示输入框图标
    showBadge: true;  // 显示未读消息徽章
    expandOnHover: true;  // 悬浮展开
    expandDelay: 200;
  };
  
  // 展开后的尺寸
  expandedSize: {
    width: 500;  // 停靠后的宽度（左侧/右侧停靠时）
    height: 200;  // 停靠后的高度（底部停靠时）
    resizable: true;
    minWidth: 300;
    maxWidth: 600;
    minHeight: 100;
    maxHeight: 400;
  };
  
  // 与其他停靠窗口的关系
  dockingGroup: {
    canShareEdge: true;  // 可以与其他窗口共享停靠边
    autoArrange: true;  // 自动排列多个停靠窗口
  };
}
```

#### 模式3：合并模式（Merged）

```typescript
interface MergedMode {
  type: 'merged';
  
  // 容器窗口
  container: {
    id: string;
    type: 'merge-container';
    title: '合并窗口' | string;  // 可以是自定义标题
    icon: 'LayoutGrid';  // 合并窗口图标
  };
  
  // 布局模式
  layout: {
    type: 'split-horizontal' | 'split-vertical' | 'tabbed';
    configurable: true;  // 用户可切换布局
    default: 'split-horizontal';
    
    // 分栏比例
    splitRatio: {
      left: 0.6;  // 日志窗口占60%
      right: 0.4;  // 输入框占40%
      adjustable: true;
      minLeft: 0.3;
      maxLeft: 0.8;
    };
  };
  
  // 包含的窗口
  containedWindows: {
    logWindow: {
      id: string;
      type: 'chat-log';
      position: 'left' | 'top';
      linkedConversation: {
        conversationId: string;
        projectId: string;
      };
    };
    inputWindow: {
      id: string;
      type: 'input-box';
      position: 'right' | 'bottom';
      linkedToLog: true;  // 与日志窗口关联
      sameConversation: true;  // 使用同一个对话
    };
  };
  
  // 交互特性
  interactions: {
    // 拖拽调整分栏
    resizeSplitter: {
      enabled: true;
      livePreview: true;  // 拖拽时实时预览
      snapToRatio: [0.25, 0.33, 0.5, 0.67, 0.75];  // 吸附到常用比例
    };
    
    // 切换布局
    switchLayout: {
      enabled: true;
      options: ['split-horizontal', 'split-vertical', 'tabbed'];
      animate: true;
      rememberPerContainer: true;  // 记住每个容器的布局偏好
    };
    
    // 窗口标签
    tabBar: {
      visible: true;  // 在顶部显示窗口标签
      showCloseButton: true;
      showWindowIcon: true;
      reorderable: true;  // 可以拖拽重排标签
    };
    
    // 最大化/恢复
    maximizeWindow: {
      enabled: true;
      maximizeOne: 'others-minimize' | 'others-overlay' | 'resize-container';  
      // 最大化一个窗口时：其他最小化 / 其他覆盖 / 调整容器大小
    };
    
    // 分离窗口
    separateWindow: {
      enabled: true;
      method: 'drag-out' | 'button-click' | 'context-menu';  // 拖拽分离 / 按钮分离 / 右键菜单分离
      preserveConversation: true;  // 分离后保持对话关联
      createNewInputBox: 'ask' | 'auto' | 'none';  // 分离后是否创建新的输入框：询问 / 自动 / 不创建
    };
  };
  
  // 生命周期
  lifecycle: {
    // 创建
    onCreate: {
      defaultPosition: 'center-screen' | 'remember-last' | 'near-trigger';
      defaultSize: 'half-screen' | 'remember-last' | 'fixed-ratio';
      animate: true;
    };
    
    // 关闭
    onClose: {
      confirmIfUnsent: true;  // 有未发送内容时确认
      saveLayout: true;  // 保存布局以便恢复
      closeAllContained: 'ask' | 'cascade' | 'keep';  // 询问 / 级联关闭 / 保持独立
    };
    
    // 持久化
    persistence: {
      saveState: true;  // 保存容器状态
      saveLayout: true;  // 保存布局
      saveWindowList: true;  // 保存窗口列表
      restoreOnLaunch: 'always' | 'ask' | 'never';  // 启动时恢复
    };
  };
}
```

### 4.4 输入框上方区域 - 待办清单与AI操作

```typescript
interface InputBoxHeaderArea {
  // 整体布局
  layout: {
    height: 'auto';  // 根据内容自适应
    minHeight: 40;
    maxHeight: 200;
    background: var(--color-bg-secondary);
    borderBottom: '1px solid var(--color-border)';
    padding: '8px 12px';
  };
  
  // 左侧：待办清单
  todoList: {
    position: 'left';
    width: '60%';
    
    // 标题
    header: {
      show: true;
      text: 'AI 待办';
      icon: 'CheckSquare';
      collapsible: true;
      defaultCollapsed: false;
    };
    
    // 待办列表
    items: {
      source: 'ai-generated';  // AI自动生成
      userAddable: false;  // 用户不能直接添加
      userEditable: false;  // 用户不能直接编辑
      userDeletable: false;  // 用户不能直接删除
      
      // 每个待办项
      itemStructure: {
        id: string;
        content: string;  // 待办内容
        status: 'pending' | 'in-progress' | 'completed';
        createdAt: Date;
        startedAt?: Date;
        completedAt?: Date;
        
        // AI控制
        controlledBy: 'ai';  // 由AI控制
        aiContext: string;  // AI执行上下文
        priority: 'low' | 'medium' | 'high';
      };
      
      // 用户交互
      interactions: {
        viewDetail: true;  // 点击查看详情
        cancel: {          // 取消待办
          enabled: true;
          method: 'context-menu';  // 右键菜单取消
          confirmation: true;  // 确认对话框
        };
        refresh: {         // 刷新待办列表
          enabled: true;
          method: 'pull-down' | 'button';  // 下拉刷新或按钮刷新
        };
      };
      
      // 显示限制
      display: {
        maxItems: 5;  // 默认显示最多5个
        showCompleted: false;  // 默认不显示已完成的
        expandToShowAll: true;  // 可以展开显示全部
        sortBy: 'priority' | 'createdAt' | 'startedAt';  // 排序方式
      };
    };
  };
  
  // 右侧：AI操作
  aiOperations: {
    position: 'right';
    width: '40%';
    
    // 标题
    header: {
      show: true;
      text: 'AI 操作';
      icon: 'Activity';
      showLiveIndicator: true;  // 显示实时活动指示器
    };
    
    // 当前操作列表
    currentOperations: {
      source: 'ai-execution';  // AI执行过程中的操作
      autoUpdate: true;  // 自动更新
      showProgress: true;  // 显示进度
      
      // 操作项结构
      operationStructure: {
        id: string;
        type: 'analyzing' | 'generating' | 'searching' | 'processing' | 'waiting';
        description: string;  // 操作描述
        status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
        progress?: number;  // 进度百分比
        startedAt: Date;
        estimatedEnd?: Date;  // 预计完成时间
        canCancel: boolean;  // 是否可以取消
      };
      
      // 显示限制
      display: {
        maxOperations: 3;  // 最多显示3个同时进行的操作
        showCompletedFor: 3000;  // 完成的操作显示3秒后消失
        expandToShowAll: true;  // 可以展开显示全部
      };
      
      // 用户交互
      interactions: {
        viewDetail: true;  // 点击查看详情
        cancel: {          // 取消操作
          enabled: true;
          requiresConfirmation: true;  // 需要确认
          confirmationMessage: '确定要取消此操作吗？';
        };
        retry: {         // 重试失败的操作
          enabled: true;
          showFor: 'failed';
        };
      };
    };
    
    // 实时活动指示器
    liveIndicator: {
      enabled: true;
      position: 'header-right';
      states: {
        idle: { icon: 'Circle', color: 'gray', pulse: false };
        thinking: { icon: 'Loader', color: 'primary', pulse: true, animation: 'spin' };
        working: { icon: 'Activity', color: 'success', pulse: true };
      };
    };
  };
  
  // 分隔线
  divider: {
    show: true;
    style: 'vertical' | 'gradient';
    color: 'border-light';
  };
}
```

由于token限制，我生成关键部分。完整规格已保存在：`D:

