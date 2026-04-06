/**
 * 系统初始化 API
 * 用于首次部署时创建默认管理员账号
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { hashPassword } from '@/lib/password/password-utils';

// 角色ID常量
const ADMIN_ROLE_ID = '00000000-0000-0000-0000-000000000001';
const MANAGER_ROLE_ID = '00000000-0000-0000-0000-000000000002';
const USER_ROLE_ID = '00000000-0000-0000-0000-000000000003';

/**
 * GET /api/system/init
 * 检查系统是否已初始化
 */
export async function GET(request: NextRequest) {
  try {
    // 检查数据库是否已连接
    const isConnected = await dbManager.isConnected();

    if (!isConnected) {
      return NextResponse.json({
        success: true,
        initialized: false,
        databaseConnected: false,
        message: '数据库未连接',
        reason: '数据库连接失败或未配置',
      });
    }

    // 检查是否存在有效的admin账户
    // 优化：检查登录名为'admin'且启用了登录的账户
    let adminExists = false;
    let adminCount = 0;
    let allAdminCount = 0;

    try {
      // 1. 检查是否存在名为'admin'且启用的账户
      const adminResult = await dbManager.query<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM sys_org_person
         WHERE fd_login_name = 'admin'
         AND fd_is_login_enabled = 1`
      );
      adminExists = (adminResult.rows[0] as { count: number } | undefined)?.count === 1;
      adminCount = (adminResult.rows[0] as { count: number } | undefined)?.count || 0;

      // 2. 检查所有管理员角色的账户数量
      const allAdminResult = await dbManager.query<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM sys_org_person
         WHERE fd_role = ? OR fd_role = ?`,
        [ADMIN_ROLE_ID, MANAGER_ROLE_ID]
      );
      allAdminCount = (allAdminResult.rows[0] as { count: number } | undefined)?.count || 0;
    } catch (error) {
      console.error('[API:System:Init] 查询管理员账号失败:', error);
      // 如果查询失败，尝试使用旧的字符串方式（向后兼容）
      try {
        const fallbackResult = await dbManager.query<{ count: number }>(
          `SELECT COUNT(*) as count
           FROM sys_org_person
           WHERE fd_login_name = 'admin'
           AND fd_is_login_enabled = 1`
        );
        adminExists = (fallbackResult.rows[0] as { count: number } | undefined)?.count === 1;
        adminCount = (fallbackResult.rows[0] as { count: number } | undefined)?.count || 0;

        // fallback时不再查询所有管理员，因为可能fd_role字段类型不一致
        allAdminCount = adminCount;
      } catch (fallbackError) {
        console.error('[API:System:Init] 查询管理员账号失败:', fallbackError);
      }
    }

    // 系统初始化的判断标准：必须存在一个名为'admin'且启用的账户
    const initialized = adminExists;

    return NextResponse.json({
      success: true,
      initialized,
      databaseConnected: true,
      adminCount,
      allAdminCount,
      adminExists,
      message: initialized
        ? '系统已初始化'
        : '系统未初始化，请创建管理员账号',
    });
  } catch (error: unknown) {
    console.error('[API:System:Init] 检查初始化状态失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      {
        success: true,
        initialized: false,
        databaseConnected: false,
        message: '检查初始化状态失败',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/system/init
 * 初始化系统（创建默认管理员账号）
 */
export async function POST(request: NextRequest) {
  try {
    const { username, password, email, personName } = await request.json();

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

    // 如果没有提供参数，使用默认值
    const adminUsername = username || 'admin';
    const adminPassword = password || 'admin123';
    const adminEmail = email || 'admin@example.com';
    const adminPersonName = personName || '系统管理员';

    // 检查管理员账号是否已存在
    const checkResult = await dbManager.query(
      'SELECT fd_id, fd_is_login_enabled FROM sys_org_person WHERE fd_login_name = ?',
      [adminUsername]
    );

    if (checkResult.rows.length > 0) {
      const existingUser = checkResult.rows[0] as {
        fd_id: string;
        fd_is_login_enabled: number;
      };

      // 如果admin账户存在但被禁用，启用它
      if (existingUser.fd_is_login_enabled === 0) {
        const hashedPassword = await hashPassword(adminPassword);

        await dbManager.query(
          `UPDATE sys_org_person
           SET fd_password = ?,
               fd_email = ?,
               fd_name = ?,
               fd_role = ?,
               fd_is_login_enabled = 1,
               fd_alter_time = NOW()
           WHERE fd_id = ?`,
          [
            hashedPassword,
            adminEmail,
            adminPersonName,
            ADMIN_ROLE_ID,
            existingUser.fd_id,
          ]
        );

        console.log('[API:System:Init] 管理员账号已重新启用', {
          adminId: existingUser.fd_id,
          username: adminUsername,
          email: adminEmail,
        });

        return NextResponse.json({
          success: true,
          message: '管理员账号已重新启用',
          data: {
            adminId: existingUser.fd_id,
            username: adminUsername,
            email: adminEmail,
            personName: adminPersonName,
            reactivated: true,
          },
        });
      }

      // 如果admin账户存在且启用，返回错误
      return NextResponse.json({
        success: false,
        error: '管理员账号已存在且已启用，无需重复创建',
        hint: '您可以直接使用该账号登录，或联系管理员重置密码',
      });
    }

    // 加密密码
    const hashedPassword = await hashPassword(adminPassword);

    // 创建管理员账号
    const adminId = crypto.randomUUID();

    // 使用角色ID创建管理员账号
    await dbManager.query(
      `INSERT INTO sys_org_person (
        fd_id,
        fd_name,
        fd_login_name,
        fd_password,
        fd_email,
        fd_role,
        fd_is_login_enabled,
        fd_is_business_related,
        fd_user_type,
        fd_create_time,
        fd_alter_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        adminId,
        adminPersonName,
        adminUsername,
        hashedPassword,
        adminEmail,
        ADMIN_ROLE_ID,
        1,
        1,
        'internal',
      ]
    );

    console.log('[API:System:Init] 管理员账号创建成功', {
      adminId,
      username: adminUsername,
      email: adminEmail,
    });

    return NextResponse.json({
      success: true,
      message: '系统初始化成功',
      data: {
        adminId,
        username: adminUsername,
        email: adminEmail,
        personName: adminPersonName,
      },
    });
  } catch (error: unknown) {
    console.error('[API:System:Init] 初始化系统失败:', error);
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
