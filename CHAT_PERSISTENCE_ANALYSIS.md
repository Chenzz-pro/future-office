# 对话持久化分析与实施方案

## 当前状态分析

### 1. 数据库层 ✅ 已完成

**数据库表结构**：
- `chat_sessions` - 对话会话表
- `chat_messages` - 对话消息表

**表定义**：
```sql
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    title VARCHAR(500) NOT NULL COMMENT '会话标题',
    agent_id VARCHAR(36) COMMENT '使用的智能体ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL COMMENT '会话ID',
    role ENUM('user', 'assistant', 'system') NOT NULL COMMENT '角色',
    content TEXT NOT NULL COMMENT '消息内容',
    metadata JSON COMMENT '元数据（如技能调用、token使用等）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);
```

### 2. Repository 层 ✅ 已完成

**文件位置**：`src/lib/database/repositories/chatsession.repository.ts`

**实现的方法**：
- ✅ `create(session)` - 创建会话
- ✅ `findById(id)` - 查找会话
- ✅ `findByUserId(userId, limit)` - 获取用户的所有会话
- ✅ `update(id, updates)` - 更新会话
- ✅ `delete(id)` - 删除会话（级联删除消息）
- ✅ `getMessages(sessionId)` - 获取会话的所有消息
- ✅ `addMessage(message)` - 添加消息
- ✅ `deleteMessage(id)` - 删除消息

### 3. API 层 ❌ 未实现

**当前状态**：
- ❌ 没有会话管理的 API 接口
- ✅ 只有 LLM 调用的 API：`/api/chat`

**缺失的接口**：
- `GET /api/chat/sessions` - 获取用户的所有会话
- `POST /api/chat/sessions` - 创建新会话
- `GET /api/chat/sessions/[id]` - 获取指定会话
- `PUT /api/chat/sessions/[id]` - 更新会话
- `DELETE /api/chat/sessions/[id]` - 删除会话
- `GET /api/chat/sessions/[id]/messages` - 获取会话消息
- `POST /api/chat/sessions/[id]/messages` - 添加消息

### 4. 前端层 ❌ 使用 localStorage

**当前实现**：
- `useChatHistory` hook 使用 localStorage
- 数据没有持久化到数据库
- 多端同步不支持

**问题**：
- ❌ 数据只保存在浏览器本地
- ❌ 切换设备后数据丢失
- ❌ 清除浏览器数据会丢失历史记录
- ❌ 无法实现多端同步

## 可行性分析

### 技术可行性 ✅ 完全可行

**已经完成的部分**：
1. ✅ 数据库表结构设计完成
2. ✅ Repository 层实现完成
3. ✅ 外键约束和级联删除已设置

**需要实现的部分**：
1. ⏳ API 层（会话管理接口）
2. ⏳ 前端 Hook 改造（使用 API 替代 localStorage）
3. ⏳ 用户认证集成（确定当前用户ID）

### 实施难度评估

**难度等级**：中等

**工作量估算**：
- API 开发：2-3 小时
- 前端改造：3-4 小时
- 测试与调试：1-2 小时
- **总计**：6-9 小时

### 潜在风险

1. **用户ID获取**
   - 当前使用 localStorage 获取用户ID
   - 需要确保每个请求都能正确获取用户ID

2. **数据迁移**
   - 现有 localStorage 数据需要迁移到数据库
   - 需要提供迁移工具

3. **降级策略**
   - 数据库连接失败时需要降级到 localStorage
   - 确保用户数据不丢失

## 实施方案

### 方案架构

```
前端 (useChatHistory Hook)
    ↓
API 层 (/api/chat/sessions)
    ↓
Repository 层 (ChatSessionRepository)
    ↓
数据库 (chat_sessions, chat_messages)
```

### 详细实施步骤

#### 步骤 1: 创建 API 接口

**文件结构**：
```
src/app/api/chat/
├── route.ts (已存在 - LLM 调用)
├── sessions/
│   ├── route.ts (会话列表和创建)
│   └── [id]/
│       ├── route.ts (会话详情、更新、删除)
│       └── messages/
│           └── route.ts (消息列表和添加)
```

**API 接口设计**：

1. **获取会话列表**
   ```
   GET /api/chat/sessions
   Response: { success: true, data: ChatSession[] }
   ```

2. **创建会话**
   ```
   POST /api/chat/sessions
   Body: { title, model, provider }
   Response: { success: true, data: ChatSession }
   ```

3. **获取会话详情**
   ```
   GET /api/chat/sessions/[id]
   Response: { success: true, data: { session, messages } }
   ```

4. **更新会话**
   ```
   PUT /api/chat/sessions/[id]
   Body: { title? }
   Response: { success: true, data: ChatSession }
   ```

5. **删除会话**
   ```
   DELETE /api/chat/sessions/[id]
   Response: { success: true }
   ```

