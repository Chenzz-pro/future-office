# 智能体新架构设计原则

## 核心原则：业务数据零进LLM，完全内网流转

### 数据流向

```
用户输入
  ↓
RootAgent（LLM：意图识别 + 路由，无业务数据）
  - 只传递：用户信息（userId, deptId, role）+ 用户输入
  - 不传递：任何业务数据
  ↓
业务Agent（代码：权限校验 + 调用技能API）
  - 纯代码逻辑，不调用LLM
  - 依赖规则引擎和技能调用
  ↓
返回结构化数据
  ↓
RootAgent（内网代码格式化：生成友好文本 → 不使用LLM）
  - 使用内网代码进行数据格式化
  - 完全不使用LLM
  ↓
返回前端（全程业务数据不出内网）
```

## 架构分层

### 1. RootAgent（根智能体）

**职责**：
- ✅ 意图识别（使用LLM）
- ✅ 权限拦截（不使用LLM）
- ✅ 响应格式化（不使用LLM，使用内网代码）

**数据安全**：
- LLM只接触用户输入和用户信息
- LLM完全不接触业务数据

**禁止事项**：
- ❌ 将业务数据传递给LLM
- ❌ 使用LLM润色业务数据
- ❌ 将业务Agent返回的data传递给LLM

### 2. 业务Agent（审批、会议、数据、助理）

**职责**：
- ✅ 权限校验（规则引擎）
- ✅ 业务流程执行（规则引擎）
- ✅ 技能调用（HTTP API）

**技术实现**：
- 纯代码逻辑，不调用LLM
- 依赖规则引擎进行权限和业务校验
- 调用技能API执行具体业务

**数据安全**：
- 业务数据只在代码中流转
- 调用技能API，数据在内网流转
- 不经过LLM

### 3. 规则引擎

**职责**：
- ✅ 权限规则校验
- ✅ 业务规则执行
- ✅ 技能调用调度

**技术实现**：
- 纯代码逻辑
- 不使用LLM
- 从数据库加载规则配置

### 4. 技能（API调用）

**职责**：
- ✅ 执行HTTP API请求
- ✅ 解析API响应
- ✅ 返回业务数据

**技术实现**：
- 纯HTTP请求
- 不使用LLM
- 数据在内网流转

## 数据安全边界

### ✅ 允许LLM接触的数据
- 用户输入（自然语言）
- 用户基本信息（userId, deptId, role）
- 系统提示词（固定模板）

### ❌ 禁止LLM接触的数据
- 业务Agent返回的业务数据
- 技能API返回的业务数据
- 数据库中的业务数据
- 任何敏感业务信息

## 响应格式化（内网代码）

### 实现方式
使用内网代码进行数据格式化，完全不用LLM：

```typescript
// ❌ 错误：使用LLM润色业务数据
async polishResponse(data: any): Promise<string> {
  const messages = [
    {
      role: 'system',
      content: '你是一个友好的助手...'
    },
    {
      role: 'user',
      content: `请润色以下数据：\n${JSON.stringify(data)}`
    }
  ];
  return await llm.chat(messages);
}

// ✅ 正确：使用内网代码格式化
formatResponse(data: any): string {
  if (Array.isArray(data)) {
    return this.formatArrayData(data);
  } else if (typeof data === 'object') {
    return this.formatObjectData(data);
  }
  return String(data);
}
```

### 格式化规则
- 数组数据：列表展示，最多显示10条
- 对象数据：键值对展示
- 错误信息：直接返回错误消息
- 成功信息：添加✅前缀，显示数据数量

## 代码示例

### RootAgent意图识别（安全）

```typescript
async recognizeIntent(userInput: string, userContext: UserContext): Promise<IntentResult> {
  // ✅ 只传递用户信息和用户输入
  const messages = [
    {
      role: 'system',
      content: this.systemPrompt
    },
    {
      role: 'user',
      content: `用户信息：\nuserId: ${userContext.userId}\ndeptId: ${userContext.deptId}\n\n用户输入：\n${userInput}`
    }
  ];

  // ✅ LLM只接触用户输入，不接触业务数据
  const response = await llm.chat(messages);
  return this.parseIntentResponse(response);
}
```

