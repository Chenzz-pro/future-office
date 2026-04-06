-- ============================================
-- 组织架构管理表结构
-- 包含：机构、部门、岗位、人员、岗位人员关联
-- ============================================

-- 1. 机构/部门/岗位统一表 (sys_org_element)
CREATE TABLE IF NOT EXISTS sys_org_element (
    fd_id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
    fd_org_type INT NOT NULL COMMENT '类型：1=机构，2=部门，3=岗位',
    fd_name VARCHAR(200) NOT NULL COMMENT '名称（机构名称/部门名称/岗位名称）',
    fd_order INT DEFAULT 0 COMMENT '排序号',
    fd_no VARCHAR(100) COMMENT '编号',
    fd_keyword VARCHAR(100) COMMENT '关键字',
    fd_is_available TINYINT(1) DEFAULT 1 COMMENT '是否有效：1=有效，0=无效',
    fd_is_business TINYINT(1) DEFAULT 0 COMMENT '是否业务相关：1=是，0=否',
    fd_import_info VARCHAR(200) COMMENT '导入的数据的对应键值',
    fd_org_email VARCHAR(450) COMMENT '邮件地址',
    fd_persons_number INT DEFAULT 0 COMMENT '人员总数',
    fd_memo TEXT COMMENT '备注',
    fd_hierarchy_id VARCHAR(450) COMMENT '层级ID（完整路径，如：/机构ID/部门ID/岗位ID）',
    fd_create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    fd_alter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
    fd_is_external TINYINT(1) DEFAULT 0 COMMENT '是否外部组织：1=是，0=否',
    fd_this_leaderid VARCHAR(36) COMMENT '本级领导（人员ID）',
    fd_super_leaderid VARCHAR(36) COMMENT '上级领导（人员ID）',
    fd_parentorgid VARCHAR(36) COMMENT '父机构ID（仅部门和岗位使用）',
    fd_parentid VARCHAR(36) COMMENT '上级部门ID（仅岗位使用）',
    fd_name_pinyin VARCHAR(400) COMMENT '拼音名称',
    fd_name_simple_pinyin VARCHAR(100) COMMENT '名称简拼',
    fd_is_abandon TINYINT(1) DEFAULT 0 COMMENT '是否废弃：1=是，0=否',
    fd_flag_deleted VARCHAR(200) COMMENT 'OMS导入字段',
    fd_ldap_dn VARCHAR(450) COMMENT 'OMS导入字段',
    fd_pre_dept_id VARCHAR(36) COMMENT '上一个部门ID',
    fd_pre_post_ids VARCHAR(2000) COMMENT '上一个岗位ID',
    fd_creator_id VARCHAR(36) COMMENT '创建者ID（人员ID）',
    INDEX idx_org_type (fd_org_type),
    INDEX idx_parentid (fd_parentid),
    INDEX idx_parentorgid (fd_parentorgid),
    INDEX idx_hierarchy_id (fd_hierarchy_id),
    INDEX fd_name_pinyin (fd_name_pinyin),
    INDEX fd_name_simple_pinyin (fd_name_simple_pinyin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='组织架构统一表（机构/部门/岗位）';

-- 2. 角色表 (sys_role)
CREATE TABLE IF NOT EXISTS sys_role (
  fd_id VARCHAR(36) PRIMARY KEY COMMENT '角色ID',
  fd_name VARCHAR(100) NOT NULL COMMENT '角色名称',
  fd_code VARCHAR(50) NOT NULL UNIQUE COMMENT '角色代码（唯一标识）',
  fd_description VARCHAR(500) DEFAULT NULL COMMENT '角色描述',
  fd_order INT DEFAULT 0 COMMENT '排序号',
  fd_is_available TINYINT(1) DEFAULT 1 COMMENT '是否可用（1=是，0=否）',
  fd_create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  fd_update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  fd_create_by VARCHAR(36) DEFAULT NULL COMMENT '创建人ID',
  fd_update_by VARCHAR(36) DEFAULT NULL COMMENT '更新人ID',
  INDEX idx_role_code (fd_code),
  INDEX idx_role_available (fd_is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统角色表';

-- 3. 人员表 (sys_org_person)
CREATE TABLE IF NOT EXISTS sys_org_person (
    fd_id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
    fd_name VARCHAR(100) NOT NULL COMMENT '姓名',
    fd_nickname VARCHAR(100) COMMENT '昵称',
    fd_no VARCHAR(50) COMMENT '编号（工号）',
    fd_dept_id VARCHAR(36) COMMENT '所在部门ID',
    fd_email VARCHAR(200) COMMENT '邮件地址',
    fd_mobile VARCHAR(50) COMMENT '手机号码',
    fd_office_phone VARCHAR(50) COMMENT '办公电话',
    fd_login_name VARCHAR(100) NOT NULL UNIQUE COMMENT '登录名',
    fd_password VARCHAR(255) COMMENT '密码（bcrypt 加密）',
    fd_default_language VARCHAR(50) DEFAULT 'zh-CN' COMMENT '默认语言',
    fd_keyword VARCHAR(200) COMMENT '关键字',
    fd_order INT DEFAULT 0 COMMENT '排序号',
    fd_position VARCHAR(100) COMMENT '职务',
    fd_post_id VARCHAR(36) COMMENT '所属岗位ID',
    fd_rtx_account VARCHAR(100) COMMENT 'RTX帐号',
    fd_dynamic_password VARCHAR(100) COMMENT '动态密码卡',
    fd_gender TINYINT(1) DEFAULT 1 COMMENT '性别：1=男，2=女',
    fd_wechat VARCHAR(100) COMMENT '微信号',
    fd_short_no VARCHAR(50) COMMENT '短号',
    fd_double_validation TINYINT(1) DEFAULT 0 COMMENT '双因子验证：1=启用，0=禁用',
    fd_is_business_related TINYINT(1) DEFAULT 1 COMMENT '是否业务相关：1=是，0=否',
    fd_is_login_enabled TINYINT(1) DEFAULT 1 COMMENT '是否登录系统：1=是，0=否',
    fd_role VARCHAR(36) DEFAULT '00000000-0000-0000-0000-000000000003' COMMENT '用户角色ID（关联 sys_role.fd_id）',
    fd_memo TEXT COMMENT '备注',
    fd_create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    fd_alter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
    fd_creator_id VARCHAR(36) COMMENT '创建者ID',
    fd_lock_time TIMESTAMP NULL COMMENT '上锁时间',
    fd_staffing_level_id VARCHAR(36) COMMENT '员工级别ID',
    fd_user_type VARCHAR(50) DEFAULT 'internal' COMMENT '用户类型：internal=内部，external=外部',
    fd_person_to_more_dept INT DEFAULT 0 COMMENT '是否是一人多部门：1=是，0=否',
    INDEX idx_dept_id (fd_dept_id),
    INDEX idx_post_id (fd_post_id),
    INDEX idx_login_name (fd_login_name),
    INDEX idx_role (fd_role),
    INDEX fd_name (fd_name),
    FOREIGN KEY (fd_dept_id) REFERENCES sys_org_element(fd_id) ON DELETE SET NULL,
    FOREIGN KEY (fd_post_id) REFERENCES sys_org_element(fd_id) ON DELETE SET NULL,
    FOREIGN KEY (fd_role) REFERENCES sys_role(fd_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='人员表（系统用户表）';

-- 迁移逻辑：如果 fd_role 字段是旧的 ENUM 类型，转换为外键
-- 注意：MySQL 不支持在 CREATE TABLE IF NOT EXISTS 中检测字段类型变化
-- 这里需要手动检查并执行迁移

-- 4. 岗位人员关联表 (sys_org_post_person)
CREATE TABLE IF NOT EXISTS sys_org_post_person (
    fd_id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
    fd_post_id VARCHAR(36) NOT NULL COMMENT '岗位ID',
    fd_person_id VARCHAR(36) NOT NULL COMMENT '人员ID',
    fd_create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    fd_creator_id VARCHAR(36) COMMENT '创建者ID',
    INDEX idx_post_id (fd_post_id),
    INDEX idx_person_id (fd_person_id),
    UNIQUE KEY uk_post_person (fd_post_id, fd_person_id),
    FOREIGN KEY (fd_post_id) REFERENCES sys_org_element(fd_id) ON DELETE CASCADE,
    FOREIGN KEY (fd_person_id) REFERENCES sys_org_person(fd_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='岗位人员关联表';

-- 5. 职务级别表 (sys_org_staffing_level)
CREATE TABLE IF NOT EXISTS sys_org_staffing_level (
    fd_id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
    fd_name VARCHAR(200) NOT NULL COMMENT '职务名称',
    fd_level INT NOT NULL COMMENT '职务级别',
    fd_description VARCHAR(1500) COMMENT '描述',
    fd_is_default TINYINT(1) DEFAULT 0 COMMENT '是否默认：1=是，0=否',
    fd_is_available TINYINT(1) DEFAULT 1 COMMENT '是否有效：1=有效，0=无效',
    doc_create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    doc_alter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
    doc_creator_id VARCHAR(36) COMMENT '创建者ID',
    fd_import_info VARCHAR(200) COMMENT '导入的数据的对应键值',
    INDEX idx_level (fd_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='职务级别表';

-- ============================================
-- 初始化数据
-- ============================================

-- 插入默认角色数据
INSERT INTO sys_role (fd_id, fd_name, fd_code, fd_description, fd_order) VALUES
('00000000-0000-0000-0000-000000000001', '超级管理员', 'admin', '拥有系统所有权限，包括组织管理、用户管理、系统配置等', 1),
('00000000-0000-0000-0000-000000000002', '管理员', 'manager', '拥有大部分管理权限，包括用户管理、数据管理等', 2),
('00000000-0000-0000-0000-000000000003', '普通用户', 'user', '普通用户权限，只能访问自己的数据', 3)
ON DUPLICATE KEY UPDATE
  fd_name = VALUES(fd_name),
  fd_description = VALUES(fd_description),
  fd_order = VALUES(fd_order);

-- 插入默认管理员账号到 sys_org_person
-- 密码：admin123（使用 bcrypt 加密）
INSERT INTO sys_org_person (
    fd_id,
    fd_name,
    fd_login_name,
    fd_password,
    fd_email,
    fd_role,
    fd_is_login_enabled,
    fd_is_business_related,
    fd_user_type,
    fd_create_time,
    fd_alter_time
) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    '系统管理员',
    'admin',
    '$2b$10$DId8bUro45mx1.fpSIJJV.MXHImaJM4kdb9V34feSKiU7dmRxeOTq',
    'admin@example.com',
    '00000000-0000-0000-0000-000000000001',
    1,
    1,
    'internal',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    fd_password = VALUES(fd_password),
    fd_role = VALUES(fd_role),
    fd_alter_time = NOW();

-- 插入默认普通用户账号
-- 密码：user123
INSERT INTO sys_org_person (
    fd_id,
    fd_name,
    fd_login_name,
    fd_password,
    fd_email,
    fd_role,
    fd_is_login_enabled,
    fd_is_business_related,
    fd_user_type,
    fd_create_time,
    fd_alter_time
) VALUES
(
    '00000000-0000-0000-0000-000000000002',
    '普通用户',
    'user',
    '$2b$10$2AzAhhA3wExFpcAfOyKsU.9BDM4dfkYm5qMvGKEvAOwHKvSBLh7R6',
    'user@example.com',
    '00000000-0000-0000-0000-000000000003',
    1,
    1,
    'internal',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    fd_password = VALUES(fd_password),
    fd_role = VALUES(fd_role),
    fd_alter_time = NOW();

-- 插入根机构
INSERT INTO sys_org_element (fd_id, fd_org_type, fd_name, fd_order, fd_no, fd_is_available, fd_is_business, fd_memo, fd_create_time, fd_creator_id)
VALUES (
    UUID(),
    1,
    '海峡人力',
    0,
    'ORG001',
    1,
    1,
    '根机构',
    NOW(),
    NULL
)
ON DUPLICATE KEY UPDATE fd_name = '海峡人力';

-- 插入一级部门（隶属于海峡人力）
INSERT INTO sys_org_element (fd_id, fd_org_type, fd_name, fd_order, fd_no, fd_is_available, fd_is_business, fd_memo, fd_create_time, fd_parentorgid)
VALUES
-- 董事会
(UUID(), 2, '董事会', 1, 'DEPT001', 1, 1, '董事会', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '海峡人力' LIMIT 1)),
-- 经营班子
(UUID(), 2, '经营班子', 2, 'DEPT002', 1, 1, '经营班子', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '海峡人力' LIMIT 1)),
-- 人力资源部
(UUID(), 2, '人力资源部', 3, 'DEPT003', 1, 1, '人力资源部', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '海峡人力' LIMIT 1)),
-- 财务资金部
(UUID(), 2, '财务资金部', 4, 'DEPT004', 1, 1, '财务资金部', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '海峡人力' LIMIT 1)),
-- 省外区域中心
(UUID(), 2, '省外区域中心', 5, 'DEPT005', 1, 1, '省外区域中心', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '海峡人力' LIMIT 1))
ON DUPLICATE KEY UPDATE fd_name = VALUES(fd_name);

-- 插入人力资源部下的子部门
-- 注意：部门使用 fd_parentorgid 指向父部门，而不是 fd_parentid
INSERT INTO sys_org_element (fd_id, fd_org_type, fd_name, fd_order, fd_no, fd_is_available, fd_is_business, fd_memo, fd_create_time, fd_parentorgid)
VALUES
-- 人力一组
(UUID(), 2, '人力一组', 1, 'DEPT003001', 1, 1, '人力一组', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '人力资源部' LIMIT 1)),
-- 人力二组
(UUID(), 2, '人力二组', 2, 'DEPT003002', 1, 1, '人力二组', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '人力资源部' LIMIT 1)),
-- 人力三组
(UUID(), 2, '人力三组', 3, 'DEPT003003', 1, 1, '人力三组', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '人力资源部' LIMIT 1))
ON DUPLICATE KEY UPDATE fd_name = VALUES(fd_name);

-- 插入财务资金部下的子部门
INSERT INTO sys_org_element (fd_id, fd_org_type, fd_name, fd_order, fd_no, fd_is_available, fd_is_business, fd_memo, fd_create_time, fd_parentorgid)
VALUES
-- 资金部
(UUID(), 2, '资金部', 1, 'DEPT004001', 1, 1, '资金部', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '财务资金部' LIMIT 1)),
-- 财务部
(UUID(), 2, '财务部', 2, 'DEPT004002', 1, 1, '财务部', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '财务资金部' LIMIT 1))
ON DUPLICATE KEY UPDATE fd_name = VALUES(fd_name);

-- 插入省外区域中心下的子部门
INSERT INTO sys_org_element (fd_id, fd_org_type, fd_name, fd_order, fd_no, fd_is_available, fd_is_business, fd_memo, fd_create_time, fd_parentorgid)
VALUES
-- 广东运营中心
(UUID(), 2, '广东运营中心', 1, 'DEPT005001', 1, 1, '广东运营中心', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '省外区域中心' LIMIT 1)),
-- 陕西运营中心
(UUID(), 2, '陕西运营中心', 2, 'DEPT005002', 1, 1, '陕西运营中心', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '省外区域中心' LIMIT 1))
ON DUPLICATE KEY UPDATE fd_name = VALUES(fd_name);

