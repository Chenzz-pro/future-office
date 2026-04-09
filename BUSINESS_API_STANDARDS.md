# 未来办公系统 - 业务接口标准规范

## 1. 概述

本文档定义了未来办公系统中所有业务接口的统一标准，旨在确保：
- 接口风格一致性
- 权限校验标准化
- 错误处理统一化
- 日志记录规范化
- 便于技能调用和集成

---

## 2. 接口设计原则

### 2.1 RESTful API 设计原则
- 使用 HTTP 方法语义化（GET 查询、POST 创建、PUT 更新、DELETE 删除）
- 资源命名使用名词复数形式
- 使用标准 HTTP 状态码
- 支持分页、排序、过滤

### 2.2 技能调用优先原则
- 所有业务接口优先考虑被技能调用
- 接口设计需考虑技能的灵活性（参数可配置）
- 返回数据结构化，便于规则引擎处理

---

## 3. 接口路径规范

### 3.1 路径结构
```
/api/{domain}/{resource}[/{id}][/{action}]
```

**参数说明：**
- `domain`：业务领域（ekp, meeting, data, schedule, workflow）
- `resource`：资源名称（todo, meeting, schedule）
- `id`：资源ID（可选）
- `action`：操作名称（可选，用于非CRUD操作）

### 3.2 路径命名示例

| 领域 | 资源 | 路径示例 | 说明 |
|------|------|----------|------|
| EKP | 待办 | `/api/ekp/todo/list` | 查询待办列表 |
| EKP | 待办 | `/api/ekp/todo/[id]/approve` | 审批待办 |
| 会议 | 会议 | `/api/meeting/list` | 查询会议列表 |
| 会议 | 会议 | `/api/meeting/create` | 创建会议 |
| 日程 | 日程 | `/api/schedule/list` | 查询日程列表 |
| 日程 | 日程 | `/api/schedule/create` | 创建日程 |
| 工作流 | 流程 | `/api/workflow/[id]/start` | 发起流程 |

---

## 4. 请求/响应格式规范

### 4.1 请求头规范

```typescript
// 所有业务接口必须支持的标准请求头
interface StandardHeaders {
  // 用户ID（必需，用于权限校验）
  'X-User-ID': string;

  // 部门ID（可选，用于数据过滤）
  'X-Dept-ID'?: string;

  // 用户角色（可选，用于权限校验）
  'X-User-Role'?: string;

  // 请求ID（可选，用于链路追踪）
  'X-Request-ID'?: string;

  // 内容类型
  'Content-Type': 'application/json';
}
```

### 4.2 请求参数规范

#### 4.2.1 GET 请求（查询）
```typescript
// URL Query 参数
interface QueryParams {
  // 分页参数
  page?: number;        // 页码，默认1
  pageSize?: number;    // 每页数量，默认20，最大100

  // 排序参数
  sortBy?: string;      // 排序字段
  sortOrder?: 'asc' | 'desc'; // 排序方向

  // 过滤参数（根据资源类型定义）
  [key: string]: any;
}
```

**示例：**
```
GET /api/ekp/todo/list?page=1&pageSize=20&todoType=1&status=0
```

#### 4.2.2 POST/PUT 请求（创建/更新）
```typescript
// JSON Body 参数
interface StandardRequestBody {
  // 操作数据（根据资源类型定义）
  data: Record<string, any>;

  // 操作备注（可选）
  remark?: string;

  // 扩展参数（可选，用于传递额外信息）
  extras?: Record<string, any>;
}
```

**示例：**
```json
POST /api/ekp/todo/[id]/approve
{
  "data": {
    "todoId": "123456",
    "comment": "同意"
  },
  "remark": "审批通过"
}
```

### 4.3 响应格式规范

