-- ============================================
-- 插入EKP官方接口初始数据
-- ============================================

-- 待办类接口
INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
(UUID(), 'ekp.todo.getTodo', '获取待办数量', '获取当前用户的待办数量', 'workflow', '/api/sys-notify/sysNotifyTodoRestService/getTodo', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('todoType'), 'requestTemplate', '{"type": -1}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "message"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.todo.getList', '获取待办列表', '获取当前用户的待办列表', 'workflow', '/api/sys-notify/sysNotifyTodoRestService/getTodoList', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('pageIndex', 'pageSize', 'type'), 'requestTemplate', '{"pageIndex": 1, "pageSize": 20, "type": -1}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.todo.getDone', '获取已办列表', '获取当前用户的已办列表', 'workflow', '/api/sys-notify/sysNotifyTodoRestService/getTodoList', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('pageIndex', 'pageSize', 'type'), 'requestTemplate', '{"pageIndex": 1, "pageSize": 20, "type": -1}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.todo.getSuspended', '获取暂挂列表', '获取当前用户的暂挂列表', 'workflow', '/api/sys-notify/sysNotifyTodoRestService/getTodoList', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('pageIndex', 'pageSize', 'type'), 'requestTemplate', '{"pageIndex": 1, "pageSize": 20, "type": 3}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE));

-- 流程类接口
INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
(UUID(), 'ekp.flow.launch', '发起流程', '发起新的流程实例', 'workflow', '/api/sys/workflow/sysWorkflowRestService/launchFlow', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('templateId', 'formValues'), 'requestTemplate', '{"templateId": "", "formValues": {}}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data.fdId"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.flow.progress', '查询流程进度', '查询流程的审批进度', 'workflow', '/api/sys/workflow/sysWorkflowRestService/getFlowProgress', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('fdId'), 'requestTemplate', '{"fdId": ""}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.flow.approve', '审批流程', '审批或拒绝流程', 'workflow', '/api/sys/workflow/sysWorkflowRestService/approve', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('fdId', 'opinion', 'action'), 'requestTemplate', '{"fdId": "", "opinion": "", "action": ""}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.flow.cancel', '取消流程', '取消流程实例', 'workflow', '/api/sys/workflow/sysWorkflowRestService/cancel', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('fdId', 'reason'), 'requestTemplate', '{"fdId": "", "reason": ""}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.flow.retract', '撤回流程', '撤回流程实例', 'workflow', '/api/sys/workflow/sysWorkflowRestService/retract', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('fdId'), 'requestTemplate', '{"fdId": ""}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE));

-- 文档类接口
INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
(UUID(), 'ekp.doc.create', '创建文档', '创建一个新的文档', 'document', '/api/sys/doc/sysDocRestService/createDoc', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('templateId', 'formData'), 'requestTemplate', '{"templateId": "", "formData": {}}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data.docId"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.doc.get', '获取文档详情', '获取文档的详细信息', 'document', '/api/sys/doc/sysDocRestService/getDoc', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('docId'), 'requestTemplate', '{"docId": ""}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.doc.update', '更新文档', '更新文档信息', 'document', '/api/sys/doc/sysDocRestService/updateDoc', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('docId', 'formData'), 'requestTemplate', '{"docId": "", "formData": {}}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.doc.delete', '删除文档', '删除文档', 'document', '/api/sys/doc/sysDocRestService/deleteDoc', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('docId'), 'requestTemplate', '{"docId": ""}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE));

-- 组织类接口
INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
(UUID(), 'ekp.org.getDepartment', '获取部门信息', '获取部门的详细信息', 'organization', '/api/sys/org/sysOrgRestService/getDepartment', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('deptId'), 'requestTemplate', '{"deptId": ""}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.org.getPerson', '获取人员信息', '获取人员的详细信息', 'organization', '/api/sys/org/sysOrgRestService/getPerson', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('personId'), 'requestTemplate', '{"personId": ""}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.org.getDepartmentTree', '获取部门树', '获取整个部门的树形结构', 'organization', '/api/sys/org/sysOrgRestService/getDepartmentTree', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY(), 'requestTemplate', '{}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.org.getPersonByDept', '获取部门人员', '获取部门下的所有人员', 'organization', '/api/sys/org/sysOrgRestService/getPersonByDept', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY('deptId'), 'requestTemplate', '{"deptId": ""}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE));

-- 用户类接口
INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata) VALUES
(UUID(), 'ekp.user.getCurrent', '获取当前用户', '获取当前登录用户信息', 'system', '/api/sys/user/sysUserRestService/getCurrentUser', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY(), 'requestTemplate', '{}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE)),
(UUID(), 'ekp.user.getAuthDepts', '获取授权部门', '获取当前用户有权限的部门列表', 'system', '/api/sys/user/sysUserRestService/getAuthDepts', 'POST', 1, JSON_OBJECT('params', JSON_ARRAY(), 'requestTemplate', '{}', 'responseParser', '{"successPath": "returnState == 2", "dataPath": "data"}', 'version', '10.0', 'isSystem', TRUE));
