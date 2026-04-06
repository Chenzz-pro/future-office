/**
 * 角色表初始化 API
 * 用于手动创建 sys_role 表并插入默认数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';

// 角色ID常量
const ADMIN_ROLE_ID = '00000000-0000-0000-0000-000000000001';
const MANAGER_ROLE_ID = '00000000-0000-0000-0000-000000000002';
const USER_ROLE_ID = '00000000-0000-0000-0000-000000000003';

/**
 * GET /api/database/init/role
 * 检查角色表状态
 */
export async function GET(request: NextRequest) {
  try {
    const isConnected = dbManager.isConnected();

    if (!isConnected) {
      return NextResponse.json({
        success: false,
        tableExists: false,
        hasData: false,
        message: '数据库未连接，请先配置数据库连接',
      });
    }

    // 检查 sys_role 表是否存在
    const tableCheckResult = await dbManager.query<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
       AND table_name = 'sys_role'`
    );

    const tableExists = (tableCheckResult.rows[0] as { count: number })?.count === 1;

    if (!tableExists) {
      return NextResponse.json({
        success: true,
        tableExists: false,
        hasData: false,
        message: '角色表不存在，需要创建',
      });
    }

    // 检查角色数据
    const dataCheckResult = await dbManager.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM sys_role`
    );

    const hasData = (dataCheckResult.rows[0] as { count: number })?.count > 0;

    return NextResponse.json({
      success: true,
      tableExists: true,
      hasData,
      message: hasData ? '角色表已存在且有数据' : '角色表已存在但无数据',
    });
  } catch (error: unknown) {
    console.error('[API:Database:Init:Role] 检查角色表状态失败:', error);
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

/**
 * POST /api/database/init/role
 * 创建角色表并插入默认数据
 */
export async function POST(request: NextRequest) {
  try {
    const isConnected = dbManager.isConnected();

    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: '数据库未连接，请先配置数据库连接',
        },
        { status: 400 }
      );
    }

    // 使用事务执行
    await dbManager.transaction(async (connection) => {
      // 1. 创建 sys_role 表
      await connection.query(`
        CREATE TABLE IF NOT EXISTS sys_role (
          fd_id VARCHAR(36) PRIMARY KEY COMMENT '角色ID',
          fd_name VARCHAR(100) NOT NULL COMMENT '角色名称',
          fd_code VARCHAR(50) NOT NULL UNIQUE COMMENT '角色代码（唯一标识）',
          fd_description VARCHAR(500) DEFAULT NULL COMMENT '角色描述',
          fd_order INT DEFAULT 0 COMMENT '排序号',
          fd_is_available TINYINT(1) DEFAULT 1 COMMENT '是否可用（1=是，0=否）',
          fd_create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          fd_update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          fd_create_by VARCHAR(36) DEFAULT NULL COMMENT '创建人ID',
          fd_update_by VARCHAR(36) DEFAULT NULL COMMENT '更新人ID',
          INDEX idx_role_code (fd_code),
          INDEX idx_role_available (fd_is_available)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统角色表'
      `);
      console.log('[API:Database:Init:Role] sys_role 表创建成功');

      // 2. 插入默认角色数据
      await connection.query(`
        INSERT INTO sys_role (fd_id, fd_name, fd_code, fd_description, fd_order) VALUES
        (?, '超级管理员', 'admin', '拥有系统所有权限，包括组织管理、用户管理、系统配置等', 1),
        (?, '管理员', 'manager', '拥有大部分管理权限，包括用户管理、数据管理等', 2),
        (?, '普通用户', 'user', '普通用户权限，只能访问自己的数据', 3)
        ON DUPLICATE KEY UPDATE
          fd_name = VALUES(fd_name),
          fd_description = VALUES(fd_description),
          fd_order = VALUES(fd_order)
      `, [ADMIN_ROLE_ID, MANAGER_ROLE_ID, USER_ROLE_ID]);
      console.log('[API:Database:Init:Role] 默认角色数据插入成功');
    });

    // 3. 检查是否需要迁移 sys_org_person 表的 fd_role 字段
    const columnCheckResult = await dbManager.query<{ DATA_TYPE: string }>(
      `SELECT DATA_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'sys_org_person'
       AND COLUMN_NAME = 'fd_role'`
    );

    const columnInfo = columnCheckResult.rows[0] as { DATA_TYPE: string } | undefined;
    const isEnumType = columnInfo?.DATA_TYPE === 'enum';

    let migrationNeeded = false;

    if (isEnumType) {
      console.log('[API:Database:Init:Role] 检测到 fd_role 字段是 ENUM 类型，需要迁移');
      migrationNeeded = true;
    }

    return NextResponse.json({
      success: true,
      message: '角色表创建成功',
      migrationNeeded,
      hint: migrationNeeded ? '检测到 fd_role 字段是旧格式，建议调用 /api/database/migrate/role 执行迁移' : '',
    });
  } catch (error: unknown) {
    console.error('[API:Database:Init:Role] 创建角色表失败:', error);
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