#### 4.3.1 成功响应
```typescript
interface SuccessResponse<T = any> {
  // 响应状态码（固定 '200'）
  code: '200';

  // 响应消息
  msg: string;

  // 响应数据
  data: T;

  // 元数据（可选）
  meta?: {
    total?: number;          // 总数
    page?: number;           // 当前页
    pageSize?: number;       // 每页数量
    executionTime?: number;  // 执行时间（毫秒）
  };

  // 时间戳
  timestamp: number;
}
```

**示例：**
```json
{
  "code": "200",
  "msg": "查询成功",
  "data": [
    {
      "id": "001",
      "title": "费用报销申请",
      "status": "待审批",
      "createTime": "2024-01-20 10:00:00"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "pageSize": 20
  },
  "timestamp": 1705716000000
}
```

#### 4.3.2 错误响应
```typescript
interface ErrorResponse {
  // 响应状态码（非 '200'）
  code: '400' | '401' | '403' | '404' | '500';

  // 错误消息
  msg: string;

  // 错误详情（可选）
  error?: {
    type: string;           // 错误类型
    details?: any;          // 错误详情
    stack?: string;         // 堆栈信息（仅开发环境）
  };

  // 时间戳
  timestamp: number;
}
```

**标准错误码：**
| 错误码 | 说明 | HTTP 状态码 |
|--------|------|-------------|
| 400 | 请求参数错误 | 400 |
| 401 | 未授权（未登录） | 401 |
| 403 | 无权限 | 403 |
| 404 | 资源不存在 | 404 |
| 500 | 服务器内部错误 | 500 |

**示例：**
```json
{
  "code": "403",
  "msg": "您没有权限执行此操作",
  "error": {
    "type": "PermissionDenied",
    "details": {
      "requiredRole": "admin",
      "currentUserRole": "user"
    }
  },
  "timestamp": 1705716000000
}
```

---

## 5. 权限校验规范

### 5.1 统一权限校验中间件

所有业务接口必须使用统一的权限校验中间件：

```typescript
// src/lib/middleware/permission.ts

export interface PermissionCheckOptions {
  // 是否需要登录
  requireLogin?: boolean;

  // 允许的角色（空数组表示所有角色）
  allowedRoles?: string[];

  // 权限检查函数（自定义权限逻辑）
  customCheck?: (userContext: UserContext, params: any) => boolean;
}

export async function checkPermission(
  options: PermissionCheckOptions,
  request: NextRequest
): Promise<{ granted: boolean; reason?: string }> {
  // 1. 提取用户信息
  const userId = request.headers.get('X-User-ID');
  const role = request.headers.get('X-User-Role');

  // 2. 检查是否需要登录
  if (options.requireLogin && !userId) {
    return { granted: false, reason: '请先登录' };
  }

  // 3. 检查角色权限
  if (options.allowedRoles && options.allowedRoles.length > 0) {
    if (!role || !options.allowedRoles.includes(role)) {
      return { granted: false, reason: '您没有权限执行此操作' };
    }
  }

  // 4. 自定义权限检查
  if (options.customCheck) {
    const userContext: UserContext = {
      userId: userId || '',
      role: role || 'user',
    };

    const granted = options.customCheck(userContext, {});
    if (!granted) {
      return { granted: false, reason: '权限检查失败' };
    }
  }

  return { granted: true };
}
```

### 5.2 在业务接口中使用

```typescript
// src/app/api/ekp/todo/approve/route.ts

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. 权限校验
  const permissionResult = await checkPermission(
    {
      requireLogin: true,
      allowedRoles: ['admin', 'manager'], // 只有管理员和经理可以审批
      customCheck: (userContext, params) => {
        // 检查用户是否有权限审批该待办
        return true; // TODO: 实现具体逻辑
      }
    },
    request
  );

  if (!permissionResult.granted) {
    return NextResponse.json({
      code: '403',
      msg: permissionResult.reason || '无权限',
      timestamp: Date.now(),
    }, { status: 403 });
  }

  // 2. 执行业务逻辑
  // ...
}
```

---

## 6. 错误处理规范

