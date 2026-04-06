# 部署后操作指南

本文档说明系统部署后需要执行的操作步骤。

## 1. 连接数据库

### 步骤说明

系统首次部署后，需要配置数据库连接。

#### 方式1：使用数据库管理页面（推荐）

1. 登录系统（使用 admin 账号）
2. 进入 **数据库配置** 页面（需要先创建该页面）
3. 点击"添加配置"
4. 填写数据库连接信息：
   - 主机地址：`localhost`
   - 端口：`3306`
   - 数据库名：`futureoffice`
   - 用户名：`root`
   - 密码：`你的数据库密码`
5. 点击"测试连接"
6. 点击"保存"
7. 点击"连接"激活数据库

#### 方式2：使用 API 接口

```bash
# 1. 测试连接
curl -X POST http://localhost:5000/api/database?action=test \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test",
    "name": "MySQL",
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "databaseName": "futureoffice",
    "username": "root",
    "password": "password"
  }'

# 2. 连接数据库
curl -X POST http://localhost:5000/api/database?action=connect \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test",
    "name": "MySQL",
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "databaseName": "futureoffice",
    "username": "root",
    "password": "password",
    "isActive": true,
    "isDefault": true
  }'
```

## 2. 初始化数据库表结构

如果数据库是新建的，需要初始化表结构。

### 使用 API 接口

```bash
curl -X POST http://localhost:5000/api/database?action=init \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 3306,
    "databaseName": "futureoffice",
    "username": "root",
    "password": "password"
  }'
```

初始化会自动创建以下表：
- `users`（临时表，用于迁移）
- `api_keys`
- `chat_sessions`
- `chat_messages`
- `custom_skills`
- `ekp_configs`
- `database_configs`
- `organizations`
- `sys_org_element`（组织架构表）
- `sys_org_person`（人员表，也是系统用户表）
- `sys_org_post_person`（岗位人员关联表）
- `sys_org_staffing_level`（职务级别表）

并插入初始化数据：
- 根机构：海峡人力
- 一级部门：董事会、经营班子、人力资源部、财务资金部、省外区域中心
- 二级部门：人力资源部下的三个组、财务资金部下的两个部门、省外区域中心下的两个运营中心
- 三级部门：陕西运营中心下的两个分公司
- 职务级别：普通员工、组长、主管、经理、总监、副总经理、总经理

## 3. 执行数据迁移

将 users 表的数据迁移到 sys_org_person 表。

### 步骤1：预览迁移

```bash
curl http://localhost:5000/api/migrate/users-to-sys-org-person
```

返回示例：
```json
{
  "success": true,
  "data": {
    "hasUsersTable": true,
    "totalCount": 3,
    "users": [
      {
        "id": "1",
        "username": "admin",
        "email": "admin@example.com",
        "role": "admin"
      },
      ...
    ]
  }
}
```

### 步骤2：执行迁移

```bash
curl -X POST http://localhost:5000/api/migrate/users-to-sys-org-person
```

返回示例：
```json
{
  "success": true,
  "message": "迁移完成：成功 3 个，失败 0 个",
  "data": {
    "migratedCount": 3,
    "failedCount": 0,
    "totalCount": 3,
    "dropped": false
  }
}
```

### 步骤3：删除 users 表

**重要**：执行此操作前，请确保数据迁移成功！

```bash
curl -X POST "http://localhost:5000/api/migrate/users-to-sys-org-person?dropTable=true"
```

返回示例：
```json
{
  "success": true,
  "message": "迁移完成：成功 3 个，失败 0 个，已删除 users 表",
  "data": {
    "migratedCount": 3,
    "failedCount": 0,
    "totalCount": 3,
    "dropped": true
  }
}
```

执行此操作后：
- users 表被删除
- users 表被备份到 users_backup 表
- 所有用户数据已迁移到 sys_org_person 表

## 4. 验证部署

### 检查数据库连接

```bash
curl http://localhost:5000/api/database
```

返回示例：
```json
{
  "success": true,
  "data": {
    "connected": true,
    "config": {
      "id": "config-id",
      "name": "MySQL",
      ...
    }
  }
}
```

### 检查组织架构

```bash
curl "http://localhost:5000/api/organization?action=tree&type=2"
```

返回示例：
```json
{
  "success": true,
  "data": [
    {
      "id": "xxx",
      "name": "海峡人力",
      "type": 1,
      "children": [
        {
          "id": "yyy",
          "name": "董事会",
          "type": 2,
          "children": []
        },
        {
          "id": "zzz",
          "name": "人力资源部",
          "type": 2,
          "children": [
            {
              "id": "aaa",
              "name": "人力一组",
              "type": 2,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

### 检查用户登录

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "loginName": "admin",
    "password": "admin123"
  }'
```

返回示例：
```json
{
  "success": true,
  "data": {
    "userId": "user-id",
    "username": "admin",
    "role": "admin"
  }
}
```

## 5. 常见问题

### Q1: 为什么 users 表还在？

**A**: users 表没有被删除是因为：
1. 你可能没有执行数据迁移
2. 或者执行了迁移但没有传递 `dropTable=true` 参数

请执行步骤3中的删除操作。

### Q2: 组织架构树为什么只显示一个节点？

**A**: 需要重新初始化数据库表结构，或者手动插入组织架构数据。

执行步骤2中的初始化操作，会自动插入完整的组织架构数据。

### Q3: 数据迁移失败怎么办？

**A**:
1. 检查数据库连接是否正常
2. 检查 users 表是否存在
3. 查看日志：`/app/work/logs/bypass/app.log`
4. 如果密码是 base64 编码，系统会自动重新加密为 bcrypt

### Q4: 删除 users 表后还能恢复吗？

**A**: 可以。数据迁移时会自动备份到 users_backup 表。如果需要恢复，可以：

```sql
-- 从备份表恢复
CREATE TABLE users AS SELECT * FROM users_backup;
```

### Q5: 如何添加更多的组织架构数据？

**A**:
1. 登录系统，进入 **组织架构** 页面
2. 点击"新建"按钮
3. 选择父节点（机构或部门）
4. 填写部门信息并保存

## 6. 部署检查清单

- [ ] 数据库已创建
- [ ] 数据库连接已配置
- [ ] 数据库表结构已初始化
- [ ] 组织架构数据已插入
- [ ] users 表数据已迁移到 sys_org_person
- [ ] users 表已删除（传递 dropTable=true）
- [ ] 用户登录功能正常
- [ ] 组织架构树显示正常
- [ ] 可以在组织架构页面查看部门和人员

## 7. 技术支持

如遇到问题，请查看：
- 系统日志：`/app/work/logs/bypass/app.log`
- 开发日志：`/app/work/logs/bypass/console.log`
- 错误日志：`tail -n 50 /app/work/logs/bypass/app.log | grep -i error`
