-- ============================================
-- 插入EKP官方接口初始数据
-- ============================================

-- 待办类接口
INSERT INTO ekp_official_interfaces (
  id, interface_code, interface_name, interface_category,
  api_path, service_id, http_method, request_template,
  response_parser, description, version, enabled, is_system
) VALUES
(
  UUID(), 'todo.getTodo', '获取待办数量', '通知',
  '/api/sys-notify/sysNotifyTodoRestService/getTodo',
  'sysNotifyTodoRestService', 'POST',
  '{"type": -1}',
  '{"successPath": "returnState == 2", "dataPath": "message"}',
  '获取当前用户的待办数量', '10.0', TRUE, TRUE
),
(
  UUID(), 'todo.getList', '获取待办列表', '通知',
  '/api/sys-notify/sysNotifyTodoRestService/getTodoList',
  'sysNotifyTodoRestService', 'POST',
  '{"pageIndex": 1, "pageSize": 20, "type": -1}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '获取当前用户的待办列表', '10.0', TRUE, TRUE
),
(
  UUID(), 'todo.getDone', '获取已办列表', '通知',
  '/api/sys-notify/sysNotifyTodoRestService/getTodoList',
  'sysNotifyTodoRestService', 'POST',
  '{"pageIndex": 1, "pageSize": 20, "type": -1}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '获取当前用户的已办列表', '10.0', TRUE, TRUE
),
(
  UUID(), 'todo.getSuspended', '获取暂挂列表', '通知',
  '/api/sys-notify/sysNotifyTodoRestService/getTodoList',
  'sysNotifyTodoRestService', 'POST',
  '{"pageIndex": 1, "pageSize": 20, "type": 3}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '获取当前用户的暂挂列表', '10.0', TRUE, TRUE
);

-- 流程类接口
INSERT INTO ekp_official_interfaces (
  id, interface_code, interface_name, interface_category,
  api_path, service_id, http_method, request_template,
  response_parser, description, version, enabled, is_system
) VALUES
(
  UUID(), 'flow.launch', '发起流程', '流程',
  '/api/sys/workflow/sysWorkflowRestService/launchFlow',
  'sysWorkflowRestService', 'POST',
  '{"templateId": "", "formValues": {}}',
  '{"successPath": "returnState == 2", "dataPath": "data.fdId"}',
  '发起一个新的流程实例', '10.0', TRUE, TRUE
),
(
  UUID(), 'flow.progress', '查询流程进度', '流程',
  '/api/sys/workflow/sysWorkflowRestService/getFlowProgress',
  'sysWorkflowRestService', 'POST',
  '{"fdId": ""}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '查询流程的审批进度', '10.0', TRUE, TRUE
),
(
  UUID(), 'flow.approve', '审批流程', '流程',
  '/api/sys/workflow/sysWorkflowRestService/approve',
  'sysWorkflowRestService', 'POST',
  '{"fdId": "", "opinion": "", "action": ""}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '审批或拒绝流程', '10.0', TRUE, TRUE
),
(
  UUID(), 'flow.cancel', '取消流程', '流程',
  '/api/sys/workflow/sysWorkflowRestService/cancel',
  'sysWorkflowRestService', 'POST',
  '{"fdId": "", "reason": ""}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '取消流程实例', '10.0', TRUE, TRUE
),
(
  UUID(), 'flow.retract', '撤回流程', '流程',
  '/api/sys/workflow/sysWorkflowRestService/retract',
  'sysWorkflowRestService', 'POST',
  '{"fdId": ""}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '撤回流程实例', '10.0', TRUE, TRUE
);

-- 文档类接口
INSERT INTO ekp_official_interfaces (
  id, interface_code, interface_name, interface_category,
  api_path, service_id, http_method, request_template,
  response_parser, description, version, enabled, is_system
) VALUES
(
  UUID(), 'doc.create', '创建文档', '文档',
  '/api/sys/doc/sysDocRestService/createDoc',
  'sysDocRestService', 'POST',
  '{"templateId": "", "formData": {}}',
  '{"successPath": "returnState == 2", "dataPath": "data.docId"}',
  '创建一个新的文档', '10.0', TRUE, TRUE
),
(
  UUID(), 'doc.get', '获取文档详情', '文档',
  '/api/sys/doc/sysDocRestService/getDoc',
  'sysDocRestService', 'POST',
  '{"docId": ""}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '获取文档的详细信息', '10.0', TRUE, TRUE
),
(
  UUID(), 'doc.update', '更新文档', '文档',
  '/api/sys/doc/sysDocRestService/updateDoc',
  'sysDocRestService', 'POST',
  '{"docId": "", "formData": {}}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '更新文档信息', '10.0', TRUE, TRUE
),
(
  UUID(), 'doc.delete', '删除文档', '文档',
  '/api/sys/doc/sysDocRestService/deleteDoc',
  'sysDocRestService', 'POST',
  '{"docId": ""}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '删除文档', '10.0', TRUE, TRUE
);

-- 组织类接口
INSERT INTO ekp_official_interfaces (
  id, interface_code, interface_name, interface_category,
  api_path, service_id, http_method, request_template,
  response_parser, description, version, enabled, is_system
) VALUES
(
  UUID(), 'org.getDepartment', '获取部门信息', '组织',
  '/api/sys/org/sysOrgRestService/getDepartment',
  'sysOrgRestService', 'POST',
  '{"deptId": ""}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '获取部门的详细信息', '10.0', TRUE, TRUE
),
(
  UUID(), 'org.getPerson', '获取人员信息', '组织',
  '/api/sys/org/sysOrgRestService/getPerson',
  'sysOrgRestService', 'POST',
  '{"personId": ""}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '获取人员的详细信息', '10.0', TRUE, TRUE
),
(
  UUID(), 'org.getDepartmentTree', '获取部门树', '组织',
  '/api/sys/org/sysOrgRestService/getDepartmentTree',
  'sysOrgRestService', 'POST',
  '{}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '获取整个部门的树形结构', '10.0', TRUE, TRUE
),
(
  UUID(), 'org.getPersonByDept', '获取部门人员', '组织',
  '/api/sys/org/sysOrgRestService/getPersonByDept',
  'sysOrgRestService', 'POST',
  '{"deptId": ""}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '获取部门下的所有人员', '10.0', TRUE, TRUE
);

-- 用户类接口
INSERT INTO ekp_official_interfaces (
  id, interface_code, interface_name, interface_category,
  api_path, service_id, http_method, request_template,
  response_parser, description, version, enabled, is_system
) VALUES
(
  UUID(), 'user.getCurrent', '获取当前用户', '用户',
  '/api/sys/user/sysUserRestService/getCurrentUser',
  'sysUserRestService', 'POST',
  '{}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '获取当前登录用户信息', '10.0', TRUE, TRUE
),
(
  UUID(), 'user.getAuthDepts', '获取授权部门', '用户',
  '/api/sys/user/sysUserRestService/getAuthDepts',
  'sysUserRestService', 'POST',
  '{}',
  '{"successPath": "returnState == 2", "dataPath": "data"}',
  '获取当前用户有权限的部门列表', '10.0', TRUE, TRUE
);
