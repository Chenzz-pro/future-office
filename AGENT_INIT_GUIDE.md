# 系统部署初始化说明（Agent新架构）

## 概述

系统部署初始化流程已完善，新增的Agent字段（RootAgent + 业务Agent + 规则引擎）已完全集成到初始化流程中。

## 新增字段

在 `agents` 表中新增了以下字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `agent_type` | ENUM('root', 'business') | Agent类型（root=根智能体，business=业务智能体） |
| `skills_config` | JSON | 技能绑定配置（定义Agent可调用的技能白名单） |
| `permission_rules` | JSON | 权限规则配置（条件+校验逻辑+拦截动作） |
| `business_rules` | JSON | 业务流程规则（流程步骤+校验逻辑+异常处理） |
| `version` | INT | 配置版本号 |

## 初始化流程

### 1. 新数据库初始化

当用户首次部署并初始化数据库时，系统会：

1. 执行 `database-schema-org-structure.sql` 脚本，创建包含新字段的 `agents` 表
2. 自动创建4个业务Agent（审批、会议、数据、助理）
3. 自动调用Agent架构迁移API（确保新字段正确设置）

### 2. 旧数据库升级

当用户使用旧数据库（没有新字段）连接系统时，系统会：

1. 自动检测数据库连接
2. 自动调用Agent架构迁移API (`/api/database/migrate/agent-architecture`)
3. 迁移API会自动添加缺失的字段（如果字段已存在则跳过）
4. 更新现有Agent的 `agent_type` 字段

### 3. 数据库连接时的自动迁移

在以下场景中，系统会自动执行Agent架构迁移：

- `/api/database?action=init` - 数据库初始化
- `/api/database?action=recreate` - 数据库重新创建
- `/api/database?action=connect` - 数据库连接
- `/api/database?action=add` - 添加数据库配置

所有这些操作都会自动调用 `/api/database/migrate/agent-architecture` API，确保数据库表结构与新架构兼容。

## 迁移API

### API 路径

```
POST /api/database/migrate/agent-architecture
```

### 功能

1. 添加新字段（如果不存在）：
   - `agent_type`
   - `skills_config`
   - `permission_rules`
   - `business_rules`
   - `version`

2. 更新现有Agent的 `agent_type`：
   - RootAgent: `agent_type = 'root'`
   - 业务Agent: `agent_type = 'business'`

### 检查迁移状态

```
GET /api/database/migrate/agent-architecture
```

返回迁移状态和现有字段信息。

## 迁移工具界面

系统提供了前端迁移工具界面：

- 路径：`/admin/migration/agent-architecture`
- 功能：
  - 检查迁移状态
  - 执行迁移
  - 回滚迁移

## 向后兼容性

- ✅ 新字段使用 `ALTER TABLE ADD COLUMN`，如果字段已存在则跳过
- ✅ 迁移失败不会影响数据库连接和系统运行
- ✅ 支持从旧架构无缝升级到新架构

## 验证步骤

1. 检查agents表结构：
   ```sql
   DESCRIBE agents;
   ```

2. 检查字段是否存在：
   ```sql
   SELECT COLUMN_NAME
   FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'agents';
   ```

3. 检查Agent数据：
   ```sql
   SELECT id, type, agent_type, name, version
   FROM agents
   ORDER BY type;
   ```

## 注意事项

1. **数据库备份**：在生产环境执行迁移前，建议先备份数据库
2. **权限要求**：迁移API需要 `ALTER TABLE` 权限
3. **迁移时间**：迁移过程很快，通常在1秒内完成
4. **失败处理**：迁移失败会记录日志，但不影响系统运行

## 相关文件

- SQL脚本：`database-schema-org-structure.sql`
- 迁移API：`src/app/api/database/migrate/agent-architecture/route.ts`
- 数据库管理API：`src/app/api/database/route.ts`
- 迁移工具界面：`src/components/pages/agent-architecture-migration.tsx`

## 总结

系统部署初始化流程已完全集成Agent新架构的迁移逻辑，无论是新数据库还是旧数据库，都能自动升级到新架构，确保系统无缝运行。
