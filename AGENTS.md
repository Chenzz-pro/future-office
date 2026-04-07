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
│   │   ├── login/          # 登录页面
│   │   │   └── page.tsx    # 登录页面（支持自动跳转）
│   │   ├── system-init/    # 系统初始化页面
│   │   │   └── page.tsx    # 系统初始化页面（数据库配置和初始化）
│   │   └── api/            # API 路由
│   │       ├── chat/       # 对话 API
│   │       ├── ekp/        # EKP 集成 API
│   │       ├── admin/      # 管理后台 API
│   │       │   └── ekp-interfaces/ # EKP接口管理 API
│   │       ├── custom-skill/ # 自定义技能 API
│   │       ├── auth/       # 认证 API（登录、密码管理）
│   │       ├── database/   # 数据库管理 API（初始化、连接、迁移）
│   │       ├── organization/ # 组织架构管理 API
│   │       └── system/     # 系统管理 API（状态检查、初始化）
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
│   │   ├── ekp-client.ts   # EKP业务接口适配器（集成EKPInterfaceRegistry）
│   │   ├── ekp-interface-registry.ts # EKP接口注册中心
│   │   ├── ekp-custom-interface-loader.ts # 二开接口加载器
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
- sys_org_person.fd_role 字段是外键，关联到 sys_role 表
- 无需单独的 users 表

### 角色管理
- **角色表**：sys_role 表存储系统角色信息
- **默认角色**：
  - 超级管理员（ID: 00000000-0000-0000-0000-000000000001）- 拥有系统所有权限
  - 管理员（ID: 00000000-0000-0000-0000-000000000002）- 拥有大部分管理权限
  - 普通用户（ID: 00000000-0000-0000-0000-000000000003）- 普通用户权限
- **角色字段**：sys_org_person.fd_role 是外键，关联 sys_role.fd_id
- **角色迁移**：
  - 支持从旧的 ENUM 类型（admin/user）迁移到外键关联
  - 自动迁移 API：`POST /api/database/migrate/role`
  - 检查迁移状态：`GET /api/database/migrate/role`
- **API 接口**：
  - `GET /api/organization/role` - 获取角色列表
  - `POST /api/organization/role` - 创建/更新/删除角色
  - `GET /api/organization/role/[id]` - 获取角色详情

### 密码管理
- **密码加密**：使用 bcrypt 加密（盐值轮数 10）
- **向后兼容**：支持 base64 编码的旧密码验证，登录时会自动提示更新
- **密码强度**：支持密码强度检查和随机密码生成
- **创建人员时的密码处理**：
  - 在组织架构管理中创建人员时，支持两种密码设置方式：
    1. **自动生成**：登录密码字段留空，系统自动生成 12 位随机密码（包含数字和大写字母）
    2. **手动设置**：在登录密码字段输入自定义密码
  - 创建成功后，系统会弹窗提示生成的密码（仅显示一次）
  - 旧版本（2026-04-06 之前）的默认密码是 `123456`，新版本已升级为自动生成随机密码
  - 详细说明见 [PERSON_PASSWORD_GUIDE.md](./PERSON_PASSWORD_GUIDE.md)

### 用户登录
- 支持用户名/密码登录：`POST /api/auth/login`
  - 在 sys_org_person 表中通过 fd_login_name 查找
  - 验证 fd_password 字段（支持 bcrypt 和 base64）
  - 返回 userId（即 fd_id）
  - 如果密码是 base64 编码，返回 needPasswordUpdate: true
- 支持钉钉信息登录：通过 `rtx_account` 或 `email` 匹配
- 登录成功后返回 `userId`（sys_org_person.fd_id）
- 前端将 `userId` 保存到 localStorage（key: `current-user-id`）

