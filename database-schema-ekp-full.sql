-- ============================================
-- EKP接口管理中心 - 完整初始化脚本
-- 包含：表结构 + 初始数据
-- ============================================

-- ============================================
-- 1. EKP官方接口表
-- ============================================
CREATE TABLE IF NOT EXISTS ekp_official_interfaces (
  id VARCHAR(36) PRIMARY KEY COMMENT '接口ID',
  code VARCHAR(100) NOT NULL UNIQUE COMMENT '接口代码（唯一标识）',
  name VARCHAR(200) NOT NULL COMMENT '接口名称',
  description TEXT COMMENT '接口描述',
  category VARCHAR(50) NOT NULL COMMENT '接口分类',
  endpoint VARCHAR(500) NOT NULL COMMENT '接口路径',
  method VARCHAR(10) NOT NULL COMMENT 'HTTP方法（GET/POST/PUT/DELETE）',
  enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用（1=启用，0=禁用）',
  metadata JSON COMMENT '接口元数据（参数、响应示例等）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_code (code),
  INDEX idx_category (category),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP官方接口表';

-- ============================================
-- 2. 插入初始数据（19个官方接口）
-- ============================================

-- 工作流相关接口
INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-001', 'ekp.workflow.todo.list', '查询待办列表', '查询当前用户的待办事项列表', 'workflow', '/api/sys-notify/sysNotifyTodoRestService/getTodo', 'POST', 1, JSON_OBJECT(
  'params', JSON_ARRAY('todoType'),
  'todoTypeOptions', JSON_OBJECT(
    '-1', '已办',
    '0', '所有待办',
    '1', '审批类',
    '2', '通知类',
    '3', '暂挂类',
    '13', '审批+暂挂'
  ),
  'responseExample', JSON_OBJECT(
    'count', 5,
    'todos', JSON_ARRAY()
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-002', 'ekp.workflow.todo.detail', '查询待办详情', '查询单个待办事项的详细信息', 'workflow', '/api/workflow/todo/detail', 'GET', 1, JSON_OBJECT(
  'params', JSON_ARRAY('todoId'),
  'responseExample', JSON_OBJECT(
    'id', 'xxx',
    'title', '待办标题',
    'status', 'pending',
    'createTime', '2024-01-01 10:00:00'
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-003', 'ekp.workflow.todo.approve', '审批同意', '同意当前待办事项', 'workflow', '/api/workflow/approve', 'POST', 1, JSON_OBJECT(
  'params', JSON_ARRAY('todoId', 'comment'),
  'responseExample', JSON_OBJECT(
    'success', true,
    'message', '审批成功'
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-004', 'ekp.workflow.todo.reject', '审批拒绝', '拒绝当前待办事项', 'workflow', '/api/workflow/reject', 'POST', 1, JSON_OBJECT(
  'params', JSON_ARRAY('todoId', 'comment'),
  'responseExample', JSON_OBJECT(
    'success', true,
    'message', '已拒绝'
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-005', 'ekp.workflow.process.start', '发起流程', '发起新的审批流程', 'workflow', '/api/workflow/process/start', 'POST', 1, JSON_OBJECT(
  'params', JSON_ARRAY('processId', 'formData'),
  'responseExample', JSON_OBJECT(
    'success', true,
    'processId', 'xxx',
    'message', '流程发起成功'
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-006', 'ekp.workflow.process.list', '查询流程列表', '查询用户的流程列表', 'workflow', '/api/workflow/process/list', 'GET', 1, JSON_OBJECT(
  'params', JSON_ARRAY('status'),
  'responseExample', JSON_OBJECT(
    'total', 10,
    'list', JSON_ARRAY()
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-007', 'ekp.workflow.process.detail', '查询流程详情', '查询单个流程的详细信息', 'workflow', '/api/workflow/process/detail', 'GET', 1, JSON_OBJECT(
  'params', JSON_ARRAY('processId'),
  'responseExample', JSON_OBJECT(
    'id', 'xxx',
    'status', 'running',
    'currentNode', '部门经理审批',
    'nodes', JSON_ARRAY()
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-008', 'ekp.workflow.process.history', '查询流程历史', '查询流程的历史记录', 'workflow', '/api/workflow/process/history', 'GET', 1, JSON_OBJECT(
  'params', JSON_ARRAY('processId'),
  'responseExample', JSON_OBJECT(
    'processId', 'xxx',
    'history', JSON_ARRAY()
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 表单相关接口
INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-009', 'ekp.form.list', '查询表单列表', '查询可用的表单列表', 'form', '/api/form/list', 'GET', 1, JSON_OBJECT(
  'params', JSON_ARRAY('category'),
  'responseExample', JSON_OBJECT(
    'total', 20,
    'list', JSON_ARRAY()
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-010', 'ekp.form.detail', '查询表单详情', '查询单个表单的详细信息', 'form', '/api/form/detail', 'GET', 1, JSON_OBJECT(
  'params', JSON_ARRAY('formId'),
  'responseExample', JSON_OBJECT(
    'id', 'xxx',
    'name', '请假申请',
    'fields', JSON_ARRAY()
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-011', 'ekp.form.data.query', '查询表单数据', '查询表单数据', 'form', '/api/form/data/query', 'GET', 1, JSON_OBJECT(
  'params', JSON_ARRAY('formId', 'filters'),
  'responseExample', JSON_OBJECT(
    'total', 10,
    'list', JSON_ARRAY()
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-012', 'ekp.form.data.create', '创建表单数据', '创建新的表单数据', 'form', '/api/form/data/create', 'POST', 1, JSON_OBJECT(
  'params', JSON_ARRAY('formId', 'formData'),
  'responseExample', JSON_OBJECT(
    'success', true,
    'dataId', 'xxx'
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-013', 'ekp.form.data.update', '更新表单数据', '更新已有的表单数据', 'form', '/api/form/data/update', 'POST', 1, JSON_OBJECT(
  'params', JSON_ARRAY('dataId', 'formData'),
  'responseExample', JSON_OBJECT(
    'success', true,
    'message', '更新成功'
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 会议相关接口
INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-014', 'ekp.meeting.list', '查询会议列表', '查询会议列表', 'meeting', '/api/meeting/list', 'GET', 1, JSON_OBJECT(
  'params', JSON_ARRAY('startDate', 'endDate'),
  'responseExample', JSON_OBJECT(
    'total', 5,
    'list', JSON_ARRAY()
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-015', 'ekp.meeting.detail', '查询会议详情', '查询单个会议的详细信息', 'meeting', '/api/meeting/detail', 'GET', 1, JSON_OBJECT(
  'params', JSON_ARRAY('meetingId'),
  'responseExample', JSON_OBJECT(
    'id', 'xxx',
    'title', '部门例会',
    'startTime', '2024-01-01 10:00:00',
    'endTime', '2024-01-01 11:00:00',
    'participants', JSON_ARRAY()
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-016', 'ekp.meeting.create', '创建会议', '创建新会议', 'meeting', '/api/meeting/create', 'POST', 1, JSON_OBJECT(
  'params', JSON_ARRAY('title', 'startTime', 'endTime', 'participants'),
  'responseExample', JSON_OBJECT(
    'success', true,
    'meetingId', 'xxx'
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-017', 'ekp.meeting.update', '更新会议', '更新会议信息', 'meeting', '/api/meeting/update', 'POST', 1, JSON_OBJECT(
  'params', JSON_ARRAY('meetingId', 'meetingData'),
  'responseExample', JSON_OBJECT(
    'success', true,
    'message', '更新成功'
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-018', 'ekp.meeting.cancel', '取消会议', '取消会议', 'meeting', '/api/meeting/cancel', 'POST', 1, JSON_OBJECT(
  'params', JSON_ARRAY('meetingId'),
  'responseExample', JSON_OBJECT(
    'success', true,
    'message', '已取消'
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 系统相关接口
INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
('ekp-019', 'ekp.system.user.info', '查询用户信息', '查询当前用户的EKP信息', 'system', '/api/system/user/info', 'GET', 1, JSON_OBJECT(
  'responseExample', JSON_OBJECT(
    'userId', 'xxx',
    'userName', '张三',
    'deptName', '技术部',
    'email', 'zhangsan@example.com'
  )
)) ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 验证初始化结果
SELECT
  'EKP官方接口表初始化完成' AS status,
  COUNT(*) AS interface_count,
  GROUP_CONCAT(DISTINCT category) AS categories
FROM ekp_official_interfaces;
