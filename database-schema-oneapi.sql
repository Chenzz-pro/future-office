-- oneAPI配置表
-- 用于存储全局统一大模型配置
-- 支持OpenAI、DeepSeek、豆包等多种模型

CREATE TABLE IF NOT EXISTS oneapi_configs (
  -- 主键ID
  id VARCHAR(36) PRIMARY KEY COMMENT '配置ID（UUID）',

  -- 基本信息
  name VARCHAR(100) NOT NULL COMMENT '配置名称',
  description VARCHAR(500) COMMENT '配置描述',

  -- oneAPI配置
  base_url VARCHAR(500) NOT NULL COMMENT 'oneAPI服务地址（如：https://api.openai.com/v1）',
  api_key VARCHAR(500) NOT NULL COMMENT 'API密钥',
  model VARCHAR(100) NOT NULL COMMENT '模型名称（如：gpt-4、deepseek-chat、doubao-pro-4k等）',

  -- 状态控制
  enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',

  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  -- 索引
  UNIQUE KEY uk_name (name),
  KEY idx_enabled (enabled),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='oneAPI配置表';
