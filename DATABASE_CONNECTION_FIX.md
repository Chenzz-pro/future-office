# 数据库连接问题解决方案

## 问题分析

1. **数据库未连接**：系统状态API返回数据库未连接
2. **认证失败**：配置文件中的密码可能不对
3. **状态不一致**：前端显示数据库已连接，但后端API检测未连接

## 解决方案

### 方案 1：重新配置数据库连接（推荐）

1. 访问系统初始化页面：`/system-init`
2. 填写正确的数据库连接信息：
   - 主机：`ts708yr65368.vicp.fun`
   - 端口：`33787`
   - 数据库名：`newwork`
   - 用户名：`root`
   - 密码：**请填写正确的密码**
3. 点击"测试连接"
4. 点击"保存并连接"

### 方案 2：手动更新配置文件

编辑 `/workspace/projects/.db-config.json` 文件，更新密码：

```json
{
  "id": "default-config",
  "name": "默认配置",
  "type": "mysql",
  "host": "ts708yr65368.vicp.fun",
  "port": 33787,
  "databaseName": "newwork",
  "username": "root",
  "password": "正确的密码",
  "isActive": true,
  "isDefault": true,
  "createdAt": "2026-01-06T00:00:00.000Z",
  "updatedAt": "2026-01-06T00:00:00.000Z"
}
```

### 方案 3：使用环境变量（生产环境推荐）

设置环境变量：

```bash
export DB_HOST=ts708yr65368.vicp.fun
export DB_PORT=33787
export DB_NAME=newwork
export DB_USER=root
export DB_PASSWORD=正确的密码
```

## 为什么会显示"数据库已连接"但实际未连接？

前端页面可能缓存了之前的连接状态。当页面加载时，如果状态API返回数据库未连接，应该清除缓存状态并显示错误信息。

## 验证数据库连接

连接成功后，执行以下命令验证：

```bash
# 检查系统状态
curl http://localhost:5000/api/system/status

# 检查诊断信息
curl http://localhost:5000/api/system/debug

# 检查系统初始化状态
curl http://localhost:5000/api/system/init
```

## 注意事项

1. **密码安全**：不要将密码提交到版本控制系统
2. **配置优先级**：环境变量 > 配置文件 > database_configs表
3. **连接测试**：连接成功后再创建admin账户
4. **状态刷新**：连接成功后，刷新页面查看最新状态
