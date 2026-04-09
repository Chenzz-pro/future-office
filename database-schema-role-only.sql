-- ============================================
-- 角色表创建和初始化脚本
-- 用于手动创建 sys_role 表并插入默认数据
-- ============================================

-- 1. 创建 sys_role 表
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

-- 2. 插入默认角色数据
INSERT INTO sys_role (fd_id, fd_name, fd_code, fd_description, fd_order) VALUES
('00000000-0000-0000-0000-000000000001', '超级管理员', 'admin', '拥有系统所有权限，包括组织管理、用户管理、系统配置等', 1),
('00000000-0000-0000-0000-000000000002', '管理员', 'manager', '拥有大部分管理权限，包括用户管理、数据管理等', 2),
('00000000-0000-0000-0000-000000000003', '普通用户', 'user', '普通用户权限，只能访问自己的数据', 3)
ON DUPLICATE KEY UPDATE
  fd_name = VALUES(fd_name),
  fd_description = VALUES(fd_description),
  fd_order = VALUES(fd_order);

-- 3. 检查 sys_org_person 表的 fd_role 字段类型
-- 如果是 ENUM 类型，需要执行以下迁移步骤：

-- 3.1 添加新的临时字段
ALTER TABLE sys_org_person
ADD COLUMN fd_role_new VARCHAR(36) DEFAULT '00000000-0000-0000-0000-000000000003' COMMENT '用户角色ID（关联 sys_role.fd_id）';

-- 3.2 迁移数据：将旧的角色值映射到新的角色ID
UPDATE sys_org_person
SET fd_role_new = CASE
  WHEN fd_role IN ('admin', 'administrator') THEN '00000000-0000-0000-0000-000000000001'
  WHEN fd_role = 'manager' THEN '00000000-0000-0000-0000-000000000002'
  ELSE '00000000-0000-0000-0000-000000000003'
END;

-- 3.3 删除旧字段
ALTER TABLE sys_org_person DROP COLUMN fd_role;

-- 3.4 重命名新字段
ALTER TABLE sys_org_person CHANGE fd_role_new fd_role VARCHAR(36) DEFAULT '00000000-0000-0000-0000-000000000003' COMMENT '用户角色ID（关联 sys_role.fd_id）';

-- 3.5 添加外键约束
ALTER TABLE sys_org_person
ADD CONSTRAINT fk_org_person_role
FOREIGN KEY (fd_role) REFERENCES sys_role(fd_id) ON DELETE SET NULL;

-- 4. 验证结果
SELECT '✅ sys_role 表创建成功' AS status;
SELECT * FROM sys_role ORDER BY fd_order;
SELECT '✅ 角色数据初始化完成' AS status;
SELECT COUNT(*) AS role_count FROM sys_role;
