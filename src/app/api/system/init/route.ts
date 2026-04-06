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
        success: false,
        initialized: false,
        message: '数据库未连接',
      });
    }

    // 检查是否存在管理员账号
    // 支持两种查询方式：新的角色ID方式和旧的字符串方式（向后兼容）
    let count = 0;

    try {
      // 尝试使用新的角色ID方式查询
      const result = await dbManager.query<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM sys_org_person
         WHERE fd_role = ? OR fd_role = ?`,
        [ADMIN_ROLE_ID, MANAGER_ROLE_ID]
      );
      count = (result.rows[0] as { count: number } | undefined)?.count || 0;
    } catch (error) {
      // 如果查询失败（可能是数据库结构未更新），尝试使用旧的字符串方式
      try {
        const fallbackResult = await dbManager.query<{ count: number }>(
          `SELECT COUNT(*) as count
           FROM sys_org_person
           WHERE fd_role = ? OR fd_role = ?`,
          ['admin', 'manager']
        );
        count = (fallbackResult.rows[0] as { count: number } | undefined)?.count || 0;
      } catch (fallbackError) {
        console.error('[API:System:Init] 查询管理员账号失败:', fallbackError);
      }
    }

    return NextResponse.json({
      success: true,
      initialized: count > 0,
      adminCount: count,
      message: count > 0 ? '系统已初始化' : '系统未初始化',
    });
  } catch (error: unknown) {
    console.error('[API:System:Init] 检查初始化状态失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      {
        success: false,
        initialized: false,
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
      'SELECT fd_id FROM sys_org_person WHERE fd_login_name = ?',
      [adminUsername]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: '管理员账号已存在',
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
