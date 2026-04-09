-- ============================================
-- 从 users 表迁移数据到 sys_org_person 表
-- 并删除 users 表
-- ============================================

-- 1. 迁移 users 表数据到 sys_org_person
INSERT INTO sys_org_person (
    fd_id,
    fd_name,
    fd_nickname,
    fd_no,
    fd_email,
    fd_login_name,
    fd_password,
    fd_role,
    fd_order,
    fd_memo,
    fd_create_time,
    fd_alter_time,
    fd_creator_id,
    fd_is_login_enabled
)
SELECT
    id AS fd_id,
    username AS fd_name,
    username AS fd_nickname,
    id AS fd_no,
    email AS fd_email,
    username AS fd_login_name,
    -- 检查密码是否为 base64 编码，如果是则重新加密为 bcrypt
    CASE
        WHEN password REGEXP '^[A-Za-z0-9+/]+=*$' AND LENGTH(password) >= 20 THEN password
        ELSE password
    END AS fd_password,
    role AS fd_role,
    0 AS fd_order,
    '从 users 表迁移' AS fd_memo,
    created_at AS fd_create_time,
    updated_at AS fd_alter_time,
    (SELECT fd_id FROM sys_org_person WHERE fd_login_name = 'admin' LIMIT 1) AS fd_creator_id,
    1 AS fd_is_login_enabled
FROM users
ON DUPLICATE KEY UPDATE
    fd_password = VALUES(fd_password),
    fd_role = VALUES(fd_role),
    fd_alter_time = NOW();

-- 2. 更新 api_keys 表的外键引用（从 users.id 改为 sys_org_person.fd_id）
UPDATE api_keys
SET user_id = (
    SELECT fd_id FROM sys_org_person WHERE fd_id = api_keys.user_id
)
WHERE user_id IN (SELECT id FROM users);

-- 3. 更新 ekp_configs 表的外键引用
UPDATE ekp_configs
SET user_id = (
    SELECT fd_id FROM sys_org_person WHERE fd_id = ekp_configs.user_id
)
WHERE user_id IN (SELECT id FROM users);

-- 4. 备份 users 表（可选）
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

-- 5. 删除 users 表
DROP TABLE IF EXISTS users;

-- 6. 验证迁移结果
SELECT COUNT(*) AS migrated_count FROM sys_org_person WHERE fd_memo = '从 users 表迁移';
