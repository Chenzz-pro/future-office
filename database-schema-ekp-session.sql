-- EKP Session 存储表
-- 用于存储用户在 EKP 系统的登录态

CREATE TABLE IF NOT EXISTS `ekp_sessions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL COMMENT '我们系统的用户ID',
  `ekp_username` VARCHAR(128) NOT NULL COMMENT 'EKP 用户名',
  `ekp_session_id` VARCHAR(256) DEFAULT NULL COMMENT 'EKP Session ID',
  `ekp_cookie` TEXT COMMENT '加密后的 EKP Cookie',
  `ekp_token` VARCHAR(512) DEFAULT NULL COMMENT 'EKP Token (如果有)',
  `login_time` DATETIME NOT NULL COMMENT '登录时间',
  `expire_time` DATETIME NOT NULL COMMENT '过期时间',
  `is_valid` TINYINT(1) DEFAULT 1 COMMENT '是否有效',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_ekp_username` (`ekp_username`),
  KEY `idx_expire_time` (`expire_time`),
  KEY `idx_is_valid` (`is_valid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP Session 存储表';

-- EKP 用户绑定表
-- 用于存储用户绑定的 EKP 账号信息

CREATE TABLE IF NOT EXISTS `ekp_user_bindings` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL COMMENT '我们系统的用户ID',
  `ekp_username` VARCHAR(128) NOT NULL COMMENT 'EKP 用户名',
  `ekp_password_encrypted` TEXT COMMENT '加密后的 EKP 密码',
  `ekp_account_id` VARCHAR(128) DEFAULT NULL COMMENT 'EKP 账号ID',
  `bind_time` DATETIME NOT NULL COMMENT '绑定时间',
  `last_used_time` DATETIME DEFAULT NULL COMMENT '最后使用时间',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否激活',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_ekp_username` (`ekp_username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP 用户绑定表';
