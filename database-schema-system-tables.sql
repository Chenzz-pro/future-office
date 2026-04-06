-- ============================================================
-- 系统核心表初始化脚本
-- 用于手动创建系统核心表（如果自动初始化失败）
-- ============================================================

-- 1. 创建数据库配置表
CREATE TABLE IF NOT EXISTS database_configs (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '配置名称',
  type ENUM('mysql', 'postgresql') NOT NULL DEFAULT 'mysql',
  host VARCHAR(255) NOT NULL COMMENT '数据库主机',
  port INT NOT NULL DEFAULT 3306 COMMENT '数据库端口',
  database_name VARCHAR(100) NOT NULL COMMENT '数据库名',
  username VARCHAR(100) NOT NULL COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
  is_default BOOLEAN DEFAULT FALSE COMMENT '是否为默认配置',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active),
  INDEX idx_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库配置表';

-- 2. 创建 API Keys 配置表
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID（sys_org_person.fd_id）',
  name VARCHAR(100) NOT NULL COMMENT '配置名称',
  provider ENUM('openai', 'claude', 'deepseek', 'doubao', 'custom') NOT NULL COMMENT '提供商',
  api_key VARCHAR(500) NOT NULL COMMENT 'API Key（加密）',
  base_url VARCHAR(500) COMMENT '自定义基础URL',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_provider (provider),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API Keys配置表';

-- 3. 创建对话会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID（sys_org_person.fd_id）',
  title VARCHAR(500) NOT NULL COMMENT '会话标题',
  agent_id VARCHAR(36) COMMENT '使用的智能体ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对话会话表';

-- 4. 创建对话消息表
CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL COMMENT '会话ID',
  role ENUM('user', 'assistant', 'system') NOT NULL COMMENT '角色',
  content TEXT NOT NULL COMMENT '消息内容',
  metadata JSON COMMENT '元数据（如技能调用、token使用等）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对话消息表';

-- 5. 创建自定义技能表
CREATE TABLE IF NOT EXISTS custom_skills (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT '创建用户ID（sys_org_person.fd_id）',
  name VARCHAR(100) NOT NULL COMMENT '技能名称',
  description TEXT COMMENT '技能描述',
  icon VARCHAR(50) COMMENT '图标名称',
  category VARCHAR(50) COMMENT '分类',
  enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  api_config JSON NOT NULL COMMENT 'API配置',
  auth_config JSON COMMENT '认证配置',
  request_params JSON COMMENT '请求参数配置',
  body_template JSON COMMENT '请求体模板',
  response_parsing JSON COMMENT '响应解析规则',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_category (category),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自定义技能表';

-- 6. 创建 EKP 配置表
CREATE TABLE IF NOT EXISTS ekp_configs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID（sys_org_person.fd_id）',
  ekp_address VARCHAR(500) NOT NULL COMMENT 'EKP地址',
  username VARCHAR(100) COMMENT '用户名',
  password VARCHAR(255) COMMENT '密码（加密）',
  auth_type ENUM('basic', 'oauth', 'none') DEFAULT 'basic' COMMENT '认证类型',
  config JSON COMMENT '额外配置',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP配置表';

-- 7. 创建组织架构表（为管理后台预留）
CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '组织名称',
  parent_id VARCHAR(36) COMMENT '父组织ID',
  description TEXT COMMENT '描述',
  manager_id VARCHAR(36) COMMENT '负责人ID（sys_org_person.fd_id）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent_id (parent_id),
  INDEX idx_manager_id (manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织架构表';
