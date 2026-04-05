/**
 * 数据迁移 API
 * 从 users 表迁移数据到 sys_org_person
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { hashPassword } from '@/lib/password/password-utils';

/**
 * GET /api/migrate/users-to-sys-org-person
 * 获取迁移预览
 */
export async function GET(request: NextRequest) {
  try {
    // 检查 users 表是否存在
    const tablesResult = await dbManager.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
    );
    const hasUsersTable = tablesResult.rows.length > 0;

    if (!hasUsersTable) {
      return NextResponse.json({
        success: true,
        data: {
          hasUsersTable: false,
          message: 'users 表不存在，无需迁移',
          totalCount: 0,
        },
      });
    }

    // 查询需要迁移的用户
    const result = await dbManager.query(
      `
      SELECT
        u.id,
        u.username,
        u.password,
        u.email,
        u.role,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.username NOT IN (
        SELECT fd_login_name
        FROM sys_org_person
        WHERE fd_login_name IS NOT NULL
      )
      `
    );

    const users = result.rows as Array<Record<string, unknown>>;

    return NextResponse.json({
      success: true,
      data: {
        hasUsersTable: true,
        totalCount: users.length,
        users: users.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        })),
      },
    });
  } catch (error: unknown) {
    console.error('[API:Migrate] 获取迁移预览失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/migrate/users-to-sys-org-person
 * 执行迁移
 */
export async function POST(request: NextRequest) {
  try {
    // 检查 users 表是否存在
    const tablesResult = await dbManager.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
    );
    const hasUsersTable = tablesResult.rows.length > 0;

    if (!hasUsersTable) {
      return NextResponse.json({
        success: true,
        message: 'users 表不存在，无需迁移',
        data: { migratedCount: 0, failedCount: 0 },
      });
    }

    // 查询需要迁移的用户
    const result = await dbManager.query(
      `
      SELECT
        u.id,
        u.username,
        u.password,
        u.email,
        u.role,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.username NOT IN (
        SELECT fd_login_name
        FROM sys_org_person
        WHERE fd_login_name IS NOT NULL
      )
      `
    );

    const users = result.rows as Array<Record<string, unknown>>;

    let migratedCount = 0;
    let failedCount = 0;

    for (const user of users) {
      try {
        // 检查是否是 base64 编码的密码，如果是，则重新加密为 bcrypt
        const password = user.password as string;
        let hashedPassword = password;

        // 如果不是 bcrypt 密码，重新加密
        if (!password.startsWith('$2')) {
          console.log('[Migrate] 重新加密用户密码:', user.username);
          hashedPassword = await hashPassword(password);
        }

        // 插入到 sys_org_person
        await dbManager.query(
          `
          INSERT INTO sys_org_person (
            fd_id,
            fd_login_name,
            fd_password,
            fd_email,
            fd_role,
            fd_create_time,
            fd_alter_time,
            fd_is_login_enabled,
            fd_is_business_related
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
          `,
          [
            user.id,
            user.username,
            hashedPassword,
            user.email,
            user.role,
            user.created_at || new Date(),
            user.updated_at || new Date(),
          ]
        );

        migratedCount++;
        console.log('[Migrate] 迁移成功:', user.username);
      } catch (error) {
        failedCount++;
        console.error('[Migrate] 迁移失败:', user.username, error);
      }
    }

    const message = `迁移完成：成功 ${migratedCount} 个，失败 ${failedCount} 个`;

    console.log('[Migrate]', message);

    return NextResponse.json({
      success: true,
      message,
      data: {
        migratedCount,
        failedCount,
        totalCount: users.length,
      },
    });
  } catch (error: unknown) {
    console.error('[API:Migrate] 执行迁移失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
