# 业务接口开发指南

本文档提供了未来办公系统业务接口开发的完整指南，包括工具函数、示例代码和最佳实践。

## 快速开始

### 1. 创建新的业务接口

#### 步骤 1：创建接口文件

在 `src/app/api/{domain}/{resource}/` 目录下创建 `route.ts` 文件。

例如：`src/app/api/ekp/todo/approve/route.ts`

#### 步骤 2：复制模板

复制以下标准模板：

```typescript
/**
 * 接口名称
 * METHOD /api/{domain}/{resource}[/{id}]
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  checkPermission,
  PermissionRules,
  extractUserContext,
} from '@/lib/middleware/permission';
import {
  handleBusinessError,
  BusinessErrors,
} from '@/lib/utils/error-handler';
import { logger, generateRequestId } from '@/lib/utils/logger';
import {
  buildSuccessResponse,
  extractSkillParams,
  validateRequiredParams,
  calculateExecutionTime,
} from '@/lib/utils/api';
import { dbManager } from '@/lib/database/manager';

export async function GET(request: NextRequest) {
  // 1. 初始化上下文
  const requestId = generateRequestId();
  const startTime = Date.now();
  const userContext = extractUserContext(request);

  try {
    // 2. 记录请求日志
    logger.info({
      module: 'module-name',
      action: 'action-name',
      userId: userContext.userId,
      requestId,
      message: '开始处理请求',
    });

    // 3. 权限校验
    const permissionResult = await checkPermission(
      PermissionRules.allLoggedIn,
      request
    );

    if (!permissionResult.granted) {
      return NextResponse.json(
        handleBusinessError(BusinessErrors.permissionDenied()),
        { status: 403 }
      );
    }

    // 4. 解析参数
    // TODO: 解析请求参数

    // 5. 执行业务逻辑
    // TODO: 实现业务逻辑

    // 6. 记录成功日志
    logger.info({
      module: 'module-name',
      action: 'action-name',
      userId: userContext.userId,
      requestId,
      message: '处理成功',
    });

    // 7. 返回成功响应
    return NextResponse.json(
      buildSuccessResponse(
        { /* 返回数据 */ },
        '操作成功',
        { executionTime: calculateExecutionTime(startTime) }
      )
    );
  } catch (error) {
    // 8. 错误处理
    const errorResponse = handleBusinessError(error);

    logger.error({
      module: 'module-name',
      action: 'action-name',
      userId: userContext.userId,
      requestId,
      message: '处理失败',
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

#### 步骤 3：填充业务逻辑

根据需求实现具体的业务逻辑。

参考示例：
- `src/app/api/ekp/todo/list/route.ts` - 查询接口示例
- `src/app/api/ekp/todo/[id]/approve/route.ts` - 更新接口示例
- `src/app/api/meeting/create/route.ts` - 创建接口示例（含冲突检查）

### 2. 使用工具函数

#### 2.1 权限校验

```typescript
import {
  checkPermission,
  PermissionRules,
  extractUserContext,
} from '@/lib/middleware/permission';

// 使用预定义的权限规则
const result = await checkPermission(PermissionRules.allLoggedIn, request);

// 自定义权限检查
const result = await checkPermission(
  {
    requireLogin: true,
    allowedRoles: ['admin', 'manager'],
    customCheck: async (userContext, params) => {
      // 自定义权限逻辑
      return true;
    },
  },
  request
);

// 提取用户上下文
const userContext = extractUserContext(request);
```

#### 2.2 错误处理

```typescript
import {
  handleBusinessError,
  BusinessErrors,
  BusinessError,
} from '@/lib/utils/error-handler';

// 抛出预定义错误
throw BusinessErrors.invalidParams({
  field: 'email',
  reason: '邮箱格式不正确',
});

throw BusinessErrors.permissionDenied();
throw BusinessErrors.notFound('用户', { userId: 'xxx' });
throw BusinessErrors.ekpError({ endpoint: '/xxx' });

// 抛出自定义业务错误
throw new BusinessError('400', '自定义错误消息', { details: 'xxx' });

// 处理错误
try {
  // 业务逻辑
} catch (error) {
  const errorResponse = handleBusinessError(error);
  return NextResponse.json(errorResponse, { status: 400 });
}
```

#### 2.3 日志记录

```typescript
import { logger, generateRequestId } from '@/lib/utils/logger';

// 生成请求ID
const requestId = generateRequestId();

// 记录INFO日志
logger.info({
  module: 'ekp',
  action: 'todo.list',
  userId: 'xxx',
  requestId,
  message: '操作成功',
  data: { /* 数据 */ },
});

// 记录WARN日志
logger.warn({
  module: 'ekp',
  action: 'todo.list',
  userId: 'xxx',
  requestId,
  message: '警告信息',
});

// 记录ERROR日志
logger.error({
  module: 'ekp',
  action: 'todo.list',
  userId: 'xxx',
  requestId,
  message: '操作失败',
  error: {
    type: 'Error',
    message: '错误消息',
    stack: '堆栈信息',
  },
});

