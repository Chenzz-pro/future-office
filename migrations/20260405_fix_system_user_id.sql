-- 迁移脚本：将 user_id = 'system' 的记录更新为正确的 UUID
-- 执行日期：2026-04-05
-- 说明：修复外键约束错误，统一使用 UUID 格式的 system user ID

-- 更新 api_keys 表
UPDATE api_keys
SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id = 'system';

-- 更新 ekp_configs 表
UPDATE ekp_configs
SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id = 'system';

-- 更新 chat_sessions 表（如果有）
UPDATE chat_sessions
SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id = 'system';

-- 更新 custom_skills 表（如果有）
UPDATE custom_skills
SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id = 'system';