-- 插入陕西运营中心下的子部门
INSERT INTO sys_org_element (fd_id, fd_org_type, fd_name, fd_order, fd_no, fd_is_available, fd_is_business, fd_memo, fd_create_time, fd_parentorgid)
VALUES
-- 分公司1
(UUID(), 2, '分公司1', 1, 'DEPT005002001', 1, 1, '分公司1', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '陕西运营中心' LIMIT 1)),
-- 分公司2
(UUID(), 2, '分公司2', 2, 'DEPT005002002', 1, 1, '分公司2', NOW(), (SELECT fd_id FROM sys_org_element WHERE fd_name = '陕西运营中心' LIMIT 1))
ON DUPLICATE KEY UPDATE fd_name = VALUES(fd_name);

-- 插入职务级别
INSERT INTO sys_org_staffing_level (fd_id, fd_name, fd_level, fd_description, fd_is_default, fd_is_available) VALUES
(UUID(), '普通员工', 1, '普通员工级别', 1, 1),
(UUID(), '组长', 2, '组长级别', 0, 1),
(UUID(), '主管', 3, '主管级别', 0, 1),
(UUID(), '经理', 4, '经理级别', 0, 1),
(UUID(), '总监', 5, '总监级别', 0, 1),
(UUID(), '副总经理', 6, '副总经理级别', 0, 1),
(UUID(), '总经理', 7, '总经理级别', 0, 1)
ON DUPLICATE KEY UPDATE fd_level = VALUES(fd_level);

