-- ================================================
-- AI 智能审批技能配置脚本
-- 插入 10 个新技能到 custom_skills 表
-- ================================================

-- 检查 custom_skills 表是否存在，如果不存在则创建
CREATE TABLE IF NOT EXISTS custom_skills (
  id VARCHAR(36) PRIMARY KEY,
  skill_code VARCHAR(100) UNIQUE NOT NULL COMMENT '技能代码',
  skill_name VARCHAR(200) NOT NULL COMMENT '技能名称',
  api_path VARCHAR(255) NOT NULL COMMENT 'API路径',
  method VARCHAR(10) NOT NULL COMMENT 'HTTP方法（GET/POST/PUT/DELETE）',
  description TEXT COMMENT '技能描述',
  category VARCHAR(50) DEFAULT 'custom' COMMENT '技能分类',
  enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  user_id VARCHAR(36) COMMENT '所属用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_skill_code (skill_code),
  INDEX idx_enabled (enabled),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='自定义技能表';

-- 插入 10 个审批相关技能
INSERT INTO custom_skills (id, skill_code, skill_name, api_path, method, description, category, enabled) VALUES
-- 1. 生成审批表单
(UUID(), 'generate_approval_form', '生成审批表单', '/api/approval/form/generate', 'POST', '自动生成EKP审批表单，根据审批类型获取模板并自动填充字段', 'approval', TRUE),

-- 2. 匹配审批流程
(UUID(), 'match_approval_flow', '匹配审批流程', '/api/approval/flow/match', 'POST', '自动匹配审批节点，根据类型、金额、部门动态计算审批流程', 'approval', TRUE),

-- 3. 发起EKP审批
(UUID(), 'ekp_launch_approval', '发起EKP审批', '/api/approval/launch', 'POST', '封装发起EKP流程接口，传入表单数据和流程节点', 'approval', TRUE),

-- 4. 检查自动审批规则
(UUID(), 'run_auto_approve_rules', '检查自动审批', '/api/approval/auto-approve/check', 'POST', '判断是否可以自动审批，根据类型、金额检查规则', 'approval', TRUE),

-- 5. 执行EKP自动审批
(UUID(), 'ekp_auto_approve', '执行EKP自动通过', '/api/approval/auto-approve/execute', 'POST', '调用EKP同意接口，执行自动审批操作', 'approval', TRUE),

-- 6. 跟踪审批进度
(UUID(), 'track_approval_progress', '跟踪审批进度', '/api/approval/progress/track', 'POST', '查询审批状态和进度，识别超时节点', 'approval', TRUE),

-- 7. 发送超时催办
(UUID(), 'send_approval_reminder', '发送超时催办', '/api/approval/reminder/send', 'POST', '自动提醒审批人，支持钉钉/企业微信/邮件', 'approval', TRUE),

-- 8. 生成审批纪要
(UUID(), 'generate_approval_minutes', '生成审批纪要', '/api/approval/minutes/generate', 'POST', '自动生成审批纪要，记录审批过程和结果', 'approval', TRUE),

-- 9. 同步OA数据
(UUID(), 'sync_oa_data', '同步OA数据', '/api/approval/data/sync', 'POST', '同步EKP数据（考勤/费用/库存）到系统', 'approval', TRUE),

-- 10. 语音转文字
(UUID(), 'voice_to_text', '语音转文字', '/api/approval/voice/transcribe', 'POST', '支持语音发起审批，将语音转换为文字', 'approval', TRUE);

-- 查询插入结果
SELECT
  skill_code AS '技能代码',
  skill_name AS '技能名称',
  api_path AS 'API路径',
  description AS '描述'
FROM custom_skills
WHERE category = 'approval'
ORDER BY skill_code;
