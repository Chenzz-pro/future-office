# AI 智能审批系统部署指南

## 📋 概述

AI 智能审批系统是未来办公系统的核心模块，支持自然语言发起审批、自动审批、进度跟踪、催办提醒等功能。系统基于 Next.js 16、TypeScript 5、MySQL 构建，完全遵循业务接口标准规范。

## ✨ 核心功能

- ✅ **自然语言发起审批** - 支持口语化描述，AI 自动理解并生成表单
- ✅ **自动审批** - 基于规则引擎，自动处理符合条件的审批（≤5000元）
- ✅ **流程匹配** - 根据类型、金额、部门动态计算审批流程
- ✅ **进度跟踪** - 实时查询审批进度，自动识别超时节点
- ✅ **自动催办** - 超时自动发送提醒（钉钉/企业微信/邮件）
- ✅ **审批纪要** - 自动生成审批纪要，记录完整过程
- ✅ **数据同步** - 自动同步 EKP 数据（考勤/费用/库存）
- ✅ **语音审批** - 支持语音发起审批，语音转文字

## 🏗️ 系统架构

```
用户 → RootAgent（意图识别） → ApprovalAgent（审批处理）
                                    ↓
                            CustomSkillExecutor（技能执行）
                                    ↓
                        10个技能接口（封装EKP接口）
```

## 📁 目录结构

```
src/
├── agents/
│   └── approval-agent.ts              # 审批Agent核心代码
├── lib/
│   ├── approval/
│   │   ├── auto-approve-engine.ts     # 自动审批规则引擎
│   │   ├── form-generator.ts          # 表单生成工具
│   │   ├── flow-matcher.ts            # 流程匹配工具
│   │   └── formatter.ts               # 响应格式化工具
│   └── custom-skill-executor.ts       # 技能执行器（现有）
└── app/
    └── api/
        └── approval/
            ├── form/
            │   └── generate/
            │       └── route.ts       # 生成审批表单
            ├── flow/
            │   └── match/
            │       └── route.ts       # 匹配审批流程
            ├── launch/
            │   └── route.ts           # 发起EKP审批
            ├── auto-approve/
            │   ├── check/
            │   │   └── route.ts       # 检查自动审批规则
            │   └── execute/
            │       └── route.ts       # 执行自动审批
            ├── progress/
            │   └── track/
            │       └── route.ts       # 跟踪审批进度
            ├── reminder/
            │   └── send/
            │       └── route.ts       # 发送催办提醒
            ├── minutes/
            │   └── generate/
            │       └── route.ts       # 生成审批纪要
            ├── data/
            │   └── sync/
            │       └── route.ts       # 同步OA数据
            └── voice/
                └── transcribe/
                    └── route.ts       # 语音转文字
```

## 🚀 部署步骤

### 1. 环境准备

确保以下环境已配置：
- Node.js 24+
- MySQL 5.7+
- pnpm（包管理器）

### 2. 执行SQL脚本

#### 2.1 插入10个技能

```bash
mysql -u root -p future_office < scripts/sql/insert-approval-skills.sql
```

#### 2.2 更新审批Agent配置

```bash
mysql -u root -p future_office < scripts/sql/update-approval-agent.sql
```

### 3. 安装依赖

```bash
pnpm install
```

### 4. 类型检查

```bash
pnpm ts-check
```

### 5. 启动开发服务

```bash
pnpm dev
# 或
coze dev
```

服务将在 `http://localhost:5000` 启动。

### 6. 测试接口

```bash
# 赋予执行权限
chmod +x scripts/test-approval-api.sh

# 运行测试
./scripts/test-approval-api.sh
```

## 🔧 技能接口列表

| 技能代码 | 技能名称 | API路径 | 说明 |
|---------|---------|---------|------|
| generate_approval_form | 生成审批表单 | POST /api/approval/form/generate | 自动生成EKP审批表单 |
| match_approval_flow | 匹配审批流程 | POST /api/approval/flow/match | 动态匹配审批节点 |
| ekp_launch_approval | 发起EKP审批 | POST /api/approval/launch | 封装发起EKP流程 |
| run_auto_approve_rules | 检查自动审批 | POST /api/approval/auto-approve/check | 判断是否自动通过 |
| ekp_auto_approve | 执行EKP自动通过 | POST /api/approval/auto-approve/execute | 调用EKP同意接口 |
| track_approval_progress | 跟踪审批进度 | POST /api/approval/progress/track | 查询审批状态 |
| send_approval_reminder | 发送超时催办 | POST /api/approval/reminder/send | 自动提醒审批人 |
| generate_approval_minutes | 生成审批纪要 | POST /api/approval/minutes/generate | 自动生成纪要 |
| sync_oa_data | 同步OA数据 | POST /api/approval/data/sync | 同步考勤/费用/库存 |
| voice_to_text | 语音转文字 | POST /api/approval/voice/transcribe | 支持语音发起审批 |

