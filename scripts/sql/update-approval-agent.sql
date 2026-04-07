-- ================================================
-- AI 智能审批 Agent 权限规则配置脚本
-- 更新审批 Agent 的 permission_rules 字段
-- ================================================

-- 检查 agents 表是否存在，如果不存在则创建
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(36) PRIMARY KEY,
  agent_code VARCHAR(100) UNIQUE NOT NULL COMMENT 'Agent代码',
  agent_name VARCHAR(200) NOT NULL COMMENT 'Agent名称',
  agent_type VARCHAR(50) NOT NULL COMMENT 'Agent类型（root/business）',
  description TEXT COMMENT 'Agent描述',
  system_prompt TEXT COMMENT '系统提示词',
  permission_rules JSON COMMENT '权限规则',
  business_rules JSON COMMENT '业务规则',
  enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_agent_code (agent_code),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Agent表';

-- 插入审批 Agent（如果不存在）
INSERT IGNORE INTO agents (id, agent_code, agent_name, agent_type, description, enabled) VALUES
(
  UUID(),
  'approval-agent',
  '审批Agent',
  'business',
  'AI智能审批Agent，支持自然语言发起审批、自动审批、进度跟踪等功能',
  TRUE
);

-- 更新审批 Agent 的权限规则和业务规则
UPDATE agents
SET
  system_prompt = '你是AI智能审批Agent，负责处理各类审批业务。你可以理解用户的自然语言请求，自动生成审批表单、匹配审批流程、发起审批流程，并支持自动审批、进度跟踪、催办等功能。',
  permission_rules = JSON_OBJECT(
    'conditions', JSON_OBJECT(
      'requireLogin', TRUE,
      'requireRole', JSON_ARRAY('employee', 'manager', 'admin')
    ),
    'dataScope', JSON_OBJECT(
      'query', 'self',
      'create', 'self',
      'approve', 'assigned',
      'autoApprove', 'rule_based'
    ),
    'actions', JSON_OBJECT(
      'allow', JSON_ARRAY('launch_approval', 'query', 'detail', 'track_progress', 'auto_approve'),
      'deny', JSON_ARRAY('viewOther', 'delete', 'transfer')
    ),
    'autoApproveConfig', JSON_OBJECT(
      'enable', TRUE,
      'allowTypes', JSON_ARRAY('leave', 'reimbursement', 'purchase'),
      'maxAmount', 5000,
      'requireDeptApproval', TRUE
    )
  ),
  business_rules = JSON_ARRAY(
    JSON_OBJECT(
      'step', 'validate_request',
      'action', 'check_params',
      'description', '验证请求参数'
    ),
    JSON_OBJECT(
      'step', 'permission_check',
      'action', 'run_permission_rules',
      'description', '执行权限规则检查'
    ),
    JSON_OBJECT(
      'step', 'generate_form',
      'action', 'invoke_skill',
      'skillCode', 'generate_approval_form',
      'description', '调用生成表单技能'
    ),
    JSON_OBJECT(
      'step', 'match_flow',
      'action', 'invoke_skill',
      'skillCode', 'match_approval_flow',
      'description', '调用匹配流程技能'
    ),
    JSON_OBJECT(
      'step', 'launch_approval',
      'action', 'invoke_skill',
      'skillCode', 'ekp_launch_approval',
      'description', '调用发起审批技能'
    ),
    JSON_OBJECT(
      'step', 'auto_approve_check',
      'action', 'run_auto_approve_rules',
      'description', '执行自动审批规则检查'
    ),
    JSON_OBJECT(
      'step', 'execute_auto_approve',
      'action', 'invoke_skill',
      'skillCode', 'ekp_auto_approve',
      'description', '调用自动审批技能'
    ),
    JSON_OBJECT(
      'step', 'track_progress',
      'action', 'invoke_skill',
      'skillCode', 'track_approval_progress',
      'description', '调用跟踪进度技能'
    ),
    JSON_OBJECT(
      'step', 'send_reminder',
      'action', 'invoke_skill',
      'skillCode', 'send_approval_reminder',
      'description', '调用发送催办技能'
    ),
    JSON_OBJECT(
      'step', 'generate_minutes',
      'action', 'invoke_skill',
      'skillCode', 'generate_approval_minutes',
      'description', '调用生成纪要技能'
    ),
    JSON_OBJECT(
      'step', 'sync_data',
      'action', 'invoke_skill',
      'skillCode', 'sync_oa_data',
      'description', '调用同步数据技能'
    ),
    JSON_OBJECT(
      'step', 'format_response',
      'action', 'format_data',
      'description', '格式化响应数据'
    )
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE agent_code = 'approval-agent';

-- 查询更新结果
SELECT
  agent_code AS 'Agent代码',
  agent_name AS 'Agent名称',
  JSON_EXTRACT(permission_rules, '$.actions.allow') AS '允许操作',
  JSON_EXTRACT(permission_rules, '$.autoApproveConfig') AS '自动审批配置'
FROM agents
WHERE agent_code = 'approval-agent';
