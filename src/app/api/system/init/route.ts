/**
 * 系统初始化 API
 * 用于首次部署时创建默认管理员账号
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { hashPassword } from '@/lib/password/password-utils';

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
    const result = await dbManager.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM sys_org_person WHERE fd_role = ?',
      ['admin']
    );

    const count = (result.rows[0] as { count: number } | undefined)?.count || 0;

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
        'admin',
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
