# 环境变量配置指南

## 📋 概述

本项目支持通过环境变量配置数据库连接信息。环境变量优先级高于配置文件。

## 🔑 必需的环境变量

| 变量名 | 说明 | 示例值 | 是否必需 |
|--------|------|--------|----------|
| `DB_HOST` | 数据库主机地址 | `ts708yr65368.vicp.fun` | ✅ 必需 |
| `DB_PORT` | 数据库端口 | `33787` | ⚠️ 可选（默认3306） |
| `DB_NAME` | 数据库名称 | `newwork` | ✅ 必需 |
| `DB_USER` | 数据库用户名 | `root` | ✅ 必需 |
| `DB_PASSWORD` | 数据库密码 | `abcABC123` | ✅ 必需 |

## 🚀 配置方式

### 方式1：Coze 平台部署配置（推荐）

在 Coze 平台的部署配置中设置环境变量：

1. 进入项目设置
2. 找到环境变量配置
3. 添加以下环境变量：
   ```
   DB_HOST=ts708yr65368.vicp.fun
   DB_PORT=33787
   DB_NAME=newwork
   DB_USER=root
   DB_PASSWORD=abcABC123
   ```
4. 保存并重新部署

### 方式2：Docker 环境变量

在 `docker-compose.yml` 中配置：

```yaml
version: '3.8'

services:
  app:
    image: future-office:latest
    environment:
      - DB_HOST=ts708yr65368.vicp.fun
      - DB_PORT=33787
      - DB_NAME=newwork
      - DB_USER=root
      - DB_PASSWORD=abcABC123
```

### 方式3：系统环境变量

在服务器上配置：

```bash
# 临时设置（当前会话）
export DB_HOST=ts708yr65368.vicp.fun
export DB_PORT=33787
export DB_NAME=newwork
export DB_USER=root
export DB_PASSWORD=abcABC123

# 永久设置（添加到 ~/.bashrc 或 /etc/environment）
echo 'export DB_HOST=ts708yr65368.vicp.fun' >> ~/.bashrc
echo 'export DB_PORT=33787' >> ~/.bashrc
echo 'export DB_NAME=newwork' >> ~/.bashrc
echo 'export DB_USER=root' >> ~/.bashrc
echo 'export DB_PASSWORD=abcABC123' >> ~/.bashrc
source ~/.bashrc
```

### 方式4：.env 文件（仅开发环境）

在开发环境中使用 `.env.local` 文件：

```bash
# .env.local
DB_HOST=ts708yr65368.vicp.fun
DB_PORT=33787
DB_NAME=newwork
DB_USER=root
DB_PASSWORD=abcABC123
```

**注意**：
- `.env.local` 文件不会提交到 Git
- 仅在开发环境使用
- 生产环境应使用部署平台的环境变量配置

## 📊 优先级

配置读取优先级（从高到低）：

1. **环境变量**（最高优先级）
   - `process.env.DB_HOST`
   - `process.env.DB_PASSWORD`
   - ...

2. **配置文件**（.db-config.json）
   - 仅在环境变量未配置时使用
   - 用于开发环境和临时配置

## ✅ 验证环境变量

### 方式1：通过 API 检查

```bash
curl http://localhost:5000/api/debug/env
```

预期返回：
```json
{
  "success": true,
  "data": {
    "environment": {
      "DB_HOST": "ts708yr65368.vicp.fun",
      "DB_PORT": "33787",
      "DB_NAME": "newwork",
      "DB_USER": "root",
      "DB_PASSWORD": "已设置（隐藏）"
    }
  }
}
```

### 方式2：通过日志检查

查看应用启动日志：
```bash
tail -f /app/work/logs/bypass/app.log | grep "环境变量检查"
```

预期输出：
```
[Initialize] 环境变量检查: {
  DB_HOST: '✅ ts708yr65368.vicp.fun',
  DB_PORT: 33787,
  DB_USER: '✅ root',
  DB_PASSWORD: '✅ 已设置（长度:9）',
  DB_NAME: '✅ newwork'
}
```

### 方式3：检查系统状态

```bash
curl http://localhost:5000/api/system/status
```

## 🔍 故障排查

### 问题1：环境变量未生效

**症状**：
```json
{
  "environment": {
    "DB_HOST": null,
    "DB_PASSWORD": "未设置"
  }
}
```

**可能原因**：
1. 环境变量未配置
2. 环境变量名称错误（大小写敏感）
3. 应用未重启
4. `.coze` 文件中配置了空值（已修复）

**解决方法**：
1. 检查环境变量是否正确配置
2. 确保变量名完全匹配（区分大小写）
3. 重启应用
4. 检查 `.coze` 文件是否包含空的环境变量配置

### 问题2：数据库连接失败

**症状**：
```
Access denied for user 'root'@'127.0.0.1' (using password: YES)
```

**可能原因**：
1. 数据库密码不正确
2. 数据库主机地址不正确
3. 数据库端口不正确
4. 数据库用户名不正确

**解决方法**：
1. 验证数据库连接信息是否正确
2. 更新环境变量中的配置
3. 重启应用
4. 检查数据库服务是否正常运行

### 问题3：配置文件和环境变量冲突

**症状**：
- 使用了配置文件中的旧密码
- 环境变量未生效

**原因**：
- 环境变量未完整配置
- 系统回退到配置文件

**解决方法**：
1. 确保所有必需的环境变量都已配置
2. 重启应用
3. 验证环境变量优先级

## 📝 配置示例

### 完整的环境变量配置

```bash
# 数据库配置
DB_HOST=ts708yr65368.vicp.fun
DB_PORT=33787
DB_NAME=newwork
DB_USER=root
DB_PASSWORD=abcABC123

# 应用配置（可选）
NODE_ENV=production
PORT=5000
```

### Docker Compose 完整配置

```yaml
version: '3.8'

services:
  app:
    image: future-office:latest
    ports:
      - "5000:5000"
    environment:
      # 数据库配置
      - DB_HOST=ts708yr65368.vicp.fun
      - DB_PORT=33787
      - DB_NAME=newwork
      - DB_USER=root
      - DB_PASSWORD=abcABC123
      # 应用配置
      - NODE_ENV=production
    restart: unless-stopped
```

## 🚨 安全建议

1. **不要在代码中硬编码密码**
   - ❌ 错误：`const password = "abcABC123";`
   - ✅ 正确：`const password = process.env.DB_PASSWORD;`

2. **使用环境变量管理工具**
   - 开发环境：`.env` 文件（不提交到 Git）
   - 生产环境：部署平台的环境变量配置

3. **定期更换密码**
   - 数据库密码应定期更换
   - 只需更新环境变量，无需修改代码
   - 重启应用即可生效

4. **最小权限原则**
   - 使用专用的数据库用户
   - 只授予必要的权限
   - 不要使用 root 用户（如果可能）

## 📚 相关文档

- [数据库配置指南](./DATABASE_CONFIG.md)
- [部署指南](./DEPLOYMENT.md)
- [故障排查指南](./TROUBLESHOOTING.md)

## 🆘 获取帮助

如果遇到问题：
1. 检查环境变量配置：`/api/debug/env`
2. 检查系统状态：`/api/system/status`
3. 查看应用日志：`/app/work/logs/bypass/app.log`
4. 参考故障排查指南

---

**最后更新**：2026-04-07
**版本**：1.0.0