### 6.1 统一错误处理

```typescript
// src/lib/utils/error-handler.ts

export class BusinessError extends Error {
  constructor(
    public code: string,
    msg: string,
    public details?: any
  ) {
    super(msg);
    this.name = 'BusinessError';
  }
}

export function handleBusinessError(error: unknown): ErrorResponse {
  // 1. 业务错误
  if (error instanceof BusinessError) {
    return {
      code: error.code as any,
      msg: error.message,
      error: {
        type: error.name,
        details: error.details,
      },
      timestamp: Date.now(),
    };
  }

  // 2. 未知错误
  return {
    code: '500',
    msg: error instanceof Error ? error.message : '服务器内部错误',
    error: {
      type: 'UnknownError',
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
    },
    timestamp: Date.now(),
  };
}
```

### 6.2 在业务接口中使用

```typescript
export async function POST(request: NextRequest) {
  try {
    // 业务逻辑
    const result = await someOperation();

    return NextResponse.json({
      code: '200',
      msg: '操作成功',
      data: result,
      timestamp: Date.now(),
    });
  } catch (error) {
    const errorResponse = handleBusinessError(error);

    console.error('[API Error]', error);

    return NextResponse.json(errorResponse, {
      status: parseInt(errorResponse.code) || 500
    });
  }
}
```

---

## 7. 日志记录规范

### 7.1 日志级别

| 级别 | 说明 | 使用场景 |
|------|------|----------|
| INFO | 信息 | 正常流程、关键操作 |
| WARN | 警告 | 非关键性问题、降级操作 |
| ERROR | 错误 | 业务错误、系统错误 |
| DEBUG | 调试 | 开发调试信息（仅开发环境） |

### 7.2 日志格式

```typescript
// 标准日志格式
interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  timestamp: number;
  module: string;        // 模块名称（如 'ekp', 'meeting'）
  action: string;        // 操作名称
  userId?: string;       // 用户ID
  requestId?: string;    // 请求ID
  message: string;       // 日志消息
  data?: any;            // 附加数据
  error?: {              // 错误信息
    type: string;
    message: string;
    stack?: string;
  };
}
```

### 7.3 日志记录示例

```typescript
import { logger } from '@/lib/utils/logger';

// 记录INFO日志
logger.info({
  module: 'ekp',
  action: 'todo.approve',
  userId: 'xxx',
  requestId: 'yyy',
  message: '审批待办成功',
  data: {
    todoId: '123',
    status: 'approved'
  }
});

// 记录ERROR日志
logger.error({
  module: 'ekp',
  action: 'todo.approve',
  userId: 'xxx',
  requestId: 'yyy',
  message: '审批待办失败',
  error: {
    type: 'EKPServiceError',
    message: 'EKP服务不可用',
    stack: error.stack
  }
});
```

---

## 8. API 文档规范

### 8.1 API 文档模板

```markdown
## 接口名称

### 接口描述
简要描述接口的功能和用途

### 请求信息
- **URL**: `/api/{domain}/{resource}[/{id}]`
- **Method**: GET | POST | PUT | DELETE
- **Content-Type**: application/json

### 请求参数

#### 请求头
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| X-User-ID | string | 是 | 用户ID |

#### Query参数（GET请求）
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| page | number | 否 | 页码 | 1 |
| pageSize | number | 否 | 每页数量 | 20 |

#### Body参数（POST/PUT请求）
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| data | object | 是 | 操作数据 | {...} |

### 响应参数

#### 成功响应（200）
| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | string | 状态码 |
| msg | string | 响应消息 |
| data | object/array | 响应数据 |

#### 错误响应（4xx/5xx）
| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | string | 错误码 |
| msg | string | 错误消息 |
| error | object | 错误详情 |

### 请求示例

\`\`\`bash
curl -X POST http://localhost:5000/api/ekp/todo/123/approve \\
  -H 'Content-Type: application/json' \\
  -H 'X-User-ID: xxx' \\
  -d '{
    "data": {
      "comment": "同意"
    }
  }'
\`\`\`

### 响应示例

\`\`\`json
{
  "code": "200",
  "msg": "审批成功",
  "data": {
    "todoId": "123",
    "status": "approved"
  },
  "timestamp": 1705716000000
}
\`\`\`

### 权限要求
- 需要登录
- 角色要求：admin, manager

### 注意事项
1. ...
2. ...
```

