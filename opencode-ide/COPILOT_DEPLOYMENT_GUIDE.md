# 🚀 Copilot SDK + CLI 部署指南

## 快速状态

| 组件 | 状态 | 说明 |
|------|------|------|
| Copilot SDK | ✅ 已安装 | npm: `@github/copilot-sdk@^0.1.25` |
| GitHub CLI | ✅ 已安装 | System: `gh version 2.87.2` |
| Copilot CLI 扩展 | ⏳ 待激活 | 需要 GitHub 认证 |
| 环境变量认证 | ✅ 支持 | 可绕过 CLI 直接使用 Token |

---

## 认证方式（3 选 1）

### 方式 1️⃣：使用 GitHub 个人令牌（推荐 🌟）

**最简单、最快速的方式**

1. **生成 GitHub 个人令牌**
   - 访问：https://github.com/settings/tokens/new
   - 选择 `"Classic"` type
   - 权限勾选：`repo`, `user`, `codespace`
   - 点击"Generate token"，复制令牌

2. **设置环境变量**
   - **Windows (PowerShell)**
     ```powershell
     $env:GH_TOKEN = "your_token_here"
     
     # 或添加到系统环境变量（永久生效）
     [Environment]::SetEnvironmentVariable("GH_TOKEN","your_token_here","User")
     ```
   
   - **Windows (CMD)**
     ```cmd
     set GH_TOKEN=your_token_here
     ```
   
   - **Linux/Mac (Bash)**
     ```bash
     export GH_TOKEN="your_token_here"
     ```

3. **验证认证**
   ```bash
   # 启动应用
   npm run electron:dev
   
   # Chat 应该显示"已登录"状态
   ```

---

### 方式 2️⃣：使用 GitHub CLI 登录

**需要交互式浏览器认证**

```powershell
# 刷新 PATH（如果 gh 不可用）
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 登录
gh auth login --web

# 选择：
# - Protocol: HTTPS
# - Authorize: Yes
# - Method: Login with a web browser
```

**完成后**：
```powershell
# 安装 Copilot CLI 扩展
gh extension install github/gh-copilot

# 验证
gh copilot --version
```

---

### 方式 3️⃣：在 Electron 存储中保存 Token

应用启动时，在 Chat 面板中：
1. 点击"连接"按钮
2. 在弹出窗口输入 GitHub 令牌
3. 令牌保存到本地加密存储（`electron-store`）

---

## 验证部署

### 1. 检查 SDK 安装
```bash
cd opencode-ide
npm list @github/copilot-sdk
```

✅ 应看到版本号，如：`@github/copilot-sdk@0.1.25`

### 2. 检查 CLI 安装
```bash
# 刷新 PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

gh --version
```

✅ 应显示：`gh version 2.87.2`

### 3. 检查认证
```bash
# 使用环境变量检查
$env:GH_TOKEN  # 应显示你的令牌

# 或检查 CLI 状态
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
gh auth status
```

---

## 秘密管理（⚠️ 安全提示）

### 安全做法 ✅
1. **不要在代码中硬编码令牌**
2. **使用环境变量**（开发）
3. **使用系统 Keychain**（生产）
4. **使用 `.env.local`**（本地开发，不提交）

### 本地 .env.local 例子
```
GH_TOKEN=ghs_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
COPILOT_GITHUB_TOKEN=ghs_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 常见问题

### Q: 为什么没有弹出浏览器窗口？
**A**: 网络延迟或防火墙阻止。改用方式 1️⃣（令牌方式）

### Q: 我的令牌失效了
**A**: 
1. 到 https://github.com/settings/tokens 检查令牌状态
2. 撤销过期令牌，生成新的
3. 更新环境变量或应用存储

### Q: Copilot SDK 返回"Unauthorized"
**A**: 
1. 检查令牌是否有效：`gh auth token` 在 CLI 中
2. 检查环境变量是否正确设置
3. 如果使用 `useLoggedInUser: true`，需要通过 GitHub CLI 登录

### Q: 如何在生产环境中安全地存储令牌？
**A**: 
- 使用系统 Keychain（Windows Credential Manager）
- 使用 `electron-keytar` 库
- 使用 Kubernetes Secret（如部署在容器中）

---

## 测试集成

启动应用后，测试流程：

```
1. 打开 Chat 面板
2. 检查顶部状态：
   - "已登录" ✅ - 可以发送消息
   - "未登录" ❌ - 需要认证
3. 如果"未登录"，点击"连接"按钮
4. 输入令牌或完成 CLI 登录
5. 输入测试消息：
   "Hello, Copilot!"
6. 等待响应（5-10 秒）
7. 显示来自 Copilot 的完整回复 ✅
```

---

## 故障排查

### 启用调试日志
```powershell
# 设置 DEBUG 环境变量
$env:DEBUG = "copilot:*"

# 启动应用
npm run electron:dev

# 观察 Electron 主进程控制台输出
```

### 检查日志文件
```
Windows: %APPDATA%\opencode-ide\log.txt
Linux: ~/.config/opencode-ide/log.txt
Mac: ~/Library/Logs/opencode-ide/log.txt
```

---

## 后续步骤

1. ✅ 选择认证方式（建议：方式 1️⃣ 令牌）
2. ✅ 设置 `GH_TOKEN` 环境变量
3. ✅ 启动应用：`npm run electron:dev`
4. ✅ 在 Chat 中测试消息发送
5. 收集反馈并迭代 UI/UX

---

**最后更新**: 2026-02-22
**SDK 版本**: @github/copilot-sdk@^0.1.25
**GitHub CLI**: 2.87.2