### RootAgent响应格式化（安全）

```typescript
formatResponse(businessResponse: AgentResponse): string {
  // ✅ 使用内网代码格式化，不用LLM
  if (typeof businessResponse.data === 'string') {
    return `✅ ${businessResponse.data}`;
  }

  if (typeof businessResponse.data === 'object') {
    return this.formatStructuredData(businessResponse.data);
  }

  return businessResponse.msg;
}
```

### 业务Agent执行（安全）

```typescript
async execute(intent: IntentResult, userContext: UserContext): Promise<AgentResponse> {
  // ✅ 纯代码逻辑，不调用LLM
  const permissionResult = await this.checkPermission(intent.action, userContext);
  if (!permissionResult.granted) {
    return { code: '403', msg: permissionResult.reason };
  }

  // ✅ 调用技能API，数据在内网流转
  const businessResult = await this.executeBusinessLogic(
    intent.action,
    userContext,
    intent.context.params
  );

  return businessResult;
}
```

## 安全检查清单

在代码审查时，请检查以下事项：

### RootAgent
- [ ] 意图识别时，只传递用户信息和用户输入
- [ ] 不将业务数据传递给LLM
- [ ] 响应格式化使用内网代码，不使用LLM
- [ ] 禁止调用 `llm.chat(JSON.stringify(businessData))`

### 业务Agent
- [ ] 不调用LLM
- [ ] 只使用规则引擎和技能调用
- [ ] 业务数据只在代码中流转

### 技能
- [ ] 只进行HTTP API调用
- [ ] 不使用LLM
- [ ] 数据在内网流转

## 违规案例

### 案例1：使用LLM润色业务数据（❌ 禁止）

```typescript
// ❌ 错误：将业务数据传递给LLM
const response = await llm.chat({
  role: 'user',
  content: `请润色以下数据：\n${JSON.stringify(businessResponse.data)}`
});
```

### 案例2：将业务数据传递给意图识别（❌ 禁止）

```typescript
// ❌ 错误：将业务数据传递给LLM进行意图识别
const messages = [
  {
    role: 'user',
    content: `用户输入：${userInput}\n相关数据：\n${JSON.stringify(businessData)}`
  }
];
```

### 案例3：业务Agent调用LLM（❌ 禁止）

```typescript
// ❌ 错误：业务Agent调用LLM
async execute(): Promise<AgentResponse> {
  const response = await llm.chat({
    role: 'user',
    content: '请帮我处理这个业务...'
  });
  return response;
}
```

## 正确案例

### 案例1：内网代码格式化（✅ 正确）

```typescript
// ✅ 正确：使用内网代码格式化
formatResponse(data: any): string {
  if (Array.isArray(data)) {
    return data.map((item, i) => `${i + 1}. ${item.title}`).join('\n');
  }
  return String(data);
}
```

### 案例2：只传递用户信息（✅ 正确）

```typescript
// ✅ 正确：只传递用户信息
const messages = [
  {
    role: 'user',
    content: `用户输入：${userInput}\n用户ID：${userId}`
  }
];
```

### 案例3：业务Agent纯代码逻辑（✅ 正确）

```typescript
// ✅ 正确：业务Agent纯代码逻辑
async execute(): Promise<AgentResponse> {
  const permission = await this.checkPermission();
  if (!permission.granted) {
    return { code: '403', msg: '无权限' };
  }

  const result = await this.callSkill('todo.list', params);
  return { code: '200', data: result };
}
```

## 总结

1. **RootAgent**：只做意图识别、权限拦截、响应格式化
2. **业务Agent**：纯代码逻辑，不调用LLM
3. **技能**：纯HTTP API调用，不经过LLM
4. **数据安全**：业务数据只在内网流转，不进LLM，零泄密

**核心原则：LLM只接触用户输入，完全不接触业务数据。**