6. **添加消息**
   ```
   POST /api/chat/sessions/[id]/messages
   Body: { role, content, metadata? }
   Response: { success: true, data: ChatMessage }
   ```

#### 步骤 2: 改造前端 Hook

**文件**：`src/hooks/use-chat-history.ts`

**改造方案**：
1. 添加 API 调用函数
2. 实现降级策略（数据库失败时使用 localStorage）
3. 保持接口不变，内部实现替换

**示例代码**：
```typescript
const createSession = useCallback(async (model: string, provider: string): Promise<ChatSession> => {
  try {
    const response = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新对话', model, provider }),
    });

    const data = await response.json();
    if (data.success) {
      return data.data;
    }
    throw new Error('创建会话失败');
  } catch (error) {
    console.error('API 调用失败，使用 localStorage 降级:', error);
    // 降级到 localStorage
    return createSessionLocal(model, provider);
  }
}, []);
```

#### 步骤 3: 实现数据迁移

**迁移脚本**：
```typescript
// 读取 localStorage 数据
const localSessions = localStorage.getItem('chat-sessions');

if (localSessions) {
  const sessions = JSON.parse(localSessions);
  
  // 逐个迁移到数据库
  for (const session of sessions) {
    // 创建会话
    await fetch('/api/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
    
    // 添加消息
    for (const message of session.messages) {
      await fetch(`/api/chat/sessions/${session.id}/messages`, {
        method: 'POST',
        body: JSON.stringify(message),
      });
    }
  }
  
  // 清空 localStorage
  localStorage.removeItem('chat-sessions');
}
```

#### 步骤 4: 添加用户认证集成

**问题**：如何获取当前用户ID？

**解决方案**：
1. 从 localStorage 读取当前用户ID
2. 在 API 请求中添加用户ID
3. 后端验证用户权限

**示例代码**：
```typescript
const getCurrentUserId = (): string => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  return currentUser?.id || 'default-user';
};

// API 调用
fetch('/api/chat/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-ID': getCurrentUserId(),
  },
  body: JSON.stringify({ ... }),
});
```

#### 步骤 5: 实现降级策略

**降级条件**：
- 数据库未连接
- API 调用失败
- 网络错误

**降级方案**：
1. 自动降级到 localStorage
2. 显示降级提示
3. 定期重试同步

**示例代码**：
```typescript
const addMessage = useCallback(async (sessionId: string, message: Message) => {
  try {
    // 尝试保存到数据库
    await fetch(`/api/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    });
    
    // 更新本地状态
    addMessageLocal(sessionId, message);
  } catch (error) {
    console.error('保存到数据库失败，使用 localStorage:', error);
    // 降级到 localStorage
    addMessageLocal(sessionId, message);
    // 标记为待同步
    markAsPendingSync(sessionId, message);
  }
}, []);
```

## 优势对比

### 使用 localStorage（当前）

**优点**：
- ✅ 简单快速
- ✅ 不依赖网络
- ✅ 响应速度快

**缺点**：
- ❌ 数据只保存在本地
- ❌ 切换设备数据丢失
- ❌ 清除浏览器数据丢失
- ❌ 无法多端同步
- ❌ 无法分享会话

### 使用数据库（目标）

**优点**：
- ✅ 数据持久化
- ✅ 支持多端同步
- ✅ 数据不丢失
- ✅ 可以分享会话
- ✅ 支持团队协作
- ✅ 可以做数据分析

**缺点**：
- ⚠️ 依赖网络
- ⚠️ 需要服务器
- ⚠️ 响应速度稍慢

## 推荐方案

### 分阶段实施

**阶段 1: 基础持久化**
- 实现数据库存储
- 保持降级到 localStorage
- 数据迁移工具

**阶段 2: 完整同步**
- 移除 localStorage
- 完全使用数据库
- 实时同步

**阶段 3: 高级功能**
- 多端同步
- 会话分享
- 团队协作
- 数据分析

### 优先级

**高优先级**：
1. API 接口开发
2. 前端 Hook 改造
3. 降级策略实现

**中优先级**：
4. 数据迁移工具
5. 用户认证集成

**低优先级**：
6. 多端同步
7. 会话分享
8. 数据分析

## 总结

**当前状态**：
- ✅ 数据库层已完整
- ✅ Repository 层已实现
- ❌ API 层缺失
- ❌ 前端使用 localStorage

**可行性**：
- ✅ 技术上完全可行
- ✅ 基础设施已完备
- ✅ 实施难度中等

**建议**：
1. 立即实施：API 接口开发
2. 紧接着：前端 Hook 改造
3. 同时进行：降级策略
4. 最后：数据迁移

**预期效果**：
- 数据完全持久化
- 支持多端同步
- 不丢失数据
- 提升用户体验

---

**创建日期**: 2026-04-05
**状态**: 待实施
**优先级**: 高
