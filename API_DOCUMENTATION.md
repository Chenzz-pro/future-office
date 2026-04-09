# 未来办公系统 API 接口文档

## 概述

本文档描述未来办公系统的所有 REST API 接口。

**基础URL**: `http://localhost:5000`

**认证方式**: 
- 部分接口需要通过 `X-User-ID` 请求头传递用户ID
- 用户ID为 `sys_org_person.fd_id`

---

## 目录

1. [认证接口](#1-认证接口)
2. [组织架构接口](#2-组织架构接口)
3. [聊天对话接口](#3-聊天对话接口)
4. [自定义技能接口](#4-自定义技能接口)
5. [数据库管理接口](#5-数据库管理接口)
6. [系统管理接口](#6-系统管理接口)
7. [EKP集成接口](#7-ekp集成接口)
8. [管理员接口](#8-管理员接口)
9. [智能体接口](#9-智能体接口)
10. [审批流程接口](#10-审批流程接口)

---

## 1. 认证接口

### 1.1 用户登录

**接口**: `POST /api/auth/login`

**描述**: 通过用户名/密码登录系统

**请求体**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "userId": "uuid-string",
    "username": "admin",
    "personName": "管理员",
    "roleId": "00000000-0000-0000-0000-000000000001",
    "roleName": "超级管理员",
    "isAdmin": true,
    "needPasswordUpdate": false
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "用户不存在或已被禁用"
}
```

---

### 1.2 获取当前用户信息

**接口**: `GET /api/auth/current`

**描述**: 获取当前登录用户信息

**请求头**:
- `X-User-ID`: 用户ID

**响应**:
```json
{
  "success": true,
  "data": {
    "userId": "uuid-string",
    "username": "admin",
    "personName": "管理员",
    "roleId": "uuid",
    "roleName": "角色名称"
  }
}
```

---

### 1.3 修改密码

**接口**: `PUT /api/auth/password`

**描述**: 用户自己修改密码

**请求头**:
- `X-User-ID`: 用户ID

**请求体**:
```json
{
  "oldPassword": "123456",
  "newPassword": "NewPass123"
}
```

**响应**:
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

---

### 1.4 重置密码（管理员）

**接口**: `POST /api/auth/password/reset`

**描述**: 管理员重置用户密码

**请求头**:
- `X-User-ID`: 管理员ID

**请求体**:
```json
{
  "userId": "target-user-uuid",
  "newPassword": "NewPass123"
}
```

**响应**:
```json
{
  "success": true,
  "message": "密码重置成功"
}
```

---

## 2. 组织架构接口

### 2.1 获取组织架构树

**接口**: `GET /api/organization?action=tree&type={type}`

**描述**: 获取组织架构树形结构

**查询参数**:
- `action`: 固定值 `tree`
- `type`: 1=机构, 2=机构和部门

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "海峡人力",
      "type": 1,
      "children": [
        {
          "id": "uuid",
          "name": "人力资源部",
          "type": 2,
          "children": []
        }
      ]
    }
  ]
}
```

---

### 2.2 获取组织列表（分页）

**接口**: `GET /api/organization?action=list&type={type}&parentId={parentId}&page={page}&pageSize={pageSize}`

**描述**: 获取子机构/部门/岗位/人员列表，支持分页

**查询参数**:
- `action`: 固定值 `list`
- `type`: `organization`(机构) | `department`(部门) | `post`(岗位) | `person`(人员)
- `parentId`: 父级ID
- `keyword`: 搜索关键词（可选）
- `page`: 页码（默认1）
- `pageSize`: 每页数量（机构/部门默认10，人员默认50）

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "fd_id": "uuid",
      "fd_name": "部门名称",
      "fd_no": "部门编号",
      "fd_org_email": "email@example.com",
      "fd_order": 1
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 10,
  "totalPages": 10
}
```

---

### 2.3 创建组织元素

**接口**: `POST /api/organization`

**描述**: 创建机构、部门、岗位或人员

**请求体**:
```json
{
  "action": "create",
  "type": "department",
  "data": {
    "fd_name": "人力资源部",
    "fd_no": "HR001",
    "fd_org_email": "hr@example.com",
    "fd_order": 1,
    "fd_memo": "备注"
  }
}
```

**type可选值**:
- `organization`: 机构
- `department`: 部门
- `position`: 岗位
- `person`: 人员

**人员创建特殊字段**:
```json
{
  "action": "create",
  "type": "person",
  "data": {
    "fd_name": "张三",
    "fd_no": "EMP001",
    "fd_login_name": "zhangsan",
    "fd_password": "Pass123456",
    "fd_email": "zhangsan@example.com",
    "fd_mobile": "13800138000",
    "fd_role": "00000000-0000-0000-0000-000000000003"
  }
}
```

**响应**:
```json
{
  "success": true,
  "message": "创建成功",
  "data": {
    "id": "新生成的uuid"
  }
}
```

---

### 2.4 更新组织元素

**接口**: `POST /api/organization`

**描述**: 更新机构、部门、岗位或人员信息

**请求体**:
```json
{
  "action": "update",
  "type": "department",
  "id": "element-uuid",
  "data": {
    "fd_name": "新名称",
    "fd_no": "新编号",
    "fd_order": 2
  }
}
```

**人员密码更新**:
```json
{
  "action": "update",
  "type": "person",
  "id": "person-uuid",
  "data": {
    "fd_name": "张三",
    "fd_password": "NewPass123"
  }
}
```

---

### 2.5 删除组织元素

**接口**: `POST /api/organization`

**描述**: 删除机构、部门、岗位或人员

**请求体**:
```json
{
  "action": "delete",
  "type": "department",
  "id": "element-uuid"
}
```

**响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

### 2.6 获取角色列表

**接口**: `GET /api/organization/role`

**描述**: 获取系统角色列表

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "fd_id": "00000000-0000-0000-0000-000000000001",
      "fd_name": "超级管理员",
      "fd_code": "super_admin",
      "fd_description": "拥有系统所有权限",
      "fd_order": 1,
      "fd_is_available": true
    },
    {
      "fd_id": "00000000-0000-0000-0000-000000000002",
      "fd_name": "管理员",
      "fd_code": "admin",
      "fd_description": "拥有大部分管理权限",
      "fd_order": 2,
      "fd_is_available": true
    },
    {
      "fd_id": "00000000-0000-0000-0000-000000000003",
      "fd_name": "普通用户",
      "fd_code": "user",
      "fd_description": "普通用户权限",
      "fd_order": 3,
      "fd_is_available": true
    }
  ]
}
```

---

### 2.7 组织架构同步

**接口**: `POST /api/organization/sync`

**描述**: 从EKP系统同步组织架构数据（机构、部门、岗位、人员）

**请求头**:
- `X-User-ID`: 用户ID（可选）

**请求体**:
```json
{
  "type": "full",
  "scope": ["organizations", "departments", "posts", "persons"]
}
```

**参数说明**:
- `type`: 同步类型
  - `full`: 全量同步
  - `incremental`: 增量同步
- `scope`: 同步范围数组，可选值：
  - `organizations`: 机构
  - `departments`: 部门
  - `posts`: 岗位
  - `persons`: 人员
  - 可任意组合，如 `["organizations", "departments", "posts", "persons"]` 表示同步全部

**响应**:
```json
{
  "success": true,
  "message": "同步完成",
  "data": {
    "syncLogId": "sync-log-uuid",
    "stats": {
      "total": 100,
      "organizations": { "total": 5, "success": 5, "failed": 0 },
      "departments": { "total": 20, "success": 20, "failed": 0 },
      "posts": { "total": 30, "success": 30, "failed": 0 },
      "persons": { "total": 45, "success": 45, "failed": 0 }
    }
  }
}
```

---

## 3. 聊天对话接口

### 3.1 发送消息（RootAgent）

**接口**: `POST /api/agents/root`

**描述**: 统一对话入口，通过RootAgent处理用户意图

**请求体**:
```json
{
  "message": "帮我查一下待办数量",
  "userId": "user-uuid",
  "deptId": "dept-uuid",
  "role": "user"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "message": "您好，您当前有 5 条待办",
    "intent": {
      "type": "ekp_query",
      "action": "getTodoCount",
      "confidence": 0.95
    },
    "businessResult": {
      "type": "ekp",
      "action": "todo_count",
      "data": {
        "count": 5
      }
    }
  }
}
```

---

### 3.2 获取会话列表

**接口**: `GET /api/chat/sessions`

**描述**: 获取当前用户的对话会话列表

**请求头**:
- `X-User-ID`: 用户ID

**查询参数**:
- `page`: 页码
- `pageSize`: 每页数量

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "session-uuid",
      "title": "对话标题",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 20
}
```

---

### 3.3 获取会话消息

**接口**: `GET /api/chat/sessions/{id}/messages`

**描述**: 获取指定会话的消息历史

**请求头**:
- `X-User-ID`: 用户ID

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "message-uuid",
      "role": "user",
      "content": "用户消息",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "message-uuid",
      "role": "assistant",
      "content": "助手回复",
      "createdAt": "2024-01-01T00:00:01Z"
    }
  ]
}
```

---

## 4. 自定义技能接口

### 4.1 获取技能列表

**接口**: `GET /api/custom-skill?action=list`

**描述**: 获取已配置的自定义技能列表

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "skill-uuid",
      "name": "EKP待办查询",
      "description": "查询蓝凌EKP系统的待办数量",
      "icon": "list-todo",
      "category": "ekp",
      "enabled": true
    }
  ]
}
```

---

### 4.2 获取技能模板

**接口**: `GET /api/custom-skill?type=templates`

**描述**: 获取预置的技能模板

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "ekpTodoCount",
      "name": "EKP待办查询",
      "description": "查询蓝凌EKP系统的待办数量",
      "category": "ekp"
    },
    {
      "id": "ekpLeaveApply",
      "name": "EKP请假申请",
      "description": "在蓝凌EKP系统发起请假申请",
      "category": "ekp"
    }
  ]
}
```

---

### 4.3 执行技能

**接口**: `POST /api/custom-skill`

**描述**: 执行自定义技能

**请求体**:
```json
{
  "action": "execute",
  "skill": {
    "id": "skill-uuid",
    "name": "EKP待办查询",
    "apiConfig": {
      "baseUrl": "https://oa.example.com",
      "method": "POST",
      "apiPath": "/api/sys-notify/sysNotifyTodoRestService/getTodo"
    },
    "authConfig": {
      "type": "basic",
      "username": "user",
      "password": "pass"
    }
  },
  "params": {
    "loginName": "zhangsan",
    "todoType": 0
  }
}
```

**响应**:
```json
{
  "success": true,
  "message": "执行成功",
  "data": {
    "todoCount": 5
  }
}
```

---

### 4.4 测试技能

**接口**: `POST /api/custom-skill`

**描述**: 测试自定义技能配置

**请求体**:
```json
{
  "action": "test",
  "skill": {
    "apiConfig": {
      "baseUrl": "https://oa.example.com",
      "method": "POST",
      "apiPath": "/api/test"
    },
    "authConfig": {
      "type": "basic",
      "username": "user",
      "password": "pass"
    }
  },
  "params": {}
}
```

---

## 5. 数据库管理接口

### 5.1 获取数据库状态

**接口**: `GET /api/database`

**描述**: 获取数据库连接状态和配置信息

**响应**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "config": {
      "host": "localhost",
      "port": 3306,
      "databaseName": "future_office",
      "username": "root"
    }
  }
}
```

---

### 5.2 初始化数据库

**接口**: `POST /api/database?action=init`

**描述**: 初始化数据库，创建表结构和默认数据

**请求体**:
```json
{
  "host": "localhost",
  "port": 3306,
  "databaseName": "future_office",
  "username": "root",
  "password": "password"
}
```

**响应**:
```json
{
  "success": true,
  "message": "数据库初始化成功",
  "data": {
    "tablesCreated": 10,
    "defaultAccounts": [
      { "username": "admin", "password": "admin123" },
      { "username": "user", "password": "user123" }
    ]
  }
}
```

---

### 5.3 测试数据库连接

**接口**: `POST /api/database?action=test`

**描述**: 测试数据库连接是否正常

**请求体**:
```json
{
  "host": "localhost",
  "port": 3306,
  "databaseName": "future_office",
  "username": "root",
  "password": "password"
}
```

**响应**:
```json
{
  "success": true,
  "message": "连接成功"
}
```

---

### 5.4 初始化角色表

**接口**: `POST /api/database/init/role`

**描述**: 创建角色表并插入默认角色

**响应**:
```json
{
  "success": true,
  "message": "角色表初始化成功"
}
```

---

### 5.5 迁移角色数据

**接口**: `POST /api/database/migrate/role`

**描述**: 将fd_role从ENUM迁移到外键关联

**响应**:
```json
{
  "success": true,
  "message": "角色数据迁移成功"
}
```

---

## 6. 系统管理接口

### 6.1 获取系统状态

**接口**: `GET /api/system/status`

**描述**: 获取系统整体状态，包括数据库连接、初始化状态等

**响应**:
```json
{
  "success": true,
  "data": {
    "database": {
      "connected": true,
      "host": "localhost",
      "databaseName": "future_office"
    },
    "initialized": true,
    "version": "1.0.0"
  }
}
```

---

### 6.2 初始化系统

**接口**: `POST /api/system/init`

**描述**: 初始化系统（创建默认账号）

**请求体**:
```json
{
  "adminPassword": "admin123",
  "userPassword": "user123"
}
```

---

## 7. EKP集成接口

### 7.1 EKP通用代理

**接口**: `POST /api/ekp`

**描述**: 统一的EKP接口代理，支持多种操作

**请求体**:
```json
{
  "action": "getTodoCount",
  "baseUrl": "https://oa.fjhxrl.com",
  "username": "user",
  "password": "pass",
  "loginName": "zhangsan",
  "todoType": 0,
  "userId": "current-user-uuid"
}
```

**action可选值**:
- `test`: 测试连接
- `getTodoCount`: 获取待办数量
- `addReview`: 添加待办
- `approveReview`: 审批待办
- `updateReview`: 更新待办

**todoType可选值**:
- `-1`: 已办
- `0`: 所有待办
- `1`: 审批类
- `2`: 通知类
- `3`: 暂挂类
- `13`: 审批+暂挂

**响应**:
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "loginName": "zhangsan",
    "todoCount": 5,
    "userId": "current-user-uuid"
  }
}
```

---

### 7.2 EKP接口测试

**接口**: `POST /api/admin/ekp-interfaces/test`

**描述**: 测试EKP接口调用

**请求体**:
```json
{
  "code": "ekp.todo.getTodo",
  "params": {
    "loginName": "zhangsan",
    "todoType": 0
  }
}
```

---

## 8. 管理员接口

### 8.1 EKP接口管理

**获取接口列表**: `GET /api/admin/ekp-interfaces`

**查询参数**:
- `type`: `official`(官方) | `custom`(二开) | `all`
- `category`: 分类筛选
- `keyword`: 关键词搜索
- `enabled`: `true` | `false` | `all`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "ekp.todo.getTodo",
      "name": "获取待办",
      "category": "workflow",
      "endpoint": "/api/sys-notify/sysNotifyTodoRestService/getTodo",
      "method": "POST",
      "enabled": true,
      "isSystem": true
    }
  ],
  "stats": {
    "total": 50,
    "official": 40,
    "custom": 10,
    "enabled": 45,
    "disabled": 5
  },
  "categories": ["workflow", "document", "organization"]
}
```

**创建接口**: `POST /api/admin/ekp-interfaces`

```json
{
  "source": "custom",
  "code": "custom.api.getData",
  "name": "自定义接口",
  "category": "custom",
  "endpoint": "/api/custom/data",
  "method": "GET",
  "enabled": true
}
```

**更新接口**: `PUT /api/admin/ekp-interfaces/{id}`

**删除接口**: `DELETE /api/admin/ekp-interfaces/{id}`

---

### 8.2 OneAPI配置

**获取配置**: `GET /api/admin/oneapi`

**创建配置**: `POST /api/admin/oneapi`

```json
{
  "name": "DeepSeek",
  "baseUrl": "https://api.deepseek.com",
  "apiKey": "sk-xxx",
  "model": "deepseek-chat",
  "enabled": true
}
```

**测试配置**: `POST /api/admin/oneapi/test`

```json
{
  "baseUrl": "https://api.deepseek.com",
  "apiKey": "sk-xxx"
}
```

---

### 8.3 定时任务管理

**获取任务列表**: `GET /api/scheduler/tasks`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "组织架构同步",
      "type": "org_sync",
      "cron": "0 0 * * *",
      "enabled": true,
      "lastRunTime": "2024-01-01T00:00:00Z",
      "nextRunTime": "2024-01-02T00:00:00Z"
    }
  ]
}
```

