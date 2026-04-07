# 蓝凌EKP组织架构同步系统 - 管理界面完善

## 已完成的功能

### 1. 集成中心菜单更新
- 修改文件：`src/components/admin-layout.tsx`
- 在 EKP 集成菜单下添加了三个子菜单：
  - 组织架构同步（已有）
  - 定时任务配置（新增）
  - 监控告警（新增）

### 2. 定时任务配置页面
- 路由：`/admin/integration/ekp/sync-scheduler`
- 功能：
  - 显示调度器运行状态
  - 配置增量同步任务（执行间隔、开关）
  - 配置全量同步任务（执行时间、每月日期、开关）
  - 配置监控任务（检查频率、开关）
  - 显示 Cron 表达式和下次执行时间
  - 支持重启调度器应用新配置

- API接口：
  - `GET /api/admin/sync-scheduler/config` - 获取定时任务配置
  - `PUT /api/admin/sync-scheduler/config` - 更新定时任务配置

### 3. 监控告警页面
- 路由：`/admin/integration/ekp/sync-alerts`
- 功能：
  - 告警统计卡片（总数、严重、警告、信息）
  - 活跃告警列表（未清除的告警）
  - 告警历史记录
  - 批量操作（标记已读、标记已解决、清除）
  - Tab 切换（活跃告警/告警历史）
  - 支持告警分类显示（同步失败、数据异常、同步延迟、同步超时、EKP连接错误）

- API接口：
  - `GET /api/admin/sync-alerts?type=active` - 获取活跃告警
  - `GET /api/admin/sync-alerts?type=history` - 获取告警历史
  - `POST /api/admin/sync-alerts?action=mark-read` - 标记告警为已读
  - `POST /api/admin/sync-alerts?action=resolve` - 标记告警为已解决
  - `POST /api/admin/sync-alerts?action=clear` - 清除告警

### 4. 数据库表
- 创建文件：`database-schema-sync-alerts.sql`
- 新增表：`sync_alerts` - 存储同步系统的告警信息

## 技术实现

### 前端组件
- 使用 shadcn/ui 组件库
- 使用 Tailwind CSS 4 样式
- React 19 + TypeScript 5
- 响应式设计，支持移动端访问

### 后端API
- RESTful API 设计
- 统一的响应格式
- 完善的错误处理
- 使用 DatabaseManager 进行数据库操作

## 需要注意的问题

1. **数据库初始化**：
   - 系统虽然已初始化，但 `org_sync_config` 和 `sync_alerts` 表可能不存在
   - 需要执行 `database-schema-org-sync.sql` 和 `database-schema-sync-alerts.sql` 脚本
   - 建议在系统初始化时自动执行这些SQL脚本

2. **定时任务调度器**：
   - 需要确保 `sync-scheduler.ts` 已正确配置并启动
   - 配置修改后需要重启调度器才能生效

3. **监控告警服务**：
   - 需要确保 `sync-monitor.ts` 已正确配置并启动
   - 告警触发需要依赖实际同步操作

## 访问路径

- 定时任务配置：`https://[domain]/admin/integration/ekp/sync-scheduler`
- 监控告警：`https://[domain]/admin/integration/ekp/sync-alerts`
