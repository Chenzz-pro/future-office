-- ============================================
-- EKP官方接口配置表
-- 存储蓝凌EKP系统官方提供的接口
-- ============================================
CREATE TABLE IF NOT EXISTS ekp_official_interfaces (
  id VARCHAR(36) PRIMARY KEY COMMENT '接口ID',
  code VARCHAR(100) NOT NULL UNIQUE COMMENT '接口代码（唯一标识）',
  name VARCHAR(200) NOT NULL COMMENT '接口名称',
  description TEXT COMMENT '接口描述',
  category VARCHAR(50) NOT NULL COMMENT '接口分类',
  endpoint VARCHAR(500) NOT NULL COMMENT '接口路径',
  method VARCHAR(10) NOT NULL COMMENT 'HTTP方法（GET/POST/PUT/DELETE）',
  enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用（1=启用，0=禁用）',
  metadata JSON COMMENT '接口元数据（参数、响应示例等）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_code (code),
  INDEX idx_category (category),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP官方接口配置表';