---

### 8.4 监控告警

**获取告警列表**: `GET /api/monitor/alerts`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "sync_error",
      "level": "error",
      "message": "组织架构同步失败",
      "createdAt": "2024-01-01T00:00:00Z",
      "resolved": false
    }
  ]
}
```

---

## 9. 智能体接口

### 9.1 执行智能体

**接口**: `POST /api/agents/{agentId}/execute`

**描述**: 执行指定的智能体

**请求体**:
```json
{
  "message": "帮我查一下待办",
  "userId": "user-uuid",
  "params": {}
}
```

---

### 9.2 获取智能体列表

**接口**: `GET /api/agents`

**描述**: 获取可用的智能体列表

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "agent-uuid",
      "name": "审批助手",
      "description": "处理审批相关事务",
      "icon": "approval",
      "enabled": true
    }
  ]
}
```

---

## 10. 审批流程接口

### 10.1 发起审批

**接口**: `POST /api/approval/launch`

**描述**: 发起一个新的审批流程

**请求头**:
- `X-User-ID`: 用户ID

**请求体**:
```json
{
  "templateId": "leave_template",
  "formData": {
    "startDate": "2024-01-15",
    "endDate": "2024-01-17",
    "reason": "年假"
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "approvalId": "approval-uuid",
    "status": "pending"
  }
}
```

---

### 10.2 审批进度跟踪

**接口**: `GET /api/approval/progress/track?approvalId={id}`

**描述**: 获取审批进度

**响应**:
```json
{
  "success": true,
  "data": {
    "approvalId": "approval-uuid",
    "currentStep": 2,
    "totalSteps": 3,
    "approvers": [
      { "name": "张三", "status": "approved" },
      { "name": "李四", "status": "pending" }
    ]
  }
}
```

---

### 10.3 自动审批检查

**接口**: `POST /api/approval/auto-approve/check`

**描述**: 检查审批是否符合自动通过规则

**请求体**:
```json
{
  "approvalId": "approval-uuid",
  "userId": "user-uuid"
}
```

---

### 10.4 会议创建

**接口**: `POST /api/meeting/create`

**描述**: 创建会议

**请求头**:
- `X-User-ID`: 用户ID

**请求体**:
```json
{
  "title": "项目评审会议",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T12:00:00Z",
  "participants": ["user1-uuid", "user2-uuid"],
  "roomId": "room-uuid"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "meetingId": "meeting-uuid",
    "status": "scheduled"
  }
}
```

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未登录或登录过期 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 通用响应格式

**成功响应**:
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "错误信息"
}
```

---

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2024-04-09 | 初始版本 |