### API 接口
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/current` - 获取当前用户信息
- `POST /api/auth/password/reset` - 重置密码（管理员操作）
- `PUT /api/auth/password/change` - 修改密码（用户自己操作）
- `GET /api/auth/password/strength` - 检查密码强度
- `POST /api/auth/password/generate` - 生成随机密码

### 用户会话
- 所有会话 API 请求需要通过 `X-User-ID` 请求头传递用户 ID
- 前端从 localStorage 读取 `current-user-id`（即 sys_org_person.fd_id）
- useChatHistory Hook 自动处理用户 ID

### 数据迁移
- 从 users 表迁移到 sys_org_person：`POST /api/migrate/users-to-sys-org-person`
- 迁移预览：`GET /api/migrate/users-to-sys-org-person`
- 迁移时会自动将 base64 密码重新加密为 bcrypt

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

## 系统初始化

### 概述
系统初始化功能支持在首次部署时自动创建数据库、初始化表结构和创建默认账号。

### 核心功能
- **数据库配置** - 配置 MySQL 数据库连接信息
- **自动初始化** - 自动创建数据库、表结构和默认账号
- **状态检查** - 检查数据库连接状态和系统初始化状态
- **登录引导** - 初始化成功后提供登录引导和自动跳转

### 默认账号
系统初始化后会自动创建以下默认账号：
- **管理员账号**：`admin` / `admin123` - 拥有所有权限
- **普通用户账号**：`user` / `user123` - 可以访问基本功能

### 自动创建的表结构
系统初始化时会自动创建以下表结构：

#### 组织架构表（来自 database-schema-org-structure.sql）
- `sys_org_element` - 组织机构树（机构、部门、岗位）
- `sys_org_person` - 人员表（也是系统用户表）
- `sys_org_post_person` - 岗位人员关联表
- `sys_org_staffing_level` - 人员级别表

#### 系统核心表（自动创建）
- `database_configs` - 数据库配置表
- `api_keys` - API Keys 配置表
- `chat_sessions` - 对话会话表
- `chat_messages` - 对话消息表
- `custom_skills` - 自定义技能表
- `ekp_configs` - EKP 配置表
- `organizations` - 组织架构表（为管理后台预留）

### API 接口
- `GET /api/system/status` - 获取系统状态（数据库连接、初始化状态）
- `POST /api/system/init` - 初始化系统（创建管理员账号）

### 页面路由
- `/system-init` - 系统初始化页面
- `/login` - 登录页面（自动检测系统状态并跳转）

### 初始化流程
1. 访问系统初始化页面 `/system-init`
2. 填写数据库配置信息
3. 点击"保存并连接"按钮
4. 系统自动创建数据库和表结构
5. 自动创建默认账号和组织架构
6. 显示登录引导卡片，5秒后自动跳转到登录页面

### 相关文档
- 详细部署指南：[SYSTEM_INIT_GUIDE.md](./SYSTEM_INIT_GUIDE.md)

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
- `/admin/organization/structure` - 组织架构树
- `/admin/organization/role` - 角色管理（新增）
- `/admin/integration` - 集成中心
  - `/admin/integration/ekp` - EKP集成配置
    - "连接配置" Tab - 配置EKP连接信息
    - "接口管理中心" Tab - 管理EKP接口
- `/admin/database` - 数据库配置（新增）

## 组织架构管理

### 组织架构树
组织架构树展示机构和部门的层级结构，不显示人员。

**树形结构规则：**
- 机构（type=1）：作为根节点，没有父节点
- 部门（type=2）：支持多级嵌套，父节点可以是机构或另一个部门
- 人员不显示在树中，只在右侧列表中显示

**示例结构：**
```
海峡人力
├── 董事会
├── 经营班子
├── 人力资源部
│   ├── 人力一组
│   ├── 人力二组
│   └── 人力三组
├── 财务资金部
│   ├── 资金部
│   └── 财务部
└── 省外区域中心
    ├── 广东运营中心
    └── 陕西运营中心
        ├── 分公司1
        └── 分公司2
```

**API 接口：**
- `GET /api/organization?action=tree&type=1` - 获取树形数据（只显示机构）
- `GET /api/organization?action=tree&type=2` - 获取树形数据（显示机构和部门）
- `GET /api/organization?action=list&type=person&parentId=xxx` - 获取指定部门的人员列表

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

## EKP接口管理中心

### 概述
EKP接口管理中心是一个统一的接口管理平台，用于管理所有蓝凌EKP系统的接口配置。支持官方接口和二开接口的统一管理。

### 核心功能
- **官方接口管理** - 管理蓝凌EKP官方提供的REST接口
- **二开接口管理** - 管理企业二次开发的接口
- **接口测试** - 在线测试接口调用
- **接口配置** - 配置请求参数、响应解析规则
- **批量管理** - 支持导入、导出接口配置

### 数据库表结构
- `ekp_official_interfaces` - 官方接口表
  - `id` - 主键
  - `code` - 接口代码（唯一标识）
  - `name` - 接口名称
  - `category` - 分类（document、organization、system、workflow等）
  - `endpoint` - API路径
  - `method` - HTTP方法
  - `enabled` - 是否启用
  - `metadata` - 元数据（JSON格式）
  - `is_system` - 是否系统预置

- 二开接口配置存储在文件：`ekp-custom-interfaces.yaml`

### EKPInterfaceRegistry
EKPInterfaceRegistry是接口注册中心，提供统一的接口访问入口。

**核心方法：**
```typescript
// 获取接口配置
ekpInterfaceRegistry.get(code: string)