-- ============================================
-- 多Agent协作架构表结构
-- 包含：Agent配置、技能配置、Agent技能关联、Agent子Bot关联
-- ============================================

-- 6. Agent配置表
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(36) PRIMARY KEY COMMENT 'Agent ID',
  type VARCHAR(50) NOT NULL UNIQUE COMMENT 'Agent类型（root、approval、meeting、data、assistant）',
  name VARCHAR(100) NOT NULL COMMENT 'Agent名称',
  description TEXT COMMENT 'Agent描述',
  avatar VARCHAR(100) DEFAULT '🤖' COMMENT 'Agent头像',
  system_prompt TEXT COMMENT '系统提示词（角色）',
  enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_type (type),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent配置表';

-- 7. Agent技能关联表
CREATE TABLE IF NOT EXISTS agents_skills (
  id VARCHAR(36) PRIMARY KEY COMMENT '关联ID',
  agent_type VARCHAR(50) NOT NULL COMMENT 'Agent类型',
  skill_id VARCHAR(100) NOT NULL COMMENT '技能ID（关联skills.code）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (agent_type) REFERENCES agents(type) ON DELETE CASCADE,
  UNIQUE KEY uk_agent_skill (agent_type, skill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent技能关联表';

-- 8. Agent子Bot关联表
CREATE TABLE IF NOT EXISTS agents_bots (
  id VARCHAR(36) PRIMARY KEY COMMENT '关联ID',
  agent_type VARCHAR(50) NOT NULL COMMENT 'Agent类型',
  bot_id VARCHAR(100) NOT NULL COMMENT '子Bot ID',
  bot_name VARCHAR(100) NOT NULL COMMENT '子Bot名称',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (agent_type) REFERENCES agents(type) ON DELETE CASCADE,
  UNIQUE KEY uk_agent_bot (agent_type, bot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent子Bot关联表';

-- 9. 技能配置表
CREATE TABLE IF NOT EXISTS skills (
  id VARCHAR(36) PRIMARY KEY COMMENT '技能ID',
  code VARCHAR(100) NOT NULL UNIQUE COMMENT '技能代码（如todo.list）',
  name VARCHAR(100) NOT NULL COMMENT '技能名称',
  description TEXT COMMENT '技能描述',
  category VARCHAR(50) DEFAULT 'custom' COMMENT '技能分类（custom、ekp、meeting、data）',
  api_config JSON COMMENT 'API配置',
  enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_code (code),
  INDEX idx_category (category),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技能配置表';

-- ============================================
-- 多Agent协作架构初始化数据
-- ============================================

-- 插入默认Agent数据
INSERT INTO agents (id, type, name, description, avatar, system_prompt, enabled) VALUES
('00000000-0000-0000-0000-000000000001', 'root', '统筹智能体', '负责意图识别、任务分发、结果汇总', '🎯', '你是企业OA系统的统筹智能体，负责：
1. 识别用户意图（审批/会议/数据/个人助理）
2. 分发任务给对应业务Agent
3. 汇总结果返回用户

重要规则：
- 只能处理当前用户自己的数据
- 禁止查询他人待办、他人会议、他人流程
- 禁止越权操作
- 所有操作必须带上userId、deptId、role
- 遇到无权限请求，直接拒绝并说明原因', TRUE),
('00000000-0000-0000-0000-000000000002', 'approval', '审批智能体', '负责待办审批、流程发起、审批查询', '✅', '你是企业OA系统的审批智能体，负责：
1. 查询待办事项
2. 处理审批操作（同意/拒绝）
3. 发起新的审批流程

权限规则：
- 只能查询当前用户的待办
- 只能处理当前用户有权限的审批
- 所有操作必须带上userId', TRUE),
('00000000-0000-0000-0000-000000000003', 'meeting', '会议智能体', '负责会议查询、会议预定、会议通知', '📅', '你是企业OA系统的会议智能体，负责：
1. 查询会议列表
2. 预定新会议
3. 更新会议信息
4. 取消会议

权限规则：
- 只能查询当前用户的会议
- 只能操作当前用户有权限的会议
- 会议预定必须检查资源占用', TRUE),
('00000000-0000-0000-0000-000000000004', 'data', '数据智能体', '负责表单查询、统计分析、报表生成', '📊', '你是企业OA系统的数据智能体，负责：
1. 查询表单数据
2. 生成统计报表
3. 提供数据分析

权限规则：
- 只能查询当前用户有权限的数据
- 根据用户角色过滤数据范围', TRUE),
('00000000-0000-0000-0000-000000000005', 'assistant', '个人助理智能体', '负责日程管理、提醒通知、个人事务', '🤝', '你是企业OA系统的个人助理智能体，负责：
1. 日程管理
2. 提醒通知
3. 个人事务处理

权限规则：
- 只能管理当前用户的日程和提醒
- 所有操作必须带上userId', TRUE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  avatar = VALUES(avatar),
  system_prompt = VALUES(system_prompt);

-- 插入默认技能数据
INSERT INTO skills (id, code, name, description, category, api_config, enabled) VALUES
('00000000-0000-0000-0000-000000000001', 'todo.list', '待办查询', '查询当前用户的待办事项', 'approval', '{"method":"GET","endpoint":"/api/ekp?action=getTodoCount","params":["todoType"]}', TRUE),
('00000000-0000-0000-0000-000000000002', 'todo.approve', '审批同意', '同意待办事项', 'approval', '{"method":"POST","endpoint":"/api/workflow/approve","params":["todoId","comment"]}', TRUE),
('00000000-0000-0000-0000-000000000003', 'todo.reject', '审批拒绝', '拒绝待办事项', 'approval', '{"method":"POST","endpoint":"/api/workflow/reject","params":["todoId","comment"]}', TRUE),
('00000000-0000-0000-0000-000000000004', 'meeting.list', '会议列表', '查询会议列表', 'meeting', '{"method":"GET","endpoint":"/api/meeting/list","params":["startDate","endDate"]}', TRUE),
('00000000-0000-0000-0000-000000000005', 'meeting.create', '创建会议', '预定新会议', 'meeting', '{"method":"POST","endpoint":"/api/meeting/create","params":["title","startTime","endTime","participants"]}', TRUE),
('00000000-0000-0000-0000-000000000006', 'data.query', '数据查询', '查询表单数据', 'data', '{"method":"GET","endpoint":"/api/data/query","params":["formId","filters"]}', TRUE),
('00000000-0000-0000-0000-000000000007', 'report.generate', '报表生成', '生成统计报表', 'data', '{"method":"POST","endpoint":"/api/report/generate","params":["reportType","dateRange"]}', TRUE),
('00000000-0000-0000-0000-000000000008', 'schedule.list', '日程列表', '查询日程安排', 'assistant', '{"method":"GET","endpoint":"/api/schedule/list","params":["date"]}', TRUE),
('00000000-0000-0000-0000-000000000009', 'schedule.create', '创建日程', '创建新的日程', 'assistant', '{"method":"POST","endpoint":"/api/schedule/create","params":["title","startTime","endTime","location"]}', TRUE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  category = VALUES(category);

-- 为ApprovalAgent配置技能
INSERT INTO agents_skills (id, agent_type, skill_id) VALUES
('00000000-0000-0000-0000-000000000001', 'approval', 'todo.list'),
('00000000-0000-0000-0000-000000000002', 'approval', 'todo.approve'),
('00000000-0000-0000-0000-000000000003', 'approval', 'todo.reject')
ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id);

-- 为MeetingAgent配置技能
INSERT INTO agents_skills (id, agent_type, skill_id) VALUES
('00000000-0000-0000-0000-000000000004', 'meeting', 'meeting.list'),
('00000000-0000-0000-0000-000000000005', 'meeting', 'meeting.create')
ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id);

-- 为DataAgent和AssistantAgent配置技能
INSERT INTO agents_skills (id, agent_type, skill_id) VALUES
('00000000-0000-0000-0000-000000000006', 'data', 'data.query'),
('00000000-0000-0000-0000-000000000007', 'data', 'report.generate'),
('00000000-0000-0000-0000-000000000008', 'assistant', 'schedule.list'),
('00000000-0000-0000-0000-000000000009', 'assistant', 'schedule.create')
ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id);

