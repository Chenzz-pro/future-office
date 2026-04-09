# 组织架构同步系统 - 实施方案

## 📋 项目概述

本方案实现从蓝凌EKP系统同步组织架构数据到未来办公系统，支持全量同步和增量同步，确保数据一致性和可靠性。

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│              组织架构同步系统                                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         同步调度层 (Sync Scheduler)                  │    │
│  │  • 定时任务调度器                                    │    │
│  │  • 手动触发接口                                      │    │
│  │  • 并发控制和重试机制                                │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │        EKP接口适配器 (EKP Interface Adapter)         │    │
│  │  • 封装蓝凌EKP接口调用                              │    │
│  │  • 数据格式转换                                      │    │
│  │  • 异常处理和重试                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │      数据处理引擎 (Data Processing Engine)           │    │
│  │  • 数据清洗和验证                                    │    │
│  │  • 增量/全量数据识别                                │    │
│  │  • 数据映射转换                                      │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │         数据存储层 (Data Persistence Layer)          │    │
│  │  • sys_org_element (机构/部门/岗位/群组)             │    │
│  │  • sys_org_person (人员)                            │    │
│  │  • sys_org_post_person (岗位人员关联)               │    │
│  │  • org_sync_logs (同步日志)                         │    │
│  │  • org_sync_details (同步明细)                      │    │
│  │  • org_sync_tokens (同步令牌)                       │    │
│  │  • org_sync_config (同步配置)                       │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                                ↓
                    ┌──────────────────────┐
                    │   蓝凌EKP系统         │
                    │   REST Service       │
                    │   sysSynchroGetOrg   │
                    └──────────────────────┘
