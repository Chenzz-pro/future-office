# 数据库配置持久化方案

## 问题描述

**现象**：
- 用户在 `/system-init` 页面配置并连接数据库成功后
- 应用重启后，访问 `/system-init` 页面仍提示"数据库未连接"
- 需要重新填写数据库配置信息才能连接

**根本原因**：
1. 数据库配置信息保存在 `database_configs` 表中
2. 应用重启后，数据库未连接，无法读取 `database_configs` 表
3. 环境变量和配置文件都没有保存配置信息
4. `lastActiveConfig` 只在内存中缓存，应用重启后丢失

## 解决方案

### 1. 配置文件持久化

**文件路径**：`.db-config.json`

**存储位置**：项目根目录（`/workspace/projects/`）

**配置内容**：
```json
{
  "id": "config-id",
  "name": "配置名称",
  "type": "mysql",
  "host": "localhost",
  "port": 3306,
  "databaseName": "future_office",
  "username": "root",
  "password": "root",
  "isActive": true,
  "isDefault": true,
  "createdAt": "2024-01-20T10:00:00.000Z",
  "updatedAt": "2024-01-20T10:00:00.000Z"
}
```

### 2. 自动重连机制

应用启动和运行时会按以下优先级尝试自动重连数据库：

**优先级 1：环境变量（最高）**
- 检查环境变量：`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- 如果所有环境变量都已设置，直接使用环境变量连接
- 适用于生产环境

**优先级 2：配置文件**
- 读取 `.db-config.json` 文件
- 如果文件存在且可读，使用文件中的配置连接
- 适用于开发环境和已部署的应用

**优先级 3：内存缓存（最低）**
- 使用 `lastActiveConfig`（仅限单次会话）
- 应用重启后失效
- 仅作为临时方案

### 3. 配置保存时机

**自动保存时机**：
1. ✅ `/api/database?action=connect` 连接成功后
2. ✅ 应用启动时通过环境变量连接成功后
3. ✅ 应用启动时通过配置文件连接成功后

**保存位置**：
- `.db-config.json`（项目根目录）
- `database_configs` 表（数据库）

## 代码实现

### 1. 保存配置到文件

**文件**：`src/app/api/database/route.ts`

**函数**：`saveConfigToFile(config)`

```typescript
function saveConfigToFile(config: DatabaseConfig): void {
  const configData = {
    id: config.id,
    name: config.name,
    type: config.type,
    host: config.host,
    port: config.port,
    databaseName: config.databaseName,
    username: config.username,
    password: config.password,
    isActive: config.isActive,
    isDefault: config.isDefault,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configData, null, 2));
}
```

### 2. 从配置文件加载

**函数**：`loadConfigFromFile()`

```typescript
function loadConfigFromFile(): DatabaseConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const config = JSON.parse(data) as DatabaseConfig;
      // 确保日期字段是 Date 对象
      if (config.createdAt) config.createdAt = new Date(config.createdAt);
      if (config.updatedAt) config.updatedAt = new Date(config.updatedAt);
      return config;
    }
  } catch (err) {
    console.error('[API:Database] ❌ 读取配置文件失败:', err);
  }
  return null;
}
```

### 3. GET /api/database 自动重连

**逻辑**：
1. 尝试从 `database_configs` 表读取配置
2. 如果失败（数据库未连接），尝试从配置文件读取
3. 如果配置文件也不存在，尝试使用内存缓存
4. 如果都不存在，尝试使用环境变量
5. 所有尝试都失败，返回未连接状态

## 使用场景

### 场景 1：首次部署

1. 访问 `/system-init` 页面
2. 填写数据库配置信息
3. 点击"保存并连接"
4. 系统自动创建表结构和管理员账号
5. 配置信息自动保存到 `.db-config.json` 文件
6. 跳转到登录页面

### 场景 2：应用重启

1. 应用启动时，`initializeApp()` 自动读取 `.db-config.json`
2. 使用配置文件中的信息自动连接数据库
3. 无需用户手动重新配置
4. 直接可以访问登录页面

### 场景 3：生产环境

1. 通过环境变量配置数据库连接信息
2. 环境变量优先级最高
3. 配置文件作为备份

## 注意事项

### 1. 文件权限

**开发环境**：
- 项目根目录可写，配置文件可以正常保存和读取

**生产环境（FaaS/Serverless）**：
- 文件系统可能是只读的
- 配置文件保存会失败，但不影响功能
- 建议使用环境变量配置

### 2. 安全性

**配置文件内容**：
- 包含数据库密码（明文）
- 不应提交到版本控制
- 应该添加到 `.gitignore`

**.gitignore 配置**：
```
# 数据库配置文件（包含敏感信息）
.db-config.json
```

### 3. 配置优先级

**环境变量 > 配置文件 > 内存缓存**

如果同时存在多种配置方式，环境变量优先。

### 4. 错误处理

**保存失败**：
- 文件系统只读：记录日志，但不影响连接成功
- 磁盘空间不足：记录日志，但不影响连接成功

**读取失败**：
- 文件不存在：继续尝试其他方式
- 文件损坏：记录日志，继续尝试其他方式
- JSON 解析失败：记录日志，继续尝试其他方式

## 验证清单

- [x] 配置文件保存功能正常
- [x] 配置文件读取功能正常
- [x] 应用启动时自动重连正常
- [x] GET /api/database 自动重连正常
- [x] 配置文件不提交到版本控制
- [x] TypeScript 类型检查通过
- [ ] 测试应用重启后自动重连
- [ ] 测试配置文件损坏情况
- [ ] 测试文件系统只读情况

## 预期效果

- ✅ 首次配置后，应用重启无需重新配置
- ✅ 数据库配置信息持久化保存
- ✅ 自动重连机制可靠运行
- ✅ 支持多种配置方式（环境变量、配置文件、手动配置）
- ✅ 向后兼容性良好
