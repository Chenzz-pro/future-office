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
4. **技能** - iframe 嵌入扣子技能商店
5. **历史对话** - 左侧导航展示历史对话记录

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── page.tsx        # 主页面
│   │   ├── layout.tsx      # 根布局
│   │   └── globals.css     # 全局样式
│   ├── components/         # 业务组件
│   │   ├── sidebar.tsx     # 左侧导航栏
│   │   ├── main-content.tsx # 主内容区（页签系统）
│   │   ├── history-panel.tsx # 历史对话面板
│   │   ├── pages/          # 页面组件
│   │   │   ├── new-chat.tsx      # 新对话页面
│   │   │   ├── task-center.tsx   # 任务控制中心
│   │   │   ├── agents.tsx        # 智能体页面
│   │   │   └── skills.tsx        # 技能页面
│   │   └── ui/             # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   └── lib/                # 工具库
│       └── utils.ts        # 通用工具函数 (cn)
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
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
