-- =====================================================
-- 用户绑定配置表
-- 用于存储EKP用户与本系统用户的绑定关系
-- =====================================================

-- 用户绑定配置表
CREATE TABLE IF NOT EXISTS user_bindings (
    id VARCHAR(36) PRIMARY KEY COMMENT '绑定ID',
    local_user_id VARCHAR(36) COMMENT '本系统用户ID（关联sys_org_person.fd_id）',
    local_username VARCHAR(100) COMMENT '本系统用户名',
    ekp_user_id VARCHAR(100) COMMENT 'EKP用户ID',
    ekp_username VARCHAR(100) COMMENT 'EKP用户名',
    ekp_login_name VARCHAR(100) COMMENT 'EKP登录名',
    binding_type ENUM('manual', 'auto', 'role') NOT NULL DEFAULT 'manual' COMMENT '绑定类型',
    binding_reason VARCHAR(500) COMMENT '绑定原因',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否生效',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(36) COMMENT '创建人',
    INDEX idx_local_user (local_user_id),
    INDEX idx_ekp_user (ekp_user_id),
    INDEX idx_ekp_login (ekp_login_name),
    INDEX idx_binding_type (binding_type),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户绑定配置表';

-- 角色映射规则表
CREATE TABLE IF NOT EXISTS role_mappings (
    id VARCHAR(36) PRIMARY KEY COMMENT '映射ID',
    local_role_id VARCHAR(36) COMMENT '本系统角色ID（关联sys_role.fd_id）',
    local_role_name VARCHAR(100) COMMENT '本系统角色名称',
    ekp_role_id VARCHAR(100) COMMENT 'EKP角色ID',
    ekp_role_name VARCHAR(100) COMMENT 'EKP角色名称',
    ekp_role_code VARCHAR(100) COMMENT 'EKP角色代码',
    priority INT DEFAULT 0 COMMENT '优先级（数字越大优先级越高）',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否生效',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_local_role (local_role_id),
    INDEX idx_ekp_role (ekp_role_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色映射规则表';

-- =====================================================
-- 初始化默认角色映射规则
-- =====================================================

-- 插入默认的角色映射规则（超级管理员）
INSERT INTO role_mappings (id, local_role_id, local_role_name, ekp_role_id, ekp_role_name, ekp_role_code, priority, is_active)
SELECT * FROM (
    SELECT '550e8400-e29b-41d4-a716-446655440001' as id,
           '00000000-0000-0000-0000-000000000001' as local_role_id,
           '超级管理员' as local_role_name,
           'SUPER_ADMIN' as ekp_role_id,
           '系统管理员' as ekp_role_name,
           'sys_admin' as ekp_role_code,
           100 as priority,
           TRUE as is_active
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM role_mappings WHERE ekp_role_code = 'sys_admin');

-- 插入默认的角色映射规则（管理员）
INSERT INTO role_mappings (id, local_role_id, local_role_name, ekp_role_id, ekp_role_name, ekp_role_code, priority, is_active)
SELECT * FROM (
    SELECT '550e8400-e29b-41d4-a716-446655440002' as id,
           '00000000-0000-0000-0000-000000000002' as local_role_id,
           '管理员' as local_role_name,
           'ADMIN' as ekp_role_id,
           '管理员' as ekp_role_name,
           'admin' as ekp_role_code,
           90 as priority,
           TRUE as is_active
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM role_mappings WHERE ekp_role_code = 'admin');

-- 插入默认的角色映射规则（普通用户）
INSERT INTO role_mappings (id, local_role_id, local_role_name, ekp_role_id, ekp_role_name, ekp_role_code, priority, is_active)
SELECT * FROM (
    SELECT '550e8400-e29b-41d4-a716-446655440003' as id,
           '00000000-0000-0000-0000-000000000003' as local_role_id,
           '普通用户' as local_role_name,
           'USER' as ekp_role_id,
           '普通用户' as ekp_role_name,
           'user' as ekp_role_code,
           10 as priority,
           TRUE as is_active
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM role_mappings WHERE ekp_role_code = 'user');

-- =====================================================
-- 初始化默认的用户绑定规则
-- =====================================================

-- 插入admin账户的默认绑定规则（如果EKP管理员的登录名与admin相同，则自动绑定）
INSERT INTO user_bindings (id, local_user_id, local_username, ekp_login_name, binding_type, binding_reason, is_active)
SELECT * FROM (
    SELECT '660e8400-e29b-41d4-a716-446655440001' as id,
           NULL as local_user_id,
           'admin' as local_username,
           'admin' as ekp_login_name,
           'auto' as binding_type,
           '自动绑定：EKP管理员账号与本系统admin账号名相同' as binding_reason,
           TRUE as is_active
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM user_bindings WHERE ekp_login_name = 'admin');