---

## 9. 技能接口映射规范

### 9.1 技能配置结构

```typescript
interface SkillConfig {
  id: string;
  code: string;              // 技能代码（如 ekp.todo.list）
  name: string;              // 技能名称
  description: string;       // 技能描述
  category: string;          // 技能分类（ekp, meeting, data, schedule）

  // API配置
  apiConfig: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    endpoint: string;        // API端点（如 /api/ekp/todo/list）
    headers?: Record<string, string>;
    params?: string[];       // 需要的参数列表
    bodyTemplate?: Record<string, any>; // 请求体模板
  };

  // 响应解析配置
  responseParsing: {
    dataPath?: string;       // 数据路径（如 data.items）
    transform?: string;      // 数据转换函数
  };

  enabled: boolean;
}
```

### 9.2 技能调用示例

```typescript
// src/lib/agents/approval-agent.ts

protected async callSkill(skillCode: string, params: Record<string, any>): Promise<any> {
  console.log('[ApprovalAgent] 调用技能:', skillCode, params);

  switch (skillCode) {
    case 'ekp.todo.list':
      // 调用待办查询接口
      return this.callEKPApi('/api/ekp/todo/list', 'GET', params);

    case 'ekp.todo.approve':
      // 调用审批接口
      return this.callEKPApi('/api/ekp/todo/approve', 'POST', params);

    default:
      throw new Error(`未知技能: ${skillCode}`);
  }
}

private async callEKPApi(
  endpoint: string,
  method: string,
  params: Record<string, any>
): Promise<any> {
  // 构造请求
  const url = `${process.env.EKP_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.EKP_API_KEY}`,
    'X-User-ID': this.userContext.userId,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify({ data: params }) : undefined,
  });

  const result = await response.json();

  if (result.code !== '200') {
    throw new Error(result.msg);
  }

  return result.data;
}
```

---

## 10. 实现示例

### 10.1 EKP 待办查询接口

**文件路径：** `src/app/api/ekp/todo/list/route.ts`

```typescript
/**
 * EKP 待办查询接口
 * GET /api/ekp/todo/list
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/middleware/permission';
import { handleBusinessError, BusinessError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { ekpRESTClient } from '@/lib/ekp-rest-client';

/**
 * GET /api/ekp/todo/list
 * 查询当前用户的待办列表
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // 1. 提取用户信息
    const userId = request.headers.get('X-User-ID');
    const role = request.headers.get('X-User-Role');

    // 2. 权限校验
    const permissionResult = await checkPermission(
      {
        requireLogin: true,
        allowedRoles: [], // 所有登录用户都可以查询
      },
      request
    );

    if (!permissionResult.granted) {
      logger.warn({
        module: 'ekp',
        action: 'todo.list',
        userId,
        requestId,
        message: '权限校验失败',
        error: {
          type: 'PermissionDenied',
          message: permissionResult.reason,
        },
      });

      return NextResponse.json(
        {
          code: '403',
          msg: permissionResult.reason || '无权限',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // 3. 解析查询参数
    const { searchParams } = new URL(request.url);
    const todoType = parseInt(searchParams.get('todoType') || '0'); // 0:所有, 1:审批类, 2:通知类
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 4. 调用EKP接口
    const ekpResponse = await ekpRESTClient.getTodoCount({
      userId,
      todoType,
      page,
      pageSize,
    });

    // 5. 记录成功日志
    logger.info({
      module: 'ekp',
      action: 'todo.list',
      userId,
      requestId,
      message: '待办查询成功',
      data: {
        todoType,
        count: ekpResponse.count,
        page,
        pageSize,
      },
    });

    // 6. 返回成功响应
    return NextResponse.json({
      code: '200',
      msg: '查询成功',
      data: ekpResponse.items || [],
      meta: {
        total: ekpResponse.count,
        page,
        pageSize,
        executionTime: Date.now() - startTime,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    // 错误处理
    const errorResponse = handleBusinessError(error);

    logger.error({
      module: 'ekp',
      action: 'todo.list',
      userId: request.headers.get('X-User-ID'),
      requestId,
      message: '待办查询失败',
      error: {
        type: errorResponse.error?.type,
        message: errorResponse.msg,
        stack: errorResponse.error?.stack,
      },
    });

    return NextResponse.json(errorResponse, {
      status: parseInt(errorResponse.code) || 500,
    });
  }
}
```

