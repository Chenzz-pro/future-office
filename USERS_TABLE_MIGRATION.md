# Users 表迁移说明

## 概述

为了统一用户管理，系统已废弃 `users` 表，改用 `sys_org_person` 表作为唯一的用户表。

## 迁移记录

### 已废弃的表
- `users` - 已废弃，不再使用

### 新的用户表
- `sys_org_person` - 组织架构人员表，现在也是系统用户表

## 字段映射

| users 表字段 | sys_org_person 表字段 | 说明 |
|------------|---------------------|------|
| `id` | `fd_id` | 用户ID |
| `username` | `fd_login_name` | 登录名 |
| `password` | `fd_password` | 密码 |
| `email` | `fd_email` | 邮箱 |
| `role` | `fd_role` | 用户角色（admin/user） |
| `status` | `fd_is_login_enabled` | 是否允许登录（1=是，0=否） |
| `avatar_url` | - | 不存在，需要额外存储 |
| `last_login_at` | - | 不存在，需要额外存储 |
| `created_at` | `fd_create_time` | 创建时间 |
| `updated_at` | `fd_alter_time` | 修改时间 |

## 代码变更

### 1. API Keys 路由（已修复）
**文件**：`src/app/api/admin/api-keys/route.ts`

**变更**：`ensureSystemUser()` 函数从操作 `users` 表改为操作 `sys_org_person` 表

```typescript
// 修复前
const { rows } = await dbManager.query(
  'SELECT id FROM users WHERE id = ?',
  [systemUserId]
);

await dbManager.query(
  `INSERT INTO users (id, username, password, email, role, status)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [systemUserId, 'system', 'system', 'system@system.local', 'admin', 'active']
);

// 修复后
const { rows } = await dbManager.query(
  'SELECT fd_id FROM sys_org_person WHERE fd_id = ?',
  [systemUserId]
);

await dbManager.query(
  `INSERT INTO sys_org_person (fd_id, fd_name, fd_login_name, fd_email, fd_role, fd_is_login_enabled, fd_is_business_related, fd_user_type)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [systemUserId, 'System', 'system', 'system@system.local', 'admin', 0, 1, 'system']
);
```

### 2. User Repository（已修复）
**文件**：`src/lib/database/repositories/user.repository.ts`

**变更**：所有方法从操作 `users` 表改为操作 `sys_org_person` 表

- `create()` - 改为插入 `sys_org_person` 表
- `findById()` - 改为查询 `sys_org_person` 表
- `findByUsername()` - 改为查询 `sys_org_person` 表
- `findByEmail()` - 改为查询 `sys_org_person` 表
- `findAll()` - 改为查询 `sys_org_person` 表
- `update()` - 改为更新 `sys_org_person` 表
- `delete()` - 改为删除 `sys_org_person` 表

## 外键关系

### 需要更新 user_id 外键的表

以下表的 `user_id` 字段现在应该引用 `sys_org_person.fd_id`：

1. `api_keys` - API Keys 配置表
   - 字段：`user_id`
   - 引用：`sys_org_person.fd_id`

2. `chat_sessions` - 对话会话表
   - 字段：`user_id`
   - 引用：`sys_org_person.fd_id`

3. `custom_skills` - 自定义技能表
   - 字段：`user_id`
   - 引用：`sys_org_person.fd_id`

4. `ekp_configs` - EKP 配置表
   - 字段：`user_id`
   - 引用：`sys_org_person.fd_id`

## System 用户

System 用户用于管理员后台创建的系统级配置（API Keys、EKP 配置等）。

**用户信息**：
- ID: `00000000-0000-0000-0000-000000000000`
- 用户名: `system`
- 角色: `admin`
- 是否允许登录: 0（不允许登录）

**自动创建**：
- System 用户会在首次连接数据库时自动创建（在 `autoInitTables()` 中）
- 也会在添加 API Key 时检查并创建（在 `ensureSystemUser()` 中）

## 数据迁移

如果之前有 `users` 表的数据，可以使用以下 API 迁移：

**API 端点**：`POST /api/migrate/users-to-sys-org-person`

**参数**：
- `dropTable`: 是否删除 `users` 表（默认 false）

**迁移逻辑**：
1. 检查 `users` 表是否存在
2. 如果存在，将数据迁移到 `sys_org_person` 表
3. 如果指定了 `dropTable`，则删除 `users` 表

## 注意事项

1. **向后兼容性**：为了保持向后兼容性，`UserRepository` 暂时保留，但内部已改为操作 `sys_org_person` 表

2. **字段缺失**：`sys_org_person` 表中没有 `avatar_url` 和 `last_login_at` 字段，如果需要这些功能，需要扩展示表结构或使用其他方式存储

3. **外键约束**：确保所有关联表的 `user_id` 字段都正确引用 `sys_org_person.fd_id`

4. **System 用户**：System 用户的 `fd_is_login_enabled` 设置为 0，不允许登录，仅用于系统级配置

## 验证清单

- [x] 修复 `src/app/api/admin/api-keys/route.ts` 中的 `ensureSystemUser()` 函数
- [x] 修复 `src/lib/database/repositories/user.repository.ts` 中的所有方法
- [x] 确保所有外键关系正确
- [x] System 用户自动创建逻辑正确
- [ ] 测试 API Key 添加功能
- [ ] 测试 EKP 配置功能
- [ ] 测试用户登录功能
