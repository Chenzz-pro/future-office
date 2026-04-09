/**
 * 初始化组织架构同步相关表
 * 用于手动创建org_sync_logs、org_sync_details等表
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

/**
 * POST /api/database/init/sync-tables
 * 初始化组织架构同步表
 */
export async function POST(request: NextRequest) {
  try {
    // 检查数据库是否已连接
    const isConnected = await dbManager.isConnected();

    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: '数据库未连接，请先配置数据库连接',
        },
        { status: 400 }
      );
    }

    console.log('[InitSyncTables] 开始创建组织架构同步表...');

    // 1. 创建同步日志表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS org_sync_logs (
        id VARCHAR(36) PRIMARY KEY COMMENT '同步日志ID',
        sync_type ENUM('full', 'incremental') NOT NULL COMMENT '同步类型：full-全量，incremental-增量',
        sync_mode ENUM('time', 'org', 'all') DEFAULT 'all' COMMENT '同步模式：time-按时间范围，org-按机构范围，all-全部',
        status ENUM('running', 'completed', 'failed', 'cancelled') NOT NULL COMMENT '状态',
        start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
        end_time TIMESTAMP NULL COMMENT '结束时间',
        duration_seconds INT COMMENT '耗时（秒）',
        begin_time_stamp VARCHAR(50) COMMENT '开始时间戳（yyyy-MM-dd HH:mm:ss.SSS）',
        end_time_stamp VARCHAR(50) COMMENT '结束时间戳（yyyy-MM-dd HH:mm:ss.SSS）',
        next_time_stamp VARCHAR(50) COMMENT '下次同步的起始时间戳',
        org_scope JSON COMMENT '机构范围（机构ID列表）',
        return_org_type JSON COMMENT '同步的组织类型 [{"type":"org"},{"type":"dept"},{"type":"post"},{"type":"person"}]',
        total_count INT DEFAULT 0 COMMENT '总处理数据量',
        org_count INT DEFAULT 0 COMMENT '机构数量',
        dept_count INT DEFAULT 0 COMMENT '部门数量',
        post_count INT DEFAULT 0 COMMENT '岗位数量',
        group_count INT DEFAULT 0 COMMENT '群组数量',
        person_count INT DEFAULT 0 COMMENT '人员数量',
        insert_count INT DEFAULT 0 COMMENT '新增数量',
        update_count INT DEFAULT 0 COMMENT '更新数量',
        delete_count INT DEFAULT 0 COMMENT '软删除数量',
        error_count INT DEFAULT 0 COMMENT '错误数量',
        error_message TEXT COMMENT '错误信息',
        error_details JSON COMMENT '错误详情（失败的记录列表）',
        triggered_by VARCHAR(50) COMMENT '触发方式：manual-手动，scheduled-定时，webhook-回调',
        operator_id VARCHAR(36) COMMENT '操作人ID',
        operator_name VARCHAR(100) COMMENT '操作人姓名',
        remark TEXT COMMENT '备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_sync_type (sync_type),
        INDEX idx_status (status),
        INDEX idx_start_time (start_time),
        INDEX idx_triggered_by (triggered_by),
        INDEX idx_operator_id (operator_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织架构同步日志表'
    `);
    console.log('[InitSyncTables] org_sync_logs 表创建成功');

    // 2. 创建同步明细表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS org_sync_details (
        id VARCHAR(36) PRIMARY KEY COMMENT '明细ID',
        sync_log_id VARCHAR(36) NOT NULL COMMENT '同步日志ID',
        data_type ENUM('org', 'dept', 'group', 'post', 'person') NOT NULL COMMENT '数据类型',
        action ENUM('insert', 'update', 'delete', 'skip', 'error') NOT NULL COMMENT '操作类型',
        ekp_id VARCHAR(100) NOT NULL COMMENT 'EKP ID',
        ekp_lunid VARCHAR(100) COMMENT 'EKP LUNID（可作为主键）',
        local_id VARCHAR(36) COMMENT '本地ID',
        ekp_name VARCHAR(200) COMMENT 'EKP名称',
        old_data JSON COMMENT '修改前数据',
        new_data JSON COMMENT '修改后数据',
        error_message TEXT COMMENT '错误信息',
        error_code VARCHAR(50) COMMENT '错误码',
        batch_no INT COMMENT '批次号',
        is_processed TINYINT(1) DEFAULT 1 COMMENT '是否已处理',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_sync_log_id (sync_log_id),
        INDEX idx_ekp_id (ekp_id),
        INDEX idx_data_type (data_type),
        INDEX idx_action (action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织架构同步明细表'
    `);
    console.log('[InitSyncTables] org_sync_details 表创建成功');

    // 3. 创建同步令牌表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS org_sync_tokens (
        id VARCHAR(36) PRIMARY KEY COMMENT '令牌ID',
        token_name VARCHAR(100) NOT NULL UNIQUE COMMENT '令牌名称',
        token_value VARCHAR(100) COMMENT '令牌值（时间戳）',
        last_sync_time TIMESTAMP NULL COMMENT '上次同步时间',
        token_type ENUM('timestamp', 'page_token') DEFAULT 'timestamp' COMMENT '令牌类型：timestamp-时间戳，page_token-分页令牌',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_token_name (token_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织架构同步令牌表'
    `);
    console.log('[InitSyncTables] org_sync_tokens 表创建成功');

    // 4. 创建同步配置表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS org_sync_configs (
        id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
        config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
        config_value TEXT COMMENT '配置值',
        config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
        description VARCHAR(500) COMMENT '配置描述',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_config_key (config_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织架构同步配置表'
    `);
    console.log('[InitSyncTables] org_sync_configs 表创建成功');

    // 5. 创建职务级别表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS sys_org_staffing_level (
        fd_id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
        fd_name VARCHAR(200) NOT NULL COMMENT '职务名称',
        fd_level INT NOT NULL COMMENT '职务级别',
        fd_description VARCHAR(1500) COMMENT '描述',
        fd_is_default TINYINT(1) DEFAULT 0 COMMENT '是否默认：1=是，0=否',
        fd_is_available TINYINT(1) DEFAULT 1 COMMENT '是否有效：1=有效，0=无效',
        doc_create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        doc_alter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
        doc_creator_id VARCHAR(36) COMMENT '创建者ID',
        fd_import_info VARCHAR(200) COMMENT '导入的数据的对应键值',
        INDEX idx_level (fd_level)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='职务级别表'
    `);
    console.log('[InitSyncTables] sys_org_staffing_level 表创建成功');

    // 5. 插入默认配置
    const defaultConfigs = [
      { key: 'sync.batch_size', value: '500', type: 'number', description: '同步批次大小' },
      { key: 'sync.timeout', value: '300', type: 'number', description: '同步超时时间（秒）' },
      { key: 'sync.retry.max', value: '3', type: 'number', description: '最大重试次数' },
      { key: 'sync.enabled', value: 'true', type: 'boolean', description: '是否启用同步' },
      { key: 'sync.last_full_sync', value: '', type: 'string', description: '上次全量同步时间' },
      { key: 'sync.last_incremental_sync', value: '', type: 'string', description: '上次增量同步时间' }
    ];

    for (const config of defaultConfigs) {
      await dbManager.query(
        `INSERT INTO org_sync_configs (id, config_key, config_value, config_type, description)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         config_value = VALUES(config_value),
         updated_at = CURRENT_TIMESTAMP`,
        [crypto.randomUUID(), config.key, config.value, config.type, config.description]
      );
    }
    console.log('[InitSyncTables] 默认配置插入成功');

    return NextResponse.json({
      success: true,
      message: '组织架构同步表初始化成功',
      data: {
        tables: ['org_sync_logs', 'org_sync_details', 'org_sync_tokens', 'org_sync_configs', 'sys_org_staffing_level'],
        configsCount: defaultConfigs.length
      }
    });
  } catch (error: unknown) {
    console.error('[InitSyncTables] 初始化失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