### 10.2 EKP 待办审批接口

**文件路径：** `src/app/api/ekp/todo/[id]/approve/route.ts`

```typescript
/**
 * EKP 待办审批接口
 * POST /api/ekp/todo/[id]/approve
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/middleware/permission';
import { handleBusinessError, BusinessError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { ekpRESTClient } from '@/lib/ekp-rest-client';

/**
 * POST /api/ekp/todo/[id]/approve
 * 审批待办
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // 1. 提取用户信息
    const userId = request.headers.get('X-User-ID');
    const role = request.headers.get('X-User-Role');

    // 2. 权限校验
    const permissionResult = await checkPermission(
      {
        requireLogin: true,
        allowedRoles: ['admin', 'manager', 'user'], // 所有登录用户都可以审批
        customCheck: async (userContext, reqParams) => {
          // 检查用户是否有权限审批该待办
          // TODO: 实现具体逻辑（检查待办是否分配给当前用户）
          return true;
        },
      },
      request
    );

    if (!permissionResult.granted) {
      logger.warn({
        module: 'ekp',
        action: 'todo.approve',
        userId,
        requestId,
        message: '权限校验失败',
        error: {
          type: 'PermissionDenied',
          message: permissionResult.reason,
        },
      });

      return NextResponse.json(
        {
          code: '403',
          msg: permissionResult.reason || '无权限',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // 3. 解析请求参数
    const body = await request.json();
    const { data, remark } = body;

    if (!data) {
      throw new BusinessError('400', '请求参数错误: 缺少data字段');
    }

    const { comment } = data;
    const todoId = params.id;

    if (!comment) {
      throw new BusinessError('400', '审批意见不能为空');
    }

    // 4. 调用EKP接口
    const ekpResponse = await ekpRESTClient.approveTodo({
      todoId,
      userId,
      comment,
      remark,
    });

    // 5. 记录成功日志
    logger.info({
      module: 'ekp',
      action: 'todo.approve',
      userId,
      requestId,
      message: '待办审批成功',
      data: {
        todoId,
        comment,
      },
    });

    // 6. 返回成功响应
    return NextResponse.json({
      code: '200',
      msg: '审批成功',
      data: {
        todoId,
        status: 'approved',
        approvalTime: new Date().toISOString(),
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    // 错误处理
    const errorResponse = handleBusinessError(error);

    logger.error({
      module: 'ekp',
      action: 'todo.approve',
      userId: request.headers.get('X-User-ID'),
      requestId,
      message: '待办审批失败',
      error: {
        type: errorResponse.error?.type,
        message: errorResponse.msg,
        stack: errorResponse.error?.stack,
      },
    });

    return NextResponse.json(errorResponse, {
      status: parseInt(errorResponse.code) || 500,
    });
  }
}
```

### 10.3 会议创建接口

**文件路径：** `src/app/api/meeting/create/route.ts`

