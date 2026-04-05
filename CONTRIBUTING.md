# 贡献指南

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### 安装依赖

\`\`\`bash
pnpm install
\`\`\`

### 启动开发服务

\`\`\`bash
pnpm dev
\`\`\`

### 构建生产版本

\`\`\`bash
pnpm build
\`\`\`

---

## 分支策略

### 分支命名规范

| 分支类型 | 命名格式 | 示例 |
|----------|----------|------|
| 功能开发 | `feature/<模块>-<描述>` | `feature/chat-quick-skills` |
| Bug 修复 | `bugfix/<模块>-<描述>` | `bugfix/ekp-auth-error` |
| 重构 | `refactor/<模块>-<描述>` | `refactor/skills-modularize` |
| 文档 | `docs/<描述>` | `docs/api-documentation` |
| 发布 | `release/<版本号>` | `release/v1.2.0` |

### 分支保护规则

- `main` 分支：需要 PR + 2 人 Review + CI 通过
- `develop` 分支：需要 PR + 1 人 Review + CI 通过

---

## Commit 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 格式

\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

### 类型 (type)

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(chat): 添加消息撤回功能` |
| `fix` | Bug 修复 | `fix(ekp): 修复认证失败问题` |
| `refactor` | 重构（不改变功能） | `refactor(skills): 模块化拆分组件` |
| `docs` | 文档更新 | `docs: 更新 API 文档` |
| `style` | 代码格式（不影响逻辑） | `style(chat): 调整代码缩进` |
| `test` | 测试相关 | `test(chat): 添加消息发送测试` |
| `chore` | 构建/工具相关 | `chore: 更新依赖版本` |
| `perf` | 性能优化 | `perf(chat): 优化消息渲染性能` |

### 作用域 (scope)

| 模块 | 说明 |
|------|------|
| `chat` | 对话模块 |
| `skills` | 技能模块 |
| `ekp` | EKP 集成模块 |
| `ui` | UI 组件 |
| `api` | API 接口 |
| `shared` | 共享模块 |

### 示例

\`\`\`bash
# 功能开发
feat(chat): 添加快捷技能入口

- 支持从 localStorage 加载自定义技能
- 点击技能可快速执行
- 显示自定义技能标签

Closes #123

# Bug 修复
fix(ekp): 修复 Basic Auth 认证失败问题

修复了当 authConfig 为 undefined 时 API 崩溃的问题

# 重构
refactor(skills): 将技能组件拆分为独立模块

将技能相关代码从 components/pages 移动到 modules/skills
\`\`\`

---

## 开发规范

### 目录结构

\`\`\`
src/
├── modules/           # 业务模块（按功能划分）
│   ├── chat/          # 对话模块
│   ├── skills/        # 技能模块
│   ├── ekp/           # EKP 集成模块
│   └── shared/        # 共享模块
├── components/ui/     # UI 组件库 (shadcn/ui)
├── app/api/           # API 路由
└── lib/               # 工具函数
\`\`\`

### 模块划分原则

1. **单一职责**：每个模块只负责一个业务领域
2. **依赖方向**：业务模块 → 共享模块，禁止反向依赖
3. **接口先行**：先定义 TypeScript 类型，再实现功能
4. **文档同步**：每个模块必须有 README.md

### 代码风格

- 使用 ESLint + Prettier 自动格式化
- 提交前运行检查：

\`\`\`bash
pnpm lint
pnpm ts-check
\`\`\`

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `ChatInput.tsx` |
| Hook | camelCase + use 前缀 | `useChat.ts` |
| 工具函数 | camelCase | `formatDate.ts` |
| 类型/接口 | PascalCase | `ChatMessage` |
| 常量 | UPPER_SNAKE_CASE | `MAX_MESSAGE_LENGTH` |
| 文件夹 | kebab-case | `chat-input/` |

---

## Pull Request 流程

### 1. 创建功能分支

\`\`\`bash
git checkout develop
git pull origin develop
git checkout -b feature/chat-quick-skills
\`\`\`

### 2. 开发并提交

\`\`\`bash
# 确保代码质量
pnpm lint
pnpm ts-check
pnpm build

# 提交代码
git add .
git commit -m "feat(chat): 添加快捷技能入口"
git push origin feature/chat-quick-skills
\`\`\`

### 3. 创建 Pull Request

- 标题格式：`[模块] 简短描述`
- 填写 PR 模板
- 关联相关 Issue
- 指定 Reviewer

### 4. Code Review

- 至少 1 人 Approve
- CI 检查通过
- 解决所有 Review 意见

### 5. 合并

- 使用 "Squash and merge"
- 删除功能分支

---

## 代码审查清单

提交 PR 前，请确保：

- [ ] 代码通过 `pnpm lint` 检查
- [ ] 代码通过 `pnpm ts-check` 类型检查
- [ ] 代码通过 `pnpm build` 构建
- [ ] 无 console.log（使用 logger 或移除）
- [ ] 无硬编码配置（使用环境变量）
- [ ] 错误处理完善
- [ ] 关键逻辑有注释
- [ ] 无安全风险（XSS、敏感信息泄露）
- [ ] 新功能有对应文档

---

## 联系方式

如有问题，请联系：

- 项目负责人：@team-lead
- 对话模块：@developer-a
- 技能模块：@developer-b
- EKP 集成：@developer-c