// 记录DEBUG日志（仅开发环境）
logger.debug({
  module: 'ekp',
  action: 'todo.list',
  userId: 'xxx',
  requestId,
  message: '调试信息',
});
```

#### 2.4 API工具

```typescript
import {
  buildSuccessResponse,
  parsePaginationParams,
  buildPaginationMeta,
  extractSkillParams,
  validateRequiredParams,
  formatDate,
  calculateExecutionTime,
} from '@/lib/utils/api';

// 构造成功响应
return NextResponse.json(
  buildSuccessResponse(
    { /* 数据 */ },
    '操作成功',
    {
      meta: '附加数据',
      executionTime: calculateExecutionTime(startTime),
    }
  )
);

// 解析分页参数
const { page, pageSize, offset } = parsePaginationParams(searchParams);

// 构造分页元数据
const meta = buildPaginationMeta(total, page, pageSize);

// 提取技能参数
const { data, remark, extras } = extractSkillParams(body);

// 验证必填参数
validateRequiredParams(data, ['title', 'startTime']);

// 格式化日期
const dateStr = formatDate(new Date(), 'DATETIME');

// 计算执行时间
const executionTime = calculateExecutionTime(startTime);
```

### 3. 测试接口

使用测试脚本：

```bash
# 给脚本添加执行权限
chmod +x scripts/test-business-api.sh

# 运行测试
./scripts/test-business-api.sh
```

或者手动测试：

```bash
# 测试待办查询
curl -X GET 'http://localhost:5000/api/ekp/todo/list?page=1&pageSize=20&todoType=0' \
  -H 'Content-Type: application/json' \
  -H 'X-User-ID: 00000000-0000-0000-0000-000000000001' \
  -H 'X-User-Role: admin'

# 测试待办审批
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
      "startTime": "2024-12-25 14:00:00",
      "endTime": "2024-12-25 16:00:00",
      "location": "会议室A",
      "participants": ["user1", "user2"]
    }
  }'
```

## 最佳实践

### 1. 命名规范

- **模块名称**：小写字母，如 `ekp`, `meeting`, `schedule`
- **操作名称**：动词+名词，如 `todo.list`, `todo.approve`, `meeting.create`
- **接口路径**：`/api/{module}/{resource}[/{id}]`

### 2. 权限设计

- 所有接口必须进行权限校验
- 使用预定义的权限规则（`PermissionRules`）
- 复杂权限逻辑使用 `customCheck` 函数

### 3. 错误处理

- 使用预定义的业务错误（`BusinessErrors`）
- 错误消息要清晰明确
- 记录完整的错误堆栈（开发环境）

### 4. 日志记录

- 记录请求开始和结束
- 记录关键操作和参数
- 错误日志必须包含完整的上下文信息

### 5. 响应格式

- 成功响应使用 `buildSuccessResponse`
- 错误响应使用 `handleBusinessError`
- 总是返回 `timestamp` 字段

### 6. 参数校验

- 使用 `validateRequiredParams` 校验必填参数
- 业务逻辑参数单独校验
- 提供清晰的错误消息

## 常见问题

### Q1: 如何自定义权限规则？

```typescript
const permissionResult = await checkPermission(
  {
    requireLogin: true,
    allowedRoles: ['admin', 'manager'],
    customCheck: async (userContext, params) => {
      // 自定义权限逻辑
      // 例如：检查用户是否属于特定部门
      const deptId = userContext.deptId;
      const allowedDepts = ['dept1', 'dept2'];
      return allowedDepts.includes(deptId || '');
    },
  },
  request
);
```

### Q2: 如何处理数据库事务？

```typescript
import { dbManager } from '@/lib/database/manager';

try {
  // 开启事务
  await dbManager.beginTransaction();

  // 执行多个SQL操作
  await dbManager.query('INSERT INTO ...');
  await dbManager.query('UPDATE ...');

  // 提交事务
  await dbManager.commit();
} catch (error) {
  // 回滚事务
  await dbManager.rollback();
  throw error;
}
```

### Q3: 如何调用外部API？

```typescript
// 方式1：使用现有的REST客户端
import { ekpRESTClient } from '@/lib/ekp-rest-client';
const result = await ekpRESTClient.getTodoCount({ userId, todoType });

// 方式2：使用fetch
const response = await fetch('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ /* 数据 */ }),
});
const data = await response.json();
```

### Q4: 如何实现文件上传？

```typescript
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw BusinessErrors.invalidParams({
        field: 'file',
        reason: '文件不能为空',
      });
    }

    // 处理文件
    const buffer = Buffer.from(await file.arrayBuffer());
    // TODO: 保存文件到对象存储或本地

    return NextResponse.json(
      buildSuccessResponse(
        { filename: file.name, size: file.size },
        '上传成功'
      )
    );
  } catch (error) {
    const errorResponse = handleBusinessError(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
```

## 相关文档

- [业务接口标准规范](./BUSINESS_API_STANDARDS.md) - 完整的接口设计规范
- [项目概述](./AGENTS.md) - 项目整体架构说明
- [系统初始化指南](./SYSTEM_INIT_GUIDE.md) - 系统部署和初始化

## 联系方式

如有问题或建议，请联系开发团队。