```typescript
/**
 * 会议创建接口
 * POST /api/meeting/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/middleware/permission';
import { handleBusinessError, BusinessError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { dbManager } from '@/lib/database/manager';

/**
 * POST /api/meeting/create
 * 创建会议
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // 1. 提取用户信息
    const userId = request.headers.get('X-User-ID');
    const role = request.headers.get('X-User-Role');

    // 2. 权限校验
    const permissionResult = await checkPermission(
      {
        requireLogin: true,
        allowedRoles: ['admin', 'manager', 'user'], // 所有登录用户都可以创建会议
      },
      request
    );

    if (!permissionResult.granted) {
      logger.warn({
        module: 'meeting',
        action: 'create',
        userId,
        requestId,
        message: '权限校验失败',
        error: {
          type: 'PermissionDenied',
          message: permissionResult.reason,
        },
      });

      return NextResponse.json(
        {
          code: '403',
          msg: permissionResult.reason || '无权限',
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    // 3. 解析请求参数
    const body = await request.json();
    const { data, remark } = body;

    if (!data) {
      throw new BusinessError('400', '请求参数错误: 缺少data字段');
    }

    const { title, startTime, endTime, location, participants } = data;

    // 参数校验
    if (!title || !startTime || !endTime) {
      throw new BusinessError('400', '必填参数缺失: title, startTime, endTime');
    }

    // 4. 检查会议时间冲突
    const conflictResult = await dbManager.query(`
      SELECT COUNT(*) as count
      FROM meetings
      WHERE location = ?
      AND (
        (start_time <= ? AND end_time >= ?)
        OR (start_time <= ? AND end_time >= ?)
        OR (start_time >= ? AND end_time <= ?)
      )
    `, [location, startTime, startTime, endTime, endTime, startTime, endTime]);

    const conflictCount = (conflictResult.rows[0] as { count: number }).count;
    if (conflictCount > 0) {
      throw new BusinessError('400', '会议时间冲突，该会议室已被占用');
    }

    // 5. 创建会议
    const meetingId = crypto.randomUUID();
    await dbManager.query(`
      INSERT INTO meetings (id, title, start_time, end_time, location, creator_id, participants, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [meetingId, title, startTime, endTime, location, userId, JSON.stringify(participants), remark]);

    // 6. 记录成功日志
    logger.info({
      module: 'meeting',
      action: 'create',
      userId,
      requestId,
      message: '会议创建成功',
      data: {
        meetingId,
        title,
        startTime,
        endTime,
        location,
      },
    });

    // 7. 返回成功响应
    return NextResponse.json({
      code: '200',
      msg: '创建成功',
      data: {
        meetingId,
        title,
        startTime,
        endTime,
        location,
        participants,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    // 错误处理
    const errorResponse = handleBusinessError(error);

    logger.error({
      module: 'meeting',
      action: 'create',
      userId: request.headers.get('X-User-ID'),
      requestId,
      message: '会议创建失败',
      error: {
        type: errorResponse.error?.type,
        message: errorResponse.msg,
        stack: errorResponse.error?.stack,
      },
    });

    return NextResponse.json(errorResponse, {
      status: parseInt(errorResponse.code) || 500,
    });
  }
}
```

---

## 11. 技能配置示例

### 11.1 EKP 待办查询技能

```typescript
// database-schema.sql 中的技能配置

INSERT INTO skills (id, code, name, description, category, api_config, enabled) VALUES (
  'ekp-todo-list',
  'ekp.todo.list',
  '待办查询',
  '查询当前用户的待办事项列表',
  'ekp',
  JSON_OBJECT(
    'method', 'GET',
    'endpoint', '/api/ekp/todo/list',
    'headers', JSON_OBJECT(
      'Content-Type', 'application/json'
    ),
    'params', JSON_ARRAY('todoType', 'page', 'pageSize')
  ),
  TRUE
);
```

### 11.2 EKP 待办审批技能

```typescript
// database-schema.sql 中的技能配置

INSERT INTO skills (id, code, name, description, category, api_config, enabled) VALUES (
  'ekp-todo-approve',
  'ekp.todo.approve',
  '待办审批',
  '审批待办事项',
  'ekp',
  JSON_OBJECT(
    'method', 'POST',
    'endpoint', '/api/ekp/todo/{todoId}/approve',
    'headers', JSON_OBJECT(
      'Content-Type', 'application/json'
    ),
    'params', JSON_ARRAY('todoId', 'comment'),
    'bodyTemplate', JSON_OBJECT(
      'data', JSON_OBJECT(
        'comment', '{comment}'
      )
    )
  ),
  TRUE
);
```

---

## 12. 检查清单

在创建新的业务接口时，请确保：

- [ ] 接口路径符合命名规范
- [ ] 请求头包含必要的用户信息（X-User-ID）
- [ ] 请求参数格式规范（GET用Query，POST用JSON Body）
- [ ] 响应格式符合标准（code, msg, data, timestamp）
- [ ] 权限校验使用统一的checkPermission中间件
- [ ] 错误处理使用统一的handleBusinessError
- [ ] 日志记录包含必要的上下文信息
- [ ] API文档完整（描述、参数、示例）
- [ ] 技能配置正确（api_config、responseParsing）
- [ ] 单元测试覆盖（正常流程、错误场景）
- [ ] 集成测试验证（与其他接口的交互）
- [ ] 性能优化（分页、缓存、索引）

---

## 13. 附录

### 13.1 常用工具函数

```typescript
// src/lib/utils/api.ts

/**
 * 提取用户上下文
 */
export function extractUserContext(request: NextRequest): UserContext {
  return {
    userId: request.headers.get('X-User-ID') || '',
    role: request.headers.get('X-User-Role') || 'user',
    deptId: request.headers.get('X-Dept-ID') || undefined,
  };
}

/**
 * 构造成功响应
 */
export function buildSuccessResponse<T>(
  data: T,
  meta?: any
): SuccessResponse<T> {
  return {
    code: '200',
    msg: '操作成功',
    data,
    meta,
    timestamp: Date.now(),
  };
}

/**
 * 构造错误响应
 */
export function buildErrorResponse(
  code: string,
  msg: string,
  error?: any
): ErrorResponse {
  return {
    code,
    msg,
    error: error ? {
      type: error.type || 'Error',
      details: error.details,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    } : undefined,
    timestamp: Date.now(),
  };
}

/**
 * 分页参数解析
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}
```

### 13.2 接口测试脚本

```bash
#!/bin/bash

# 测试EKP待办查询
curl -X GET 'http://localhost:5000/api/ekp/todo/list?page=1&pageSize=20&todoType=1' \
  -H 'Content-Type: application/json' \
  -H 'X-User-ID: 00000000-0000-0000-0000-000000000001' \
  -H 'X-User-Role: admin'

# 测试EKP待办审批
curl -X POST 'http://localhost:5000/api/ekp/todo/123/approve' \
  -H 'Content-Type: application/json' \
  -H 'X-User-ID: 00000000-0000-0000-0000-000000000001' \
  -H 'X-User-Role: admin' \
  -d '{
    "data": {
      "comment": "同意"
    },
    "remark": "审批通过"
  }'

# 测试会议创建
curl -X POST 'http://localhost:5000/api/meeting/create' \
  -H 'Content-Type: application/json' \
  -H 'X-User-ID: 00000000-0000-0000-0000-000000000001' \
  -H 'X-User-Role: admin' \
  -d '{
    "data": {
      "title": "项目周会",
      "startTime": "2024-01-25 14:00:00",
      "endTime": "2024-01-25 16:00:00",
      "location": "会议室A",
      "participants": ["user1", "user2"]
    },
    "remark": "每周例行会议"
  }'
```

---

## 14. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2024-01-20 | 初始版本 |

---

## 15. 联系方式

如有问题或建议，请联系开发团队。