// 批量获取接口
ekpInterfaceRegistry.getBatch(codes: string[])

// 获取所有接口
ekpInterfaceRegistry.getAll()

// 按来源获取
ekpInterfaceRegistry.getBySource(source: 'official' | 'custom')

// 获取统计信息
ekpInterfaceRegistry.getStats()

// 创建官方接口
ekpInterfaceRegistry.createOfficial(data)

// 创建二开接口
ekpInterfaceRegistry.createCustom(data)
```

### API 接口
- `GET /api/admin/ekp-interfaces` - 获取接口列表
  - 查询参数：`type` (official|custom)、`category`、`keyword`、`enabled`
- `POST /api/admin/ekp-interfaces` - 创建接口
  - 参数：`source` (official|custom) 和接口数据
- `PUT /api/admin/ekp-interfaces/[id]` - 更新接口
- `DELETE /api/admin/ekp-interfaces/[id]` - 删除接口
- `POST /api/admin/ekp-interfaces/test` - 测试接口调用
- `POST /api/admin/ekp-interfaces/reload` - 重载配置

### 页面路由
- `/admin/integration/ekp` - EKP配置页面
  - "连接配置" Tab - 配置EKP连接信息
  - "接口管理中心" Tab - 管理EKP接口

### 使用示例

**1. 通过接口代码调用EKP接口：**
```typescript
import { callEKPInterface } from '@/lib/ekp-client';

// 调用待办数量接口
const result = await callEKPInterface<{ count: string }>(
  'ekp.todo.getTodo',
  { type: 0 }
);

if (result.success) {
  console.log('待办数量:', result.data);
}
```

**2. 批量调用接口：**
```typescript
import { callEKPInterfacesBatch } from '@/lib/ekp-client';

const results = await callEKPInterfacesBatch([
  { code: 'ekp.todo.getTodo', params: { type: 0 } },
  { code: 'ekp.org.getPerson', params: { personId: 'xxx' } },
]);

results.forEach(({ code, success, data, error }) => {
  console.log(`${code}:`, success ? data : error);
});
```

**3. 直接使用 EKPInterfaceRegistry：**
```typescript
import { ekpInterfaceRegistry } from '@/lib/ekp-interface-registry';

// 获取接口配置
const interfaceConfig = await ekpInterfaceRegistry.get('ekp.todo.getTodo');

// 按分类获取接口
const workflowInterfaces = await ekpInterfaceRegistry.getByCategory('workflow');

