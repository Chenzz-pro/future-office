-- 角色表创建脚本
-- 创建时间：2026-04-06
-- 说明：创建角色表，将 sys_org_person 表的 fd_role 字段从字符串改为外键关联

-- 1. 创建角色表
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
  fd_update_by VARCHAR(36) DEFAULT NULL COMMENT '更新人ID'
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

-- 3. 修改 sys_org_person 表的 fd_role 字段类型
-- 注意：如果表中已有数据，需要先迁移数据

-- 3.1 添加新的 fd_role_id 字段（临时字段，用于迁移数据）
ALTER TABLE sys_org_person ADD COLUMN fd_role_id VARCHAR(36) DEFAULT NULL COMMENT '角色ID（外键关联sys_role表）' AFTER fd_is_login_enabled;

-- 3.2 迁移数据：将旧的 fd_role 字符串映射到 fd_role_id
UPDATE sys_org_person p
INNER JOIN sys_role r ON p.fd_role = r.fd_code
SET p.fd_role_id = r.fd_id
WHERE p.fd_role IS NOT NULL;

-- 3.3 删除旧的 fd_role 字段
ALTER TABLE sys_org_person DROP COLUMN fd_role;

-- 3.4 重命名 fd_role_id 为 fd_role
ALTER TABLE sys_org_person CHANGE COLUMN fd_role_id fd_role VARCHAR(36) DEFAULT NULL COMMENT '角色ID（外键关联sys_role表）';

-- 3.5 添加外键约束
ALTER TABLE sys_org_person
ADD CONSTRAINT fk_org_person_role
FOREIGN KEY (fd_role) REFERENCES sys_role(fd_id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 4. 为 sys_role 表添加索引
CREATE INDEX idx_role_code ON sys_role(fd_code);
CREATE INDEX idx_role_available ON sys_role(fd_is_available);

-- 5. 为 sys_org_person 表的 fd_role 添加索引
CREATE INDEX idx_org_person_role ON sys_org_person(fd_role);