```

## 🔧 蓝凌EKP接口配置

### 接口清单

| 接口代码 | 接口名称 | 路径 | 用途 |
|---------|---------|------|------|
| org.getElementsBaseInfo | 获取所有组织架构基本信息 | /api/sys-organization/sysSynchroGetOrg/getElementsBaseInfo | 全量同步 |
| org.getUpdatedElements | 获取更新的组织架构信息 | /api/sys-organization/sysSynchroGetOrg/getUpdatedElements | 增量同步 |
| org.getUpdatedElementsByToken | 分页获取更新的组织架构信息 | /api/sys-organization/sysSynchroGetOrg/getUpdatedElementsByToken | 分页增量同步 |
| org.findByExtendPara | 根据扩展参数查询组织 | /api/sys-organization/sysSynchroGetOrg/findByExtendPara | 按条件查询 |

### 接口参数说明

#### 1. getElementsBaseInfo (获取所有组织架构基本信息)

**请求参数：**
```typescript
{
  returnOrgType: string;  // JSON数组字符串，如 '[{"type":"org"},{"type":"dept"}]'
  returnType: string;     // JSON数组字符串，返回的字段
}
```

**返回数据：**
```typescript
{
  returnState: number;  // 2表示成功
  message: string;      // 组织架构数据数组
  count: number;        // 数据条数
}
```

#### 2. getUpdatedElements (获取更新的组织架构信息)

**请求参数：**
```typescript
{
  returnOrgType: string;  // JSON数组字符串
  count: number;          // 返回条目数
  beginTimeStamp: string; // 开始时间戳（yyyy-MM-dd HH:mm:ss.SSS）
}
```

**返回数据：**
```typescript
{
  returnState: number;  // 2表示成功
  message: string;      // 组织架构数据数组
  count: number;        // 返回条目数
  timeStamp: string;    // 下次同步的时间戳
}
```

#### 3. getUpdatedElementsByToken (分页获取更新的组织架构信息)

**请求参数：**
```typescript
{
  returnOrgType: string;  // JSON数组字符串
  pageNo: number;          // 页码
  count: number;           // 每页记录数
  token: string;           // 令牌（第一页为空）
  beginTimeStamp: string; // 开始时间戳
}
```

**返回数据：**
```typescript
{
  returnState: number;  // 2表示成功
  message: string;      // 组织架构数据数组
  count: number;        // 返回条目数
  token: string;        // 下一页的令牌
}
```

## 📊 数据映射规则

### 组织元素映射（sys_org_element）

| EKP字段 | 本系统字段 | 说明 |
|---------|-----------|------|
| id / lunid | fd_id | 唯一键 |
| name | fd_name | 名称 |
| type | fd_org_type | 类型（1=机构, 2=部门, 3=岗位, 4=群组） |
| parent | fd_parentid | 直接父级ID（EKP原始字段） |
| hierarchyId | fd_hierarchy_id | 层级路径 x{id1}x{id2}x... |
| fd_hierarchy_id | fd_hierarchy_id | 层级路径（兼容字段） |
| thisLeader | fd_this_leaderid | 本级领导 |
| superLeader | fd_super_leaderid | 上级领导 |
| no | fd_no | 编号 |
| order | fd_order | 排序 |
| keyword | fd_keyword | 关键字 |
| isAvailable | fd_is_available | 是否有效 |
| memo | fd_memo | 说明 |
| orgEmail | fd_org_email | 机构/部门邮箱 |
| namePinyin | fd_name_pinyin | 拼音名称 |
| nameSimplePinyin | fd_name_simple_pinyin | 名称简拼 |
| isExternal | fd_is_external | 是否外部组织 |
| isBusiness | fd_is_business | 是否业务相关 |
| importInfo | fd_import_info | 导入信息 |
| creatorId | fd_creator_id | 创建者ID |
| members | fd_persons_number | 群组成员数量 |

### 人员映射（sys_org_person）

| EKP字段 | 本系统字段 | 说明 |
|---------|-----------|------|
| id / lunid | fd_id | 唯一键 |
| name | fd_name | 姓名 |
| fd_hierarchy_id | fd_dept_id | 层级路径（最后一级作为所属部门） |
| fd_parentid | fd_dept_id | 所属部门ID |
| fd_login_name | fd_login_name | 登录名（优先使用） |
| loginName | fd_login_name | 登录名（兼容字段） |
| password | fd_password | 默认密码123456 |
| posts[0] | fd_post_id | 主岗位 |
| posts | fd_post_ids | 所有岗位（一人多岗） |
| email | fd_email | 邮箱 |
| mobileNo | fd_mobile | 手机号 |
| workPhone | fd_office_phone | 办公电话 |
| rtx | fd_rtx_account | RTX账号 |
| sex | fd_gender | 性别（M=1, F=2） |
| wechat | fd_wechat | 微信 |
| shortNo | fd_short_no | 短号 |
| isAvailable | fd_is_login_enabled | 是否允许登录 |
| nickname | fd_nickname | 昵称 |
| position | fd_position | 职务 |
| isBusinessRelated | fd_is_business_related | 是否业务相关 |
| userType | fd_user_type | 用户类型 (internal/external) |
| staffingLevelId | fd_staffing_level_id | 员工级别ID |
| creatorId | fd_creator_id | 创建者ID |

### 层级路径 (fd_hierarchy_id) 解析规则

- 格式: `x{id1}x{id2}x{id3}x...`
- 以 'x' 开头和分隔
- 依次表示一级、二级、三级...
- 可以是机构、部门、人员的混合层级

**父级关系确定逻辑：**
- 机构: 从层级路径获取顶级父级作为 `fd_parentorgid`
- 部门: 从层级路径获取直接父级作为 `fd_parentid`
- 岗位: 从层级路径获取直接父级作为 `fd_parentid`
- 人员: 从层级路径获取最后一级作为 `fd_dept_id`（所属部门）

## 🚀 开发步骤

### ✅ 已完成

1. **数据库表设计**
   - ✅ org_sync_logs - 同步日志表
   - ✅ org_sync_details - 同步明细表
   - ✅ org_sync_tokens - 同步令牌表
   - ✅ org_sync_config - 同步配置表
   - 文件：`database-schema-org-sync.sql`

2. **蓝凌EKP接口配置**
   - ✅ 配置了4个组织架构接口
   - 文件：`config/ekp-custom-interfaces.yaml`

3. **Repository层开发**
   - ✅ org-sync-log.repository.ts
   - ✅ org-sync-detail.repository.ts
   - ✅ org-sync-config.repository.ts
   - ✅ org-sync-token.repository.ts

4. **数据映射器开发**
   - ✅ org-sync-mapper.ts

### 📝 待开发

5. **同步服务核心逻辑**
   - 文件：`src/lib/sync/org-sync.service.ts`
   - 功能：
     - 全量同步
     - 增量同步
     - 分页处理
     - 数据对比更新
     - 软删除处理

6. **API接口**
   - 文件：`src/app/api/org-sync/route.ts`
   - 文件：`src/app/api/org-sync/logs/route.ts`
   - 功能：
     - 触发全量同步
     - 触发增量同步
     - 查询同步日志
     - 查询同步详情

7. **前端管理页面**
   - 文件：`src/app/admin/integration/ekp/org-sync/page.tsx`
   - 功能：
     - 同步状态显示
     - 手动触发同步
     - 同步历史查看
     - 同步日志详情

8. **定时任务和监控**
   - 文件：`src/lib/sync/sync-scheduler.ts`
   - 文件：`src/lib/sync/sync-monitor.ts`
   - 功能：
     - 定时增量同步（每30分钟）
     - 定时全量同步（每月1号）
     - 监控告警

## 📝 同步策略

### 全量同步

**触发条件：**
- 首次同步（手动触发）
- 定期全量同步（每月1号凌晨）
- 增量同步失败超过3次

**同步流程：**
1. 创建同步日志记录（sync_type='full'）
2. 调用 getElementsBaseInfo 接口获取全部数据
3. 数据清洗和过滤（过滤无效数据、离职人员）
4. 批量处理（分批处理，避免内存溢出）
5. 对比更新 + 软删除策略：
   - 新增：EKP有，本地没有 → INSERT
   - 更新：EKP和本地都有 → UPDATE（以EKP为准）
   - 删除：EKP没有，本地有 → 软删除（fd_is_available=0）
6. 更新同步日志

### 增量同步

**触发条件：**
- 定时任务（默认每30分钟）
- 手动触发

**同步流程：**
1. 查询上次同步时间戳
2. 创建同步日志记录（sync_type='incremental'）
3. 调用 getUpdatedElements 接口获取增量数据
   - 如果返回数量等于请求数量，继续调用下一页
   - 使用时间戳参数 beginTimeStamp
4. 数据清洗和过滤
5. 对比更新：
   - 新增：INSERT
   - 更新：UPDATE
   - 删除：根据 isAvailable 字段判断
6. 更新时间戳令牌
7. 更新同步日志

### 数据清洗规则

**过滤条件：**
- ❌ 过滤 isAvailable=false 的数据（如果启用）
- ❌ 过滤缺少 id、name、type 的数据
- ❌ 过滤人员类型中缺少 loginName 的数据
- ❌ 过滤离职人员（如果启用）

## 🔔 监控和告警

### 同步监控

**检查项目：**
- ✅ 同步状态（运行中/成功/失败）
- ✅ 同步耗时
- ✅ 同步数据量
- ✅ 错误数量

### 告警条件

**同步失败告警：**
- 同步失败时发送告警
- 连续失败3次升级告警级别

**数据量异常告警：**
- 同步数据量为0时告警
- 同步数据量超过阈值时告警（如10000条）

**同步延迟告警：**
- 超过2小时没有成功同步时告警

## 📋 使用说明

### 手动触发全量同步

```bash
POST /api/org-sync
Content-Type: application/json

