# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 项目概述

未来办公系统 - 一个 AI 协作平台，参考豆包的页面布局设计。

### 核心功能模块

1. **新对话** - AI 对话界面，支持快捷技能入口
2. **任务控制中心** - 团队看板，展示成员状态、任务进度
3. **智能体** - iframe 嵌入扣子智能体商店
4. **技能** - 自定义技能管理，支持创建和调用外部 REST API
5. **历史对话** - 左侧导航展示历史对话记录

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── page.tsx        # 主页面
│   │   ├── layout.tsx      # 根布局
│   │   ├── globals.css     # 全局样式
│   │   └── api/            # API 路由
│   │       ├── chat/       # 对话 API
│   │       ├── ekp/        # EKP 集成 API
│   │       └── custom-skill/ # 自定义技能 API
│   ├── components/         # 业务组件
│   │   ├── sidebar.tsx     # 左侧导航栏
│   │   ├── main-content.tsx # 主内容区（页签系统）
│   │   ├── history-panel.tsx # 历史对话面板
│   │   ├── custom-skill-dialog.tsx # 自定义技能配置对话框
│   │   ├── pages/          # 页面组件
│   │   │   ├── new-chat.tsx      # 新对话页面
│   │   │   ├── task-center.tsx   # 任务控制中心
│   │   │   ├── agents.tsx        # 智能体页面
│   │   │   └── skills.tsx        # 技能页面（支持自定义技能）
│   │   └── ui/             # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   ├── utils.ts        # 通用工具函数 (cn)
│   │   ├── ekp-rest-client.ts # EKP REST 客户端
│   │   ├── custom-skill-executor.ts # 自定义技能执行器
│   │   └── database/       # 数据库层
│   │       ├── types.ts    # 数据库类型定义
│   │       ├── manager.ts  # 数据库连接管理器
│   │       ├── index.ts    # 统一导出
│   │       └── repositories/ # Repository 层
│   │           ├── user.repository.ts
│   │           ├── apikey.repository.ts
│   │           ├── chatsession.repository.ts
│   │           ├── customskill.repository.ts
│   │           ├── ekpconfig.repository.ts
│   │           └── databaseconfig.repository.ts
│   └── types/              # 类型定义
│       └── custom-skill.ts # 自定义技能类型定义
├── database-schema.sql     # 数据库表结构 SQL 脚本
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

## 用户管理

### 核心逻辑
- **sys_org_person 表就是系统用户表**
- 在组织架构添加人员时，直接创建 sys_org_person 记录
- sys_org_person.fd_id 即为系统的 userId
- 无需单独的 users 表

### 用户登录
- 支持用户名/密码登录：`POST /api/auth/login`
  - 在 sys_org_person 表中通过 fd_login_name 查找
  - 验证 fd_password 字段
  - 返回 userId（即 fd_id）
- 支持钉钉信息登录：通过 `rtx_account` 或 `email` 匹配
- 登录成功后返回 `userId`（sys_org_person.fd_id）
- 前端将 `userId` 保存到 localStorage（key: `current-user-id`）

### API 接口
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/current` - 获取当前用户信息

### 用户会话
- 所有会话 API 请求需要通过 `X-User-ID` 请求头传递用户 ID
- 前端从 localStorage 读取 `current-user-id`（即 sys_org_person.fd_id）
- useChatHistory Hook 自动处理用户 ID

## 自定义技能系统

### 概述
自定义技能系统允许用户将外部 REST API 封装为可复用的技能，支持：
- 多种认证方式：Basic Auth、Bearer Token、API Key、无认证
- 灵活的请求参数配置
- 响应解析规则配置
- 技能测试和执行

### 预置模板
- `ekpTodoCount`: EKP待办查询 - 查询蓝凌EKP系统的待办数量
- `ekpLeaveApply`: EKP请假申请 - 在蓝凌EKP系统发起请假申请

### API 接口
- `GET /api/custom-skill?type=templates` - 获取预置模板
- `GET /api/custom-skill?action=list` - 获取技能列表
- `POST /api/custom-skill` - 创建/更新/删除/测试/执行技能

### 类型定义
```typescript
interface CustomSkill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: SkillCategory;
  enabled: boolean;
  apiConfig: ApiConfig;
  authConfig: AuthConfig;
  requestParams: RequestParam[];
  bodyTemplate?: Record<string, unknown>;
  responseParsing: ResponseParsing;
}
```

## 管理员后台

### 核心功能
- **系统概览** - 系统整体数据展示
- **智能体管理** - 智能体列表和创建
- **技能管理** - 技能列表和模板管理
- **组织权限管理** - 组织架构、成员和权限管理
- **集成中心** - API 和 Webhook 配置
- **数据库配置** - 数据库连接管理和数据迁移（新增）

### 路由结构
- `/admin/overview` - 系统概览
- `/admin/agents` - 智能体管理
- `/admin/skills` - 技能管理
- `/admin/organization` - 组织权限管理
- `/admin/integration` - 集成中心
- `/admin/database` - 数据库配置（新增）

## EKP 集成

### 功能
- 连接测试
- 获取待办数量
- 待办类型：-1(已办)、0(所有待办)、1(审批类)、2(通知类)、3(暂挂类)、13(审批+暂挂)

### API 接口
- `POST /api/ekp?action=test` - 测试连接
- `POST /api/ekp?action=getTodoCount` - 获取待办数量

### 正确配置
- EKP地址: `https://oa.fjhxrl.com`
- 接口路径: `/api/sys-notify/sysNotifyTodoRestService/getTodo`
- Content-Type: `application/json`
- 认证方式: Basic Auth

