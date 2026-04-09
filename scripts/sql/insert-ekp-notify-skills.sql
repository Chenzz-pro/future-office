-- ================================================
-- EKP 待办服务技能初始化脚本
-- 添加EKP待办服务的7个接口操作作为技能
-- ================================================

-- 插入EKP待办服务相关技能
INSERT INTO skills (id, code, name, description, category, api_config, enabled) VALUES
-- 1. EKP待办服务（综合技能）
('10000000-0000-0000-0000-000000000001', 'ekp.notify', 'EKP待办服务', '蓝凌EKP待办REST服务，支持发送、删除、已办、查询、更新待办等7个接口操作', 'ekp', '{"baseUrl":"","path":"/api/sys-notify/sysNotifyTodoRestService","method":"POST","actions":["getTodoCount","getTodo","sendTodo","deleteTodo","setTodoDone","updateTodo","getTodoTargets"]}', TRUE),

-- 2. 获取待办数量
('10000000-0000-0000-0000-000000000002', 'ekp.todo.count', '获取待办数量', '获取指定用户的待办数量，支持按类型筛选', 'ekp', '{"baseUrl":"","path":"/api/sys-notify/sysNotifyTodoRestService/getTodoCount","method":"POST","params":["target","types"]}', TRUE),

-- 3. 获取待办列表
('10000000-0000-0000-0000-000000000003', 'ekp.todo.list', '获取待办列表', '获取指定用户的待办事项列表，支持分页和多种筛选条件', 'ekp', '{"baseUrl":"","path":"/api/sys-notify/sysNotifyTodoRestService/getTodo","method":"POST","params":["targets","type","otherCond","rowSize","pageNo"]}', TRUE),

-- 4. 发送待办
('10000000-0000-0000-0000-000000000004', 'ekp.todo.send', '发送待办', '向指定人员发送待办通知', 'ekp', '{"baseUrl":"","path":"/api/sys-notify/sysNotifyTodoRestService/sendTodo","method":"POST","params":["modelName","modelId","subject","link","mobileLink","padLink","type","targets","createTime"]}', TRUE),

-- 5. 删除待办
('10000000-0000-0000-0000-000000000005', 'ekp.todo.delete', '删除待办', '删除指定的待办事项', 'ekp', '{"baseUrl":"","path":"/api/sys-notify/sysNotifyTodoRestService/deleteTodo","method":"POST","params":["modelName","modelId","optType","type"]}', TRUE),

-- 6. 设为已办
('10000000-0000-0000-0000-000000000006', 'ekp.todo.done', '设为已办', '将待办标记为已处理状态', 'ekp', '{"baseUrl":"","path":"/api/sys-notify/sysNotifyTodoRestService/setTodoDone","method":"POST","params":["modelName","modelId","optType","type"]}', TRUE),

-- 7. 更新待办
('10000000-0000-0000-0000-000000000007', 'ekp.todo.update', '更新待办', '更新已存在的待办信息', 'ekp', '{"baseUrl":"","path":"/api/sys-notify/sysNotifyTodoRestService/updateTodo","method":"POST","params":["modelName","modelId","subject","link","mobileLink","padLink","type","level"]}', TRUE),

-- 8. 获取待办接收人
('10000000-0000-0000-0000-000000000008', 'ekp.todo.targets', '获取待办接收人', '获取指定待办的所有接收人列表', 'ekp', '{"baseUrl":"","path":"/api/sys-notify/sysNotifyTodoRestService/getTodoTargets","method":"POST","params":["fdId"]}', TRUE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  category = VALUES(category),
  api_config = VALUES(api_config);

-- 为ApprovalAgent添加EKP待办服务相关技能
INSERT INTO agents_skills (id, agent_type, skill_id) VALUES
('10000000-0000-0000-0000-000000000001', 'approval', 'ekp.todo.count'),
('10000000-0000-0000-0000-000000000002', 'approval', 'ekp.todo.list'),
('10000000-0000-0000-0000-000000000003', 'approval', 'ekp.todo.done'),
('10000000-0000-0000-0000-000000000004', 'approval', 'ekp.todo.delete'),
('10000000-0000-0000-0000-000000000005', 'approval', 'ekp.notify')
ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id);

-- 查询插入结果
SELECT 
  code AS '技能代码',
  name AS '技能名称',
  description AS '描述',
  category AS '分类'
FROM skills 
WHERE category = 'ekp' 
ORDER BY code;
