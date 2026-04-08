-- =====================================================
-- 定时任务表结构
-- 用于存储定时任务定义和执行记录
-- =====================================================

-- 1. 定时任务定义表
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id VARCHAR(36) PRIMARY KEY COMMENT '任务ID',
    name VARCHAR(200) NOT NULL COMMENT '任务名称',
    description VARCHAR(500) COMMENT '任务描述',
    type ENUM('org_sync', 'data_backup', 'cache_cleanup', 'report_generation', 'custom') NOT NULL COMMENT '任务类型',
    `group` ENUM('system', 'integration', 'business', 'custom') NOT NULL COMMENT '任务分组',
    enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    schedule_type ENUM('interval', 'cron', 'once') NOT NULL COMMENT '调度类型',
    cron_expression VARCHAR(100) COMMENT 'Cron表达式',
    interval_minutes INT COMMENT '间隔分钟数',
    interval_hours INT COMMENT '间隔小时数',
    related_system VARCHAR(100) COMMENT '关联系统',
    handler_type ENUM('api', 'script', 'function') NOT NULL COMMENT '处理器类型',
    handler_path VARCHAR(500) NOT NULL COMMENT '处理器路径',
    handler_params JSON COMMENT '处理器参数',
    max_retries INT DEFAULT 0 COMMENT '最大重试次数',
    retry_interval_seconds INT DEFAULT 60 COMMENT '重试间隔秒数',
    timeout_seconds INT DEFAULT 300 COMMENT '超时秒数',
    max_concurrent INT DEFAULT 1 COMMENT '最大并发数',
    max_executions_per_day INT COMMENT '每日最大执行次数',
    metadata JSON COMMENT '元数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(36) COMMENT '创建人',
    UNIQUE KEY uk_name (name),
    INDEX idx_type (type),
    INDEX idx_group (`group`),
    INDEX idx_enabled (enabled),
    INDEX idx_related_system (related_system)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时任务定义表';

-- 2. 任务执行记录表
CREATE TABLE IF NOT EXISTS task_executions (
    id VARCHAR(36) PRIMARY KEY COMMENT '执行ID',
    task_id VARCHAR(36) NOT NULL COMMENT '任务ID',
    task_name VARCHAR(200) NOT NULL COMMENT '任务名称',
    task_type VARCHAR(50) NOT NULL COMMENT '任务类型',
    status ENUM('pending', 'running', 'success', 'failed', 'cancelled', 'paused') NOT NULL COMMENT '状态',
    triggered_by ENUM('schedule', 'manual', 'api') NOT NULL COMMENT '触发方式',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    duration_seconds INT COMMENT '耗时秒数',
    result_message TEXT COMMENT '结果消息',
    result_data JSON COMMENT '结果数据',
    error_code VARCHAR(50) COMMENT '错误码',
    error_message TEXT COMMENT '错误消息',
    error_stack TEXT COMMENT '错误堆栈',
    parameters JSON COMMENT '执行参数',
    logs TEXT COMMENT '执行日志',
    INDEX idx_task_id (task_id),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at),
    INDEX idx_triggered_by (triggered_by),
    INDEX idx_task_type (task_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务执行记录表';