## 数据库系统

### 概述
系统支持从 localStorage 迁移到 MySQL 数据库，实现数据持久化和多数据库管理。

### 核心功能
- **数据库配置管理** - 支持添加、测试、连接多个数据库配置
- **数据迁移** - 将 localStorage 数据迁移到 MySQL
- **连接池管理** - 使用连接池管理数据库连接
- **Repository 层** - 统一的数据访问层，提供 CRUD 操作

### 数据库表结构
- `users` - 用户表（包含预置用户：admin、user、system）
- `api_keys` - API Keys 配置表（系统级配置关联到 system 用户）
- `chat_sessions` - 对话会话表
- `chat_messages` - 对话消息表
- `custom_skills` - 自定义技能表
- `ekp_configs` - EKP 配置表（系统级配置关联到 system 用户）
- `database_configs` - 数据库配置表
- `organizations` - 组织架构表

### System 用户

**用途**：管理员后台创建的系统级配置（API Keys、EKP 配置等）关联到 system 用户。

**用户信息**：
- ID: `00000000-0000-0000-0000-000000000000`
- 用户名: `system`
- 角色: `admin`

**外键约束**：
- `api_keys.user_id` → `users.id`
- `ekp_configs.user_id` → `users.id`
- 所有系统级配置必须关联到有效用户

**注意事项**：
- 禁止手动删除 system 用户
- 禁止修改 system 用户 ID
- 新增系统级配置时自动使用 system 用户

### API 接口
- `GET /api/database` - 获取数据库配置列表和状态
- `POST /api/database?action=init` - 初始化数据库表结构
- `POST /api/database?action=test` - 测试数据库连接
- `POST /api/database?action=connect` - 连接到指定数据库
- `POST /api/database?action=disconnect` - 断开数据库连接
- `GET /api/database/migrate` - 获取数据迁移预览
- `POST /api/database/migrate` - 执行数据迁移

### 数据访问层
所有数据操作通过 Repository 层进行，位于 `src/lib/database/repositories/` 目录：
- `user.repository.ts` - 用户数据访问
- `apikey.repository.ts` - API Keys 数据访问
- `chatsession.repository.ts` - 对话会话数据访问
- `customskill.repository.ts` - 自定义技能数据访问
- `ekpconfig.repository.ts` - EKP 配置数据访问
- `databaseconfig.repository.ts` - 数据库配置管理

### 使用示例
```typescript
import { userRepository, dbManager } from '@/lib/database';

// 连接数据库
await dbManager.connect({
  id: 'config-id',
  name: 'MySQL',
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  databaseName: 'future_office',
  username: 'root',
  password: 'password',
  isActive: true,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// 创建用户
const userId = await userRepository.create({
  username: 'testuser',
  password: 'hashed_password',
  email: 'test@example.com',
  role: 'user',
  status: 'active',
});

// 查询用户
const user = await userRepository.findByUsername('testuser');
```

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

- **项目理解加速**：初始可以依赖项目下`package.json`文件理解项目类型，如果没有或无法理解退化成阅读其他文件。
- **Hydration 错误预防**：严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**

## 构建与测试命令

- **类型检查**: `pnpm ts-check`
- **构建**: `pnpm build`
- **开发**: `pnpm dev` 或 `coze dev`
- **启动生产服务**: `pnpm start` 或 `coze start`
