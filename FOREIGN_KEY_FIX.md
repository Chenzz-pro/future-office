# 外键约束错误修复说明

## 问题描述

在管理员后台添加豆包 API Key 时出现以下错误：

```
添加失败: Cannot add or update a child row: a foreign key constraint fails
(`futureoffice`.`api_keys`, CONSTRAINT `api_keys_ibfk_1` FOREIGN KEY (`user_id`)
REFERENCES `users` (`id`) ON DELETE CASCADE)
```

## 根本原因

### 外键约束

数据库表 `api_keys` 有以下外键约束：
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

这意味着 `api_keys.user_id` 必须在 `users.id` 中存在。

### 问题代码

在添加 API Key 时，代码使用了以下逻辑：

```typescript
// 错误：使用 'system' 作为 userId
userId: 'system',
```

但是 `users` 表中没有 `id = 'system'` 的用户，导致外键约束失败。

## 解决方案

### 1. 创建 System 用户

在 `database-schema.sql` 中添加了 system 用户：

```sql
-- 插入系统用户（用于管理员后台 API Key 等系统级配置）
INSERT INTO users (id, username, password, email, role) VALUES
('00000000-0000-0000-0000-000000000000', 'system', 'system', 'system@system.local', 'admin')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
```

**为什么使用 UUID？**
- MySQL 推荐使用 UUID 作为主键
- 与其他用户 ID 格式保持一致
- 避免与可能的用户名冲突

### 2. 统一 System User ID

定义常量 `SYSTEM_USER_ID`：
```typescript
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
```

### 3. 修改所有使用 'system' 的地方

修改了以下文件：

#### Repository 层

1. **apikey-admin.repository.ts**
   - 使用 `SYSTEM_USER_ID` 作为默认 user ID

2. **ekpconfig-admin.repository.ts**
   - 使用 `SYSTEM_USER_ID` 作为默认 user ID
   - 修改 `findSystemConfig` 方法

#### API 层

3. **api/admin/api-keys/route.ts**
   - 添加 `ensureSystemUser` 函数
   - 确保 system 用户存在后再创建 API Key

4. **api/admin/ekp-configs/route.ts**
   - 使用 `SYSTEM_USER_ID`

5. **api/admin/migrate-configs/route.ts**
   - 迁移配置时使用 `SYSTEM_USER_ID`

6. **api/config/ekp/route.ts**
   - 查询全局配置时使用 `SYSTEM_USER_ID`

7. **api/config/llm/route.ts**
   - 查询全局配置时使用 `SYSTEM_USER_ID`

### 4. 自动迁移机制

在 `database-manager.ts` 中添加了自动迁移功能：

```typescript
private async migrateSystemUserId(): Promise<void> {
  // 检查并更新所有 user_id = 'system' 的记录
  // 更新为正确的 UUID
}
```

**迁移时机**：
- 数据库连接成功后自动执行
- 只执行一次（检测到旧数据时）
- 迁移失败不影响正常使用

## 修改的文件清单

### 数据库 Schema
- `database-schema.sql` - 添加 system 用户

### Repository 层
- `src/lib/database/repositories/apikey-admin.repository.ts`
- `src/lib/database/repositories/ekpconfig-admin.repository.ts`

### API 层
- `src/app/api/admin/api-keys/route.ts`
- `src/app/api/admin/ekp-configs/route.ts`
- `src/app/api/admin/migrate-configs/route.ts`
- `src/app/api/config/ekp/route.ts`
- `src/app/api/config/llm/route.ts`

### 数据库管理
- `src/lib/database/manager.ts` - 添加自动迁移

### 迁移脚本
- `migrations/20260405_fix_system_user_id.sql` - 手动迁移脚本

## 验证步骤

### 1. 数据库初始化

如果数据库是新创建的：
```sql
-- 执行 database-schema.sql
-- system 用户会自动创建
```

### 2. 自动迁移

如果数据库已存在旧数据（`user_id = 'system'`）：
- 应用连接数据库时会自动检测
- 自动更新所有旧数据
- 查看日志确认迁移成功：
  ```
  [Migration] 发现 N 条旧数据需要迁移...
  [Migration] api_keys 表迁移完成
  [Migration] ekp_configs 表迁移完成
  [Migration] ✅ 所有数据迁移完成
  ```

### 3. 手动迁移（可选）

如果需要手动执行迁移：
```bash
mysql -u your_user -p your_database < migrations/20260405_fix_system_user_id.sql
```

### 4. 测试 API Key 添加

1. 访问管理员后台：`/admin/integration/llm`
2. 点击"添加 API 密钥"
3. 填写信息并提交
4. 验证是否成功添加

## 常见问题

### Q: 为什么要创建 system 用户？

A: 管理员后台创建的配置（如 API Keys、EKP 配置）是系统级别的，不属于特定用户。使用 system 用户可以：
- 满足外键约束要求
- 区分系统配置和个人配置
- 便于后续的权限管理

### Q: 之前的 API Key 数据会丢失吗？

A: 不会。如果之前的 API Key 使用了 `user_id = 'system'`，自动迁移会：
- 保留所有 API Key 数据
- 只更新 `user_id` 字段为正确的 UUID
- 迁移过程不可见，不影响使用

### Q: 如何确认迁移成功？

A: 查看应用日志，搜索 `[Migration]` 关键字：
```
[Migration] ✅ 所有数据迁移完成
```

或者手动查询数据库：
```sql
-- 检查是否还有旧的 system user ID
SELECT * FROM api_keys WHERE user_id = 'system';
-- 应该返回空结果

-- 检查新的 UUID user ID
SELECT * FROM api_keys WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- 应该返回所有系统级的 API Key
```

## 后续建议

1. **统一用户管理**
   - 实现完善的用户认证系统
   - 管理员后台支持多管理员
   - 记录配置的创建者

2. **审计日志**
   - 记录配置的创建/修改/删除
   - 记录操作人和时间
   - 便于问题追踪

3. **权限控制**
   - 区分系统配置和用户配置
   - 不同角色有不同的操作权限
   - 防止误操作

## 相关文档

- [数据库设计文档](./database-schema.sql)
- [管理员后台使用指南](../AGENTS.md)
- [外键约束说明](https://dev.mysql.com/doc/refman/8.0/en/constraint-foreign-key.html)