{
  "syncType": "full",
  "operatorId": "user-id"
}
```

### 手动触发增量同步

```bash
POST /api/org-sync
Content-Type: application/json

{
  "syncType": "incremental",
  "operatorId": "user-id"
}
```

### 查询同步日志

```bash
GET /api/org-sync/logs?page=1&pageSize=20&syncType=full
```

### 查询同步详情

```bash
GET /api/org-sync/logs/{syncLogId}/details
```

## ⚙️ 配置说明

### 同步配置项

| 配置键 | 默认值 | 说明 |
|-------|--------|------|
| sync.default_password | 123456 | 默认密码 |
| sync.default_role_id | 00000000-0000-0000-0000-000000000003 | 默认角色ID |
| sync.enable_incremental_sync | true | 是否启用增量同步 |
| sync.incremental_sync_interval | 30 | 增量同步间隔（分钟） |
| sync.enable_full_sync | true | 是否启用全量同步 |
| sync.full_sync_interval | 720 | 全量同步间隔（小时） |
| sync.batch_size | 500 | 每批处理数量 |
| sync.enable_monitor | true | 是否启用监控 |
| sync.alert_on_failure | true | 同步失败时是否告警 |
| sync.alert_on_data_anomaly | true | 数据量异常时是否告警 |
| sync.filter_inactive_users | true | 是否过滤离职人员 |

## 📈 性能优化

### 批量处理

- 使用批量插入（batch insert）减少数据库操作
- 每批处理 500 条数据（可配置）
- 使用事务保证数据一致性

### 并发控制

- 限制并发数，避免对EKP系统造成过大压力
- 使用连接池管理数据库连接

### 缓存优化

- 缓存组织架构树数据
- 缓存人员列表数据

## 🧪 测试计划

### 单元测试

- ✅ 数据映射测试
- ✅ Repository层测试
- ✅ 同步服务测试

### 集成测试

- ✅ 全量同步测试
- ✅ 增量同步测试
- ✅ 分页同步测试
- ✅ 异常处理测试

### 性能测试

- ✅ 大数据量同步测试
- ✅ 并发同步测试

## 📚 参考资料

- 蓝凌EKP接口文档：`组织架构接出接口说明.xlsx`
- 本项目AGENTS.md
- 本项目数据库schema

---

**文档版本：** v1.0  
**创建时间：** 2025-01-15  
**最后更新：** 2025-01-15
