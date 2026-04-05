# 对话功能快速测试指南

## 测试目的

验证修改后的代码是否解决了"消息消失"的问题。

## 测试场景

### 场景 1: 数据库未连接

**测试步骤**：
1. 确保数据库未连接（可以通过日志确认）
2. 打开普通用户页面：`http://localhost:5000`
3. 在输入框中输入："测试消息"
4. 点击发送按钮
5. 观察界面变化

**预期结果**：
- ✅ 用户消息立即显示在对话区域
- ✅ 输入框被清空
- ✅ 显示"数据库未连接"的黄色警告
- ✅ 警告信息说明：消息已显示但无法保存到历史记录
- ✅ 可以继续输入其他消息

**控制台日志**：
```
[sendMessage] 开始发送消息
[sendMessage] dbConnected: false
[sendMessage] activeKey: 未配置
[sendMessage] 创建新会话
[sendMessage] 添加用户消息: 测试消息
[sendMessage] 数据库未连接
[sendMessage] 发送消息流程结束
```

### 场景 2: API Key 未配置

**测试步骤**：
1. 确保数据库已连接
2. 确保没有配置 API Key
3. 打开普通用户页面
4. 输入："你好"
5. 点击发送

**预期结果**：
- ✅ 用户消息立即显示
- ✅ 显示"API Key 未配置"的蓝色提示
- ✅ 提示信息说明：消息已显示但无法获取 AI 回复

**控制台日志**：
```
[sendMessage] 开始发送消息
[sendMessage] dbConnected: true
[sendMessage] activeKey: 未配置
[sendMessage] 创建新会话
[sendMessage] 添加用户消息: 你好
[sendMessage] API Key 未配置
[sendMessage] 发送消息流程结束
```

### 场景 3: 正常情况（数据库已连接 + API Key 已配置）

**测试步骤**：
1. 确保数据库已连接
2. 确保已配置 API Key
3. 打开普通用户页面
4. 输入："1+1等于几？"
5. 点击发送
6. 观察AI回复

**预期结果**：
- ✅ 用户消息立即显示
- ✅ 显示加载动画
- ✅ AI 逐步回复（流式输出）
- ✅ 最终显示完整的回复
- ✅ 历史记录可以看到这次对话

**控制台日志**：
```
[sendMessage] 开始发送消息
[sendMessage] dbConnected: true
[sendMessage] activeKey: 已配置
[sendMessage] 创建新会话
[sendMessage] 添加用户消息: 1+1等于几？
[sendMessage] 调用 Chat API
[sendMessage] Chat API 响应状态: 200
[sendMessage] 开始读取流式响应
[sendMessage] 收到内容片段: 3 字符
[sendMessage] 收到内容片段: 8 字符
...
[sendMessage] 助手回复完成，总长度: 20 字符
[sendMessage] 发送消息流程结束
```

## 快速诊断脚本

运行以下脚本快速检查系统状态：

```bash
bash diagnose-chat.sh
```

**输出示例**：
```
======================================
对话功能问题诊断
======================================

测试 1: 检查服务运行
✅ 服务运行正常

测试 2: 检查 LLM 配置
{
    "success": false,
    "message": "数据库未连接"
}

测试 3: 检查数据库连接
{
    "success": false,
    "error": "数据库未连接"
}

测试 4: 检查 API Keys
{
    "success": false,
    "error": "数据库未连接"
}

======================================
诊断完成
======================================
```

## 如何修复问题

### 修复数据库连接

**方法 1: 使用环境变量（推荐）**

在部署平台配置以下环境变量：
```bash
DB_HOST=your_mysql_host
DB_PORT=your_mysql_port
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=future_office
```

**方法 2: 手动连接**

1. 访问管理员后台：`http://localhost:5000/admin/database`
2. 点击"初始化数据库"
3. 填写数据库连接信息
4. 点击"连接"

### 配置 API Key

1. 访问管理员后台：`http://localhost:5000/admin/integration/llm`
2. 点击"添加 API 密钥"
3. 选择服务提供商（豆包、OpenAI 等）
4. 填写 API Key
5. 点击"添加"

### 测试对话功能

1. 刷新普通用户页面
2. 输入测试消息
3. 点击发送
4. 验证是否收到回复

## 日志查看

### 查看前端日志

**步骤**：
1. 在浏览器中按 `F12` 打开开发者工具
2. 切换到"Console"标签
3. 发送消息
4. 查看日志输出

### 查看后端日志

```bash
# 查看最近50行日志
tail -n 50 /app/work/logs/bypass/app.log

# 查看错误日志
tail -n 50 /app/work/logs/bypass/app.log | grep -i error

# 查看数据库相关日志
tail -n 100 /app/work/logs/bypass/app.log | grep -i database
```

## 常见问题

### Q: 为什么修改后还是看不到消息？

A: 请检查浏览器控制台是否有JavaScript错误，并查看日志输出。

### Q: 如何确认消息已经显示？

A:
1. 看对话区域是否有用户的消息气泡
2. 看输入框是否被清空
3. 看控制台是否有"[sendMessage] 添加用户消息"日志

### Q: 为什么显示多个错误提示？

A: 如果数据库和API Key都没有配置，会同时显示两个提示，这是正常的。

### Q: 消息会保存到历史记录吗？

A:
- 如果数据库已连接：会保存
- 如果数据库未连接：不会保存，但会显示在当前对话中

## 性能优化建议

### 1. 减少日志输出

在生产环境，可以减少日志输出：

```typescript
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('[sendMessage] ...');
}
```

### 2. 优化消息存储

对于大量消息，考虑使用分页加载：

```typescript
const loadMessages = (sessionId: string, page: number) => {
  // 分页加载消息
};
```

### 3. 添加消息压缩

对于长消息，可以压缩存储：

```typescript
const compressMessage = (content: string) => {
  // 压缩消息内容
};
```

## 总结

**修改前的问题**：
- ❌ 消息会消失
- ❌ 没有错误提示
- ❌ 用户体验差

**修改后的改进**：
- ✅ 消息立即显示
- ✅ 清晰的错误提示
- ✅ 改善用户体验
- ✅ 详细的日志输出

---

**创建日期**: 2026-04-05
**最后更新**: 2026-04-05
**版本**: v1.0
