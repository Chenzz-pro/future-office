-- ============================================
-- 角色管理表结构
-- 用于管理系统用户角色
-- ============================================

-- 1. 角色表 (sys_role)
CREATE TABLE IF NOT EXISTS sys_role (
    fd_id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
    fd_name VARCHAR(100) NOT NULL COMMENT '角色名称',
    fd_code VARCHAR(50) NOT NULL UNIQUE COMMENT '角色代码（唯一标识）',
    fd_description TEXT COMMENT '角色描述',
    fd_order INT DEFAULT 0 COMMENT '排序号',
    fd_is_available TINYINT(1) DEFAULT 1 COMMENT '是否有效：1=有效，0=无效',
    fd_create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    fd_alter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
    fd_creator_id VARCHAR(36) COMMENT '创建者ID',
    INDEX idx_code (fd_code),
    INDEX idx_is_available (fd_is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- 2. 修改人员表，添加角色ID字段
-- 注意：如果 fd_role_id 字段已存在，则跳过添加
ALTER TABLE sys_org_person
ADD COLUMN IF NOT EXISTS fd_role_id VARCHAR(36) COMMENT '角色ID（外键关联 sys_role）' AFTER fd_role;

-- 添加外键约束
-- 注意：如果外键已存在，则跳过添加
ALTER TABLE sys_org_person
ADD CONSTRAINT IF NOT EXISTS fk_person_role
FOREIGN KEY (fd_role_id) REFERENCES sys_role(fd_id) ON DELETE SET NULL;

-- 3. 初始化默认角色数据
INSERT INTO sys_role (fd_id, fd_name, fd_code, fd_description, fd_order, fd_is_available)
VALUES
    ('role-0000000001', '超级管理员', 'admin', '拥有系统所有权限', 1, 1),
    ('role-0000000002', '管理员', 'manager', '拥有大部分管理权限', 2, 1),
    ('role-0000000003', '普通用户', 'user', '基本使用权限', 3, 1)
ON DUPLICATE KEY UPDATE
    fd_name = VALUES(fd_name),
    fd_description = VALUES(fd_description),
    fd_order = VALUES(fd_order),
    fd_is_available = VALUES(fd_is_available);

-- 4. 迁移现有用户的角色数据
-- 将 fd_role 字段的值映射到 fd_role_id
UPDATE sys_org_person
SET fd_role_id = CASE
    WHEN fd_role = 'admin' THEN 'role-0000000001'
    WHEN fd_role = 'user' THEN 'role-0000000003'
    ELSE NULL
END
WHERE fd_role_id IS NULL;

-- 5. 说明
-- - fd_role 字段保留，用于向后兼容
-- - fd_role_id 字段是新的角色关联字段，指向 sys_role 表
-- - 新建用户时，应该使用 fd_role_id 字段
-- - 查询用户角色时，应该关联 sys_role 表获取详细信息