// 获取统计信息
const stats = await ekpInterfaceRegistry.getStats();
console.log('总接口数:', stats.total);
console.log('官方接口:', stats.official);
console.log('二开接口:', stats.custom);
```

### 前端组件
- `interfaces-panel.tsx` - 接口管理面板
- `official-interfaces-table.tsx` - 官方接口表格
- `custom-interfaces-table.tsx` - 二开接口表格
- `interface-form-dialog.tsx` - 接口添加/编辑对话框
- `interface-test-dialog.tsx` - 接口测试对话框

### 权限要求
- 只有 `admin` 角色的用户才能访问 EKP接口管理中心
- 左侧导航栏会根据用户角色动态显示"EKP接口管理中心"菜单项

### 相关文件
- `src/lib/ekp-interface-registry.ts` - 接口注册中心
- `src/lib/ekp-custom-interface-loader.ts` - 二开接口加载器
- `src/lib/ekp-client.ts` - EKP客户端（已集成EKPInterfaceRegistry）
- `ekp-custom-interfaces.yaml` - 二开接口配置文件
- 接口路径: `/api/sys-notify/sysNotifyTodoRestService/getTodo`
- Content-Type: `application/json`
- 认证方式: Basic Auth

## 数据库系统

### 概述
系统支持从 localStorage 迁移到 MySQL 数据库，实现数据持久化和多数据库管理。

### 数据库初始化脚本
- **文件名**: `database-schema-org-structure.sql`
- **功能**: 创建组织架构表结构和系统默认账号
- **包含内容**:
  - 组织架构表（sys_org_element、sys_org_person、sys_org_post_person）
  - 角色表（sys_role）- 包含默认角色（超级管理员、管理员、普通用户）
  - 默认管理员账号（admin/admin123）- fd_role 关联超级管理员角色
  - 默认普通用户账号（user/user123）- fd_role 关联普通用户角色
  - 默认组织架构（海峡人力及其下属部门）
  - 系统配置表（database_configs、chat_sessions、chat_messages、custom_skills、ekp_configs）

### 角色表迁移
- **迁移 API**: `/api/database/migrate/role`
- **检查迁移状态**: `GET /api/database/migrate/role`
  - 返回：`roleTableExists`（角色表是否存在）、`isEnumType`（fd_role 是否是 ENUM 类型）、`needMigration`（是否需要迁移）
- **执行迁移**: `POST /api/database/migrate/role`
  - 创建 sys_role 表（如果不存在）
  - 插入默认角色数据
  - 迁移 sys_org_person 表的 fd_role 字段（从 ENUM 改为外键）
- **自动迁移**: 数据库初始化时会自动调用迁移 API，无需手动操作
- **向后兼容**: 支持从旧的 ENUM 类型迁移到新的外键关联

### 角色表手动初始化
如果系统已经部署但没有角色表，可以手动初始化：
- **检查状态**: `GET /api/database/init/role`
- **执行初始化**: `POST /api/database/init/role`
  - 创建 sys_role 表
  - 插入默认角色数据（超级管理员、管理员、普通用户）
- **手动 SQL**: 执行 `database-schema-role-only.sql` 脚本

### 角色选择问题解决
如果在新建人员时角色选择框为空，说明 `sys_role` 表不存在或没有数据：
1. **方式 1（推荐）**: 点击角色选择框中的"初始化角色表"按钮
2. **方式 2**: 访问 `/system-init` 页面重新初始化数据库
3. **方式 3**: 手动执行 SQL 脚本 `database-schema-role-only.sql`

### 初始化方法
1. **自动初始化**：访问 `/system-init` 页面，填写数据库配置后系统自动执行初始化
2. **手动初始化**：执行 `mysql -u root -p future_office < database-schema-org-structure.sql`

### sys_org_person 表（系统用户表）
sys_org_person 表既是组织架构的人员表，也是系统的用户表。

**关键字段：**
- `fd_id` - 用户 ID（唯一标识）
- `fd_login_name` - 登录名
- `fd_password` - 密码（bcrypt 加密）
- `fd_role` - 用户角色 ID（外键关联 sys_role.fd_id）
- `fd_is_login_enabled` - 是否允许登录（1=是，0=否）

**角色权限：**
- 超级管理员（fd_role = 00000000-0000-0000-0000-000000000001）- 拥有系统所有权限
- 管理员（fd_role = 00000000-0000-0000-0000-000000000002）- 拥有大部分管理权限
- 普通用户（fd_role = 00000000-0000-0000-0000-000000000003）- 普通用户权限

**sys_role 表（角色表）：**
- `fd_id` - 角色 ID（主键）
- `fd_name` - 角色名称
- `fd_code` - 角色代码（唯一标识）
- `fd_description` - 角色描述
- `fd_order` - 排序号
- `fd_is_available` - 是否可用（1=是，0=否）

### 数据库表结构
- `sys_role` - 角色表（新增）
- `users` - 用户表（已废弃，使用 sys_org_person）
- `api_keys` - API Keys 配置表（系统级配置关联到 admin 用户）
- `chat_sessions` - 对话会话表
- `chat_messages` - 对话消息表
- `custom_skills` - 自定义技能表
- `ekp_configs` - EKP 配置表（系统级配置关联到 admin 用户）
- `database_configs` - 数据库配置表
- `organizations` - 组织架构表

### 数据库迁移
- **添加 role 字段**：`migrations/add_role_to_sys_org_person.sql`
- **users 表迁移**：`migrations/migrate_users_to_sys_org_person.sql`
- **角色表迁移**：`/api/database/migrate/role` - 将 fd_role 从 ENUM 迁移到外键

## 密码工具库

### 功能
密码工具库提供密码加密、验证和强度检查功能，位于 `src/lib/password/password-utils.ts`。

### 主要函数

#### hashPassword
加密密码：
```typescript
const hashedPassword = await hashPassword('plainPassword', 10);
```

#### verifyPassword
验证密码（支持 bcrypt 和 base64 向后兼容）：
```typescript
const isValid = await verifyPassword('plainPassword', 'hashedPassword');
```

#### checkPasswordStrength
检查密码强度：
```typescript
const result = checkPasswordStrength('MyPassword123');
// { valid: true, strength: 'strong', score: 5, errors: [] }
```

#### generateRandomPassword
生成随机密码：
```typescript
const password = generateRandomPassword(12, {
  includeNumbers: true,
  includeSpecialChars: true,
  includeUppercase: true,
});
```

#### needPasswordUpdate
检查密码是否需要更新（从 base64 迁移到 bcrypt）：
```typescript
const needUpdate = needPasswordUpdate(hashedPassword);
```

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
