-- ============================================================
-- 数据库迁移脚本：为 sys_org_person 表添加 role 字段
-- 版本: 1.0.1
-- 创建日期: 2024-01-20
-- ============================================================

-- 添加 role 字段
ALTER TABLE sys_org_person
ADD COLUMN fd_role ENUM('admin', 'user') DEFAULT 'user' COMMENT '用户角色：admin=管理员，user=普通用户'
AFTER fd_is_login_enabled;

-- 添加索引
ALTER TABLE sys_org_person
ADD INDEX idx_role (fd_role);

-- 将第一个创建的用户（admin）设置为管理员
UPDATE sys_org_person
SET fd_role = 'admin'
WHERE fd_login_name IN ('admin', 'system');

-- 更新表注释
ALTER TABLE sys_org_person
COMMENT = '人员表（系统用户表）';
