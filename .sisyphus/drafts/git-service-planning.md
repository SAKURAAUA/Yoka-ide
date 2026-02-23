# Draft: GitService 动态模块化实现

## 需求确认（已回答）

### Q1: Git 操作范围
- **选择**: 完整功能
- **说明**: 包括 add/commit/push/pull/branch/merge/rebase 等全部操作

### Q2: AI 调用方式  
- **选择**: MCP Server 方式
- **说明**: 最方便安装/卸载和最省性能的方式，与现有 excel-mcp-server 架构一致

### Q3: 可插拔方式
- **选择**: 动态模块化
- **说明**: 用户可启用/停用/卸载 Git 模块，启用时保存状态，下次默认启动

### Q4: 监听机制
- **选择**: 全部监听
- **说明**: 本地变更检测（chokidar）+ 远端变更轮询（定时 fetch + status）

---

## 技术选型

### 核心依赖
- `simple-git`: Git CLI 封装，兼容性最好
- `chokidar`: 本地文件监听
- `@modelcontextprotocol/sdk`: MCP Server SDK

### 技术选型
- **MCP 部署形态**: STDIO 子进程（推荐）
- **Git 操作库**: simple-git
- **文件监听**: chokidar
- **MCP SDK**: @modelcontextprotocol/sdk

---

## 待确认

- [x] 定时轮询间隔偏好？（默认 60s/可配置？）→ 用户可调节
- [x] MCP Server 部署形态？（STDIO / HTTP / 内嵌？）→ STDIO 子进程
- [x] 写操作确认方式？（弹窗确认 / 快捷键 / 完全禁用？）→ 可配置

## 补充需求

- **仓库模型**: 可配置"始终监听"，切换项目时监听当前项目
- **MVP 范围**: 先做简单的拉取/追踪功能（status/diff/fetch/pull）
- **特殊状态**: 需要支持 worktree / submodule / detached HEAD

---

## 范围边界

**IN**:
- 本地 Git 仓库完整操作
- AI 通过 MCP 调用
- 实时状态监听（本地 + 远端）
- 动态启停/状态持久化

**OUT**:
- 不做远程 Git 托管平台（Gitea/GitLab 等）
- 不做权限管理/认证（复用现有项目凭据）
