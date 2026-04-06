/**
 * 数据库迁移 API - 角色表迁移
 * 将 sys_org_person 表的 fd_role 字段从 ENUM 类型迁移到外键关联 sys_role 表
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

// 角色ID常量
const ADMIN_ROLE_ID = '00000000-0000-0000-0000-000000000001';
const MANAGER_ROLE_ID = '00000000-0000-0000-0000-000000000002';
const USER_ROLE_ID = '00000000-0000-0000-0000-000000000003';

/**
 * GET /api/database/migrate/role
 * 检查是否需要迁移
 */
export async function GET(request: NextRequest) {
  try {
    // 检查数据库是否已连接
    const isConnected = await dbManager.isConnected();

    if (!isConnected) {
      return NextResponse.json({
        success: false,
        needMigration: false,
        message: '数据库未连接',
      });
    }

    // 检查 sys_role 表是否存在
    const roleTableCheck = await dbManager.query<{ exists: number }>(
      `SELECT COUNT(*) as exists
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
       AND table_name = 'sys_role'`
    );

    const roleTableExists = (roleTableCheck.rows[0] as { exists: number })?.exists === 1;

    // 检查 fd_role 字段类型
    const columnCheck = await dbManager.query<any>(
      `SELECT DATA_TYPE, COLUMN_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'sys_org_person'
       AND COLUMN_NAME = 'fd_role'`
    );

    const columnInfo = columnCheck.rows[0] as { DATA_TYPE: string; COLUMN_TYPE: string } | undefined;
    const isEnumType = columnInfo?.DATA_TYPE === 'enum';

    return NextResponse.json({
      success: true,
      roleTableExists,
      isEnumType,
      needMigration: isEnumType || !roleTableExists,
      message: isEnumType ? '需要迁移：fd_role 字段是 ENUM 类型' : '无需迁移',
    });
  } catch (error: unknown) {
    console.error('[API:Database:Migrate:Role] 检查迁移状态失败:', error);
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
 * POST /api/database/migrate/role
 * 执行角色表迁移
 */
export async function POST(request: NextRequest) {
  const connection = await dbManager.getConnection();

  try {
    // 开始事务
    await connection.query('START TRANSACTION');

    console.log('[API:Database:Migrate:Role] 开始角色表迁移...');

    // 1. 创建 sys_role 表（如果不存在）
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
    console.log('[API:Database:Migrate:Role] sys_role 表创建成功');

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
    console.log('[API:Database:Migrate:Role] 默认角色数据插入成功');

    // 3. 检查 fd_role 字段类型，如果是 ENUM 类型，需要迁移
    const columnCheck = await connection.query<any>(
      `SELECT DATA_TYPE, COLUMN_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'sys_org_person'
       AND COLUMN_NAME = 'fd_role'`
    );

    const columnInfo = columnCheck.rows[0] as { DATA_TYPE: string; COLUMN_TYPE: string } | undefined;
    const isEnumType = columnInfo?.DATA_TYPE === 'enum';

    if (isEnumType) {
      console.log('[API:Database:Migrate:Role] 检测到 fd_role 字段是 ENUM 类型，开始迁移...');

      // 4. 添加新的临时字段
      await connection.query(`
        ALTER TABLE sys_org_person
        ADD COLUMN fd_role_new VARCHAR(36) DEFAULT ? COMMENT '用户角色ID（关联 sys_role.fd_id）'
      `, [USER_ROLE_ID]);
      console.log('[API:Database:Migrate:Role] 临时字段 fd_role_new 创建成功');

      // 5. 迁移数据：将旧的角色值映射到新的角色ID
      await connection.query(`
        UPDATE sys_org_person
        SET fd_role_new = CASE
          WHEN fd_role IN ('admin', 'administrator') THEN ?
          WHEN fd_role = 'manager' THEN ?
          ELSE ?
        END
      `, [ADMIN_ROLE_ID, MANAGER_ROLE_ID, USER_ROLE_ID]);
      console.log('[API:Database:Migrate:Role] 角色数据迁移成功');

      // 6. 删除旧字段
      await connection.query(`ALTER TABLE sys_org_person DROP COLUMN fd_role`);
      console.log('[API:Database:Migrate:Role] 旧字段 fd_role 删除成功');

      // 7. 重命名新字段
      await connection.query(`ALTER TABLE sys_org_person CHANGE fd_role_new fd_role VARCHAR(36) DEFAULT ? COMMENT '用户角色ID（关联 sys_role.fd_id）'`, [USER_ROLE_ID]);
      console.log('[API:Database:Migrate:Role] 字段重命名成功');

      // 8. 添加外键约束
      await connection.query(`
        ALTER TABLE sys_org_person
        ADD CONSTRAINT fk_org_person_role
        FOREIGN KEY (fd_role) REFERENCES sys_role(fd_id) ON DELETE SET NULL
      `);
      console.log('[API:Database:Migrate:Role] 外键约束添加成功');
    } else {
      console.log('[API:Database:Migrate:Role] fd_role 字段已经是正确的类型，跳过迁移');
    }

    // 提交事务
    await connection.query('COMMIT');
    console.log('[API:Database:Migrate:Role] 迁移成功');

    return NextResponse.json({
      success: true,
      message: '角色表迁移成功',
      migrated: isEnumType,
    });
  } catch (error: unknown) {
    // 回滚事务
    await connection.query('ROLLBACK');
    console.error('[API:Database:Migrate:Role] 迁移失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    // 释放连接
    connection.release();
  }
}
