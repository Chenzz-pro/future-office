# 系统初始化部署指南

## 概述

未来办公系统支持在首次部署时自动初始化数据库和创建默认账号。本指南将指导您完成系统初始化的完整流程。

## 快速开始

### 方式一：使用系统初始化页面（推荐）

1. 启动服务后，访问系统：
   ```
   http://localhost:5000/system-init
   ```

2. 配置数据库连接：
   - 数据库类型：MySQL
   - 数据库地址：`localhost` 或您的 MySQL 服务器地址
   - 数据库端口：`3306`
   - 数据库名称：`future_office`（或您自定义的数据库名）
   - 用户名：具有创建数据库权限的 MySQL 用户（通常是 `root`）
   - 密码：MySQL 用户密码

3. 点击"保存并连接"按钮：
   - 系统会自动创建数据库（如果不存在）
   - 执行数据库初始化脚本
   - 创建默认账号和组织架构

4. 连接成功后：
   - 系统会自动初始化管理员账号
   - 显示登录引导卡片
   - 5秒后自动跳转到登录页面

5. 使用默认账号登录：
   - 管理员账号：`admin` / `admin123`
   - 普通用户账号：`user` / `user123`

### 方式二：手动初始化数据库

如果您希望手动初始化数据库，可以按照以下步骤操作：

1. 连接到 MySQL 服务器：
   ```bash
   mysql -u root -p
   ```

2. 创建数据库：
   ```sql
   CREATE DATABASE IF NOT EXISTS future_office CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. 切换到目标数据库：
   ```sql
   USE future_office;
   ```

4. 执行初始化脚本：
   ```bash
   mysql -u root -p future_office < database-schema-org-structure.sql
   ```

5. 配置数据库连接：
   访问系统初始化页面，填写数据库配置并点击"保存并连接"。

## 默认账号

系统初始化后会自动创建以下默认账号：

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 管理员 | 系统管理员，拥有所有权限 |
| user | user123 | 普通用户 | 普通用户，可以访问基本功能 |

## 默认组织架构

系统初始化后会自动创建以下组织架构：

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

## 数据库表结构

系统使用以下核心表：

### 组织架构表
- `sys_org_element` - 机构/部门/岗位统一表
- `sys_org_person` - 人员表（系统用户表）
- `sys_org_post_person` - 岗位人员关联表
- `sys_org_staffing_level` - 职务级别表

### 系统配置表
- `database_configs` - 数据库配置表
- `chat_sessions` - 对话会话表
- `chat_messages` - 对话消息表
- `custom_skills` - 自定义技能表
- `ekp_configs` - EKP 配置表

## 密码安全

系统使用 bcrypt 加密算法对密码进行加密（盐值轮数：10）。

首次登录后，建议立即修改默认密码：
1. 登录后访问个人设置页面
2. 找到"修改密码"选项
3. 输入新密码并确认

## 故障排除

### 问题：数据库连接失败

**可能原因**：
- 数据库地址或端口错误
- 数据库用户名或密码错误
- 数据库服务未启动
- 网络连接问题

**解决方案**：
1. 检查 MySQL 服务是否正在运行：
   ```bash
   # Linux
   sudo systemctl status mysql
   sudo systemctl start mysql

   # macOS
   brew services list
   brew services start mysql
   ```

2. 验证数据库连接：
   ```bash
   mysql -h <host> -P <port> -u <username> -p
   ```

3. 确保数据库用户有创建数据库的权限：
   ```sql
   GRANT ALL PRIVILEGES ON *.* TO 'username'@'localhost';
   FLUSH PRIVILEGES;
   ```

### 问题：系统初始化失败

**可能原因**：
- SQL 脚本执行错误
- 数据库权限不足
- 表已存在但结构不匹配

**解决方案**：
1. 查看系统日志：
   ```bash
   tail -n 50 /app/work/logs/bypass/app.log
   ```

2. 检查数据库表是否正确创建：
   ```sql
   SHOW TABLES;
   DESCRIBE sys_org_person;
   ```

3. 重新初始化数据库：
   ```sql
   DROP DATABASE IF EXISTS future_office;
   -- 然后重新执行初始化脚本
   ```

### 问题：无法登录

**可能原因**：
- 管理员账号未创建
- 密码错误
- 账号被禁用

**解决方案**：
1. 检查管理员账号是否存在：
   ```sql
   SELECT fd_id, fd_login_name, fd_role, fd_is_login_enabled
   FROM sys_org_person
   WHERE fd_login_name = 'admin';
   ```

2. 检查密码加密格式：
   - 正确的 bcrypt 密码应该以 `$2b$10$` 开头
   - 如果密码格式错误，需要重新加密

3. 重置管理员密码：
   ```sql
   UPDATE sys_org_person
   SET fd_password = '$2b$10$DId8bUro45mx1.fpSIJJV.MXHImaJM4kdb9V34feSKiU7dmRxeOTq'
   WHERE fd_login_name = 'admin';
   ```

## 生产环境部署

### 安全建议

1. **修改默认密码**：首次登录后立即修改所有默认账号的密码
2. **使用强密码**：密码长度至少 12 位，包含大小写字母、数字和特殊字符
3. **启用 HTTPS**：使用 SSL/TLS 加密通信
4. **限制访问**：配置防火墙规则，限制数据库端口访问
5. **定期备份**：定期备份数据库和配置文件

### 环境变量配置

在生产环境中，建议使用环境变量配置数据库连接信息：

```env
# .env.production
DB_HOST=localhost
DB_PORT=3306
DB_NAME=future_office
DB_USER=root
DB_PASSWORD=your_password
```

### 日志管理

系统日志位于 `/app/work/logs/bypass/` 目录：
- `app.log` - 主应用日志
- `dev.log` - 开发调试日志
- `console.log` - 控制台日志

## 系统状态检查

使用以下 API 检查系统状态：

```bash
curl http://localhost:5000/api/system/status
```

返回示例：
```json
{
  "success": true,
  "data": {
    "database": {
      "connected": true,
      "message": "数据库已连接"
    },
    "initialized": {
      "status": true,
      "message": "系统已初始化",
      "adminCount": 1
    },
    "version": "1.0.0"
  }
}
```

## 技术支持

如果遇到问题，请按以下顺序排查：

1. 查看系统日志：`tail -n 50 /app/work/logs/bypass/app.log`
2. 检查数据库连接：`mysql -h localhost -u root -p`
3. 验证系统状态：`curl http://localhost:5000/api/system/status`
4. 查看浏览器控制台错误

如果问题仍未解决，请联系技术支持团队。
