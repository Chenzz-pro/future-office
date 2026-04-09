-- ============================================================
-- 数据迁移脚本：从 users 表迁移到 sys_org_person
-- 版本: 1.0.2
-- 创建日期: 2024-01-20
-- ============================================================

-- 注意：
-- 1. 此脚本将 users 表的数据迁移到 sys_org_person 表
-- 2. 迁移前请确保已添加 role 字段到 sys_org_person 表
-- 3. 如果 sys_org_person 表中已存在对应的用户（通过 fd_login_name 匹配），则跳过
-- 4. 迁移完成后，可以将 users 表重命名为 users_backup

-- 创建临时表存储需要迁移的数据
CREATE TEMPORARY TABLE temp_users_to_migrate AS
SELECT
    id,
    username,
    password,
    email,
    role,
    created_at,
    updated_at
FROM users
WHERE username NOT IN (
    SELECT fd_login_name
    FROM sys_org_person
    WHERE fd_login_name IS NOT NULL
);

-- 插入数据到 sys_org_person
INSERT INTO sys_org_person (
    fd_id,
    fd_login_name,
    fd_password,
    fd_email,
    fd_role,
    fd_create_time,
    fd_alter_time
)
SELECT
    id,
    username,
    password,
    email,
    role,
    created_at,
    updated_at
FROM temp_users_to_migrate;

-- 输出迁移结果
SELECT
    '迁移完成' AS message,
    COUNT(*) AS migrated_count
FROM temp_users_to_migrate;

-- 删除临时表
DROP TEMPORARY TABLE IF EXISTS temp_users_to_migrate;

-- 提示：确认数据无误后，可以执行以下命令重命名 users 表
-- ALTER TABLE users RENAME TO users_backup;
