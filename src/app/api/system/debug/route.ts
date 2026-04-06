/**
 * 系统初始化调试 API
 * 用于诊断系统初始化问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';

// 角色ID常量
const ADMIN_ROLE_ID = '00000000-0000-0000-0000-000000000001';
const MANAGER_ROLE_ID = '00000000-0000-0000-0000-000000000002';
const USER_ROLE_ID = '00000000-0000-0000-0000-000000000003';

/**
 * GET /api/system/debug
 * 诊断系统初始化状态
 */
export async function GET(request: NextRequest) {
  try {
    const isConnected = dbManager.isConnected();

    if (!isConnected) {
      return NextResponse.json({
        success: false,
        database: {
          connected: false,
          message: '数据库未连接',
        },
        admin: {
          exists: false,
          enabled: false,
        },
        error: '数据库未连接，请先配置数据库连接',
      });
    }

    // 1. 检查sys_role表是否存在
    const roleTableCheck = await dbManager.query<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
       AND table_name = 'sys_role'`
    );
    const roleTableExists = (roleTableCheck.rows[0] as { count: number })?.count === 1;

    // 2. 检查角色数据
    let roles: any[] = [];
    if (roleTableExists) {
      const rolesResult = await dbManager.query<any>(
        `SELECT fd_id, fd_name, fd_code, fd_is_available, fd_order FROM sys_role ORDER BY fd_order`
      );
      roles = rolesResult.rows;
    }

    // 3. 检查admin账户
    const adminCheck = await dbManager.query<any>(
      `SELECT fd_id, fd_name, fd_login_name, fd_email, fd_role, fd_is_login_enabled, fd_create_time
       FROM sys_org_person
       WHERE fd_login_name = ?`,
      ['admin']
    );

    const adminAccount = adminCheck.rows[0] || null;

    // 4. 检查所有管理员角色的账户
    const allAdminsResult = await dbManager.query<any>(
      `SELECT fd_id, fd_name, fd_login_name, fd_role, fd_is_login_enabled
       FROM sys_org_person
       WHERE fd_role = ? OR fd_role = ?`,
      [ADMIN_ROLE_ID, MANAGER_ROLE_ID]
    );
    const allAdmins = allAdminsResult.rows;

    // 5. 检查fd_role字段类型
    let fd_role_type = 'unknown';
    try {
      const columnCheck = await dbManager.query<{ DATA_TYPE: string }>(
        `SELECT DATA_TYPE
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'sys_org_person'
         AND COLUMN_NAME = 'fd_role'`
      );
      fd_role_type = (columnCheck.rows[0] as { DATA_TYPE: string })?.DATA_TYPE || 'unknown';
    } catch (error) {
      fd_role_type = 'unknown';
    }

    // 6. 判断系统初始化状态
    const systemInitialized = adminAccount && adminAccount.fd_is_login_enabled === 1;

    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        message: '数据库已连接',
      },
      sys_role_table: {
        exists: roleTableExists,
        roles: roles,
        count: roles.length,
      },
      admin_account: {
        exists: !!adminAccount,
        enabled: adminAccount?.fd_is_login_enabled === 1,
        data: adminAccount ? {
          id: adminAccount.fd_id,
          name: adminAccount.fd_name,
          loginName: adminAccount.fd_login_name,
          email: adminAccount.fd_email,
          role: adminAccount.fd_role,
          enabled: adminAccount.fd_is_login_enabled === 1,
          createdAt: adminAccount.fd_create_time,
        } : null,
      },
      all_admins: {
        count: allAdmins.length,
        accounts: allAdmins.map((admin: any) => ({
          id: admin.fd_id,
          name: admin.fd_name,
          loginName: admin.fd_login_name,
          role: admin.fd_role,
          enabled: admin.fd_is_login_enabled === 1,
        })),
      },
      fd_role_field: {
        type: fd_role_type,
      },
      system_initialized: systemInitialized,
      diagnosis: {
        has_admin_account: !!adminAccount,
        admin_enabled: adminAccount?.fd_is_login_enabled === 1,
        has_role_table: roleTableExists,
        has_default_roles: roles.length >= 3,
        issue: !systemInitialized ? diagnoseIssue(adminAccount, roleTableExists, roles, allAdmins) : null,
      },
    });
  } catch (error: unknown) {
    console.error('[API:System:Debug] 诊断失败:', error);
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
 * 诊断问题
 */
function diagnoseIssue(
  adminAccount: any,
  roleTableExists: boolean,
  roles: any[],
  allAdmins: any[]
): string {
  if (!adminAccount) {
    if (allAdmins.length === 0) {
      return '系统中没有管理员账户，需要创建admin账户';
    } else {
      return '系统中没有admin账户，但有其他管理员账户。建议创建admin账户';
    }
  }

  if (adminAccount.fd_is_login_enabled === 0) {
    return 'admin账户存在但被禁用，建议启用该账户';
  }

  if (!roleTableExists) {
    return '角色表不存在，需要创建角色表';
  }

  if (roles.length < 3) {
    return '角色表存在但缺少默认角色，需要初始化角色数据';
  }

  return '未知问题，请联系技术支持';
}

/**
 * POST /api/system/debug/fix
 * 修复系统初始化问题
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    const isConnected = dbManager.isConnected();
    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'enable_admin':
        // 启用admin账户
        const enableResult = await dbManager.query<any>(
          `SELECT fd_id FROM sys_org_person WHERE fd_login_name = ?`,
          ['admin']
        );

        if (enableResult.rows.length === 0) {
          return NextResponse.json(
            { success: false, error: 'admin账户不存在' },
            { status: 400 }
          );
        }

        const adminId = enableResult.rows[0].fd_id;
        await dbManager.query(
          `UPDATE sys_org_person SET fd_is_login_enabled = 1, fd_alter_time = NOW() WHERE fd_id = ?`,
          [adminId]
        );

        return NextResponse.json({
          success: true,
          message: 'admin账户已启用',
        });

      default:
        return NextResponse.json(
          { success: false, error: '不支持的操作' },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('[API:System:Debug:Fix] 修复失败:', error);
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