## 📊 自动审批规则

### 规则配置存储位置

规则存储在 `agents` 表的 `permission_rules.autoApproveConfig` 字段。

### 默认配置

```json
{
  "enable": true,
  "allowTypes": ["leave", "reimbursement", "purchase"],
  "maxAmount": 5000,
  "requireDeptApproval": true
}
```

### 规则说明

- `enable`: 是否启用自动审批
- `allowTypes`: 允许自动审批的类型（请假、报销、采购）
- `maxAmount`: 最大金额限制（5000元）
- `requireDeptApproval`: 是否需要部门审批

### 规则修改

通过以下SQL修改规则：

```sql
UPDATE agents
SET permission_rules = JSON_SET(
  permission_rules,
  '$.autoApproveConfig.maxAmount', 10000
)
WHERE agent_code = 'approval-agent';
```

## 🔄 完整调用流程

### 示例：用户发起报销审批

```
1. 用户说："我要报销5000元办公耗材"

2. RootAgent 意图识别：
   - agentId: "approval-agent"
   - action: "launch_approval"
   - params: { approval_type: "reimbursement", amount: 5000 }

3. ApprovalAgent 执行：
   a. 权限检查 ✓
   b. 生成表单（generate_approval_form）
   c. 匹配流程（match_approval_flow）
   d. 发起审批（ekp_launch_approval）
   e. 检查自动审批（run_auto_approve_rules）
   f. 执行自动审批（ekp_auto_approve）✓

4. 返回结果：
   "✅ 已自动发起并通过审批，单号：REQ_1234567890"
```

## 🧪 测试用例

### 测试1：自动审批（≤5000元）

```bash
curl -X POST http://localhost:5000/api/approval/launch \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {"applicantId": "user1"},
    "flowNodes": ["dept_manager"],
    "userId": "user1"
  }'
```

### 测试2：人工审批（>5000元）

```bash
curl -X POST http://localhost:5000/api/approval/auto-approve/check \
  -H "Content-Type: application/json" \
  -d '{
    "autoApproveConfig": {
      "enable": true,
      "allowTypes": ["leave"],
      "maxAmount": 5000
    },
    "approval_type": "reimbursement",
    "amount": 6000
  }'
```

### 测试3：进度跟踪

```bash
curl -X POST http://localhost:5000/api/approval/progress/track \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "REQ_1234567890",
    "userId": "user1"
  }'
```

## 🔒 权限配置

### 数据权限

- `query`: self - 只能查询自己的审批
- `create`: self - 只能发起自己的审批
- `approve`: assigned - 只能审批分配给自己的审批
- `autoApprove`: rule_based - 基于规则自动审批

### 操作权限

**允许操作：**
- launch_approval - 发起审批
- query - 查询审批
- track_progress - 跟踪进度
- auto_approve - 自动审批

**禁止操作：**
- viewOther - 查看他人审批
- delete - 删除审批
- transfer - 转移审批

## 📝 待办事项

- [ ] 集成EKP REST客户端（替换模拟数据）
- [ ] 实现消息发送服务（钉钉/企业微信/邮件）
- [ ] 实现语音识别服务（阿里云/腾讯云）
- [ ] 添加定时催办任务
- [ ] 完善审批统计报表
- [ ] 添加审批模板管理
- [ ] 支持附件上传
- [ ] 支持审批抄送

## 🐛 常见问题

### Q1: 自动审批不生效？

**A:** 检查以下配置：
1. `agents.permission_rules.autoApproveConfig.enable` 是否为 `true`
2. 审批类型是否在 `allowTypes` 中
3. 金额是否超过 `maxAmount`

### Q2: 流程节点不正确？

**A:** 检查 `FlowMatcher` 类中的流程匹配逻辑，确保：
1. 审批类型正确识别
2. 金额判断逻辑正确
3. 部门参数正确传递

### Q3: EKP接口调用失败？

**A:** 检查以下配置：
1. EKP配置是否正确（`ekp_configs` 表）
2. 网络是否连通
3. 认证信息是否正确

## 📞 技术支持

如有问题，请联系技术团队或查看相关文档：
- 业务接口标准规范：`BUSINESS_API_STANDARDS.md`
- 业务接口开发指南：`BUSINESS_API_GUIDE.md`
- AGENTS.md：项目规范文档

---

**部署完成后，系统将支持完整的AI智能审批流程！** 🎉
