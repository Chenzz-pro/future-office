/**
 * 用户认证 API
 * sys_org_person 就是系统用户表
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import {
  verifyPassword,
  needPasswordUpdate,
} from '@/lib/password/password-utils';

/**
 * POST /api/auth/login
 * 通过用户名/密码或钉钉信息登录
 */
export async function POST(request: NextRequest) {
  try {
    const { username, password, rtx_account, email } = await request.json();

    console.log('[API:Auth] 收到登录请求', { username, rtx_account, email });

    // 支持用户名/密码登录
    if (username && password) {
      // 在 sys_org_person 中查找用户
      const result = await dbManager.query(
        'SELECT * FROM sys_org_person WHERE fd_login_name = ? AND fd_is_login_enabled = 1',
        [username]
      );
      const rows = result.rows as Array<Record<string, unknown>>;

      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '用户不存在或已被禁用' },
          { status: 401 }
        );
      }

      const person = rows[0];

      // 验证密码（支持 bcrypt 和 base64 向后兼容）
      const isValid = await verifyPassword(password, person.fd_password as string);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: '密码错误' },
          { status: 401 }
        );
      }

      const userId = person.fd_id as string;

      // 检查是否需要更新密码（从 base64 迁移到 bcrypt）
      const needUpdate = needPasswordUpdate(person.fd_password as string);

      console.log('[API:Auth] 登录成功', {
        userId,
        username: person.fd_login_name,
        personName: person.fd_name,
        needPasswordUpdate: needUpdate,
      });

      return NextResponse.json({
        success: true,
        data: {
          userId, // sys_org_person.fd_id 就是 userId
          username: person.fd_login_name as string,
          personName: person.fd_name as string,
          email: person.fd_email as string | null,
          mobile: person.fd_mobile as string | null,
          deptId: person.fd_dept_id as string | null,
          rtxAccount: person.fd_rtx_account as string | null,
          role: (person.fd_role || 'user') as string,
          needPasswordUpdate, // 提示前端是否需要更新密码
        },
      });
    }

    // 支持钉钉信息登录
    if (!rtx_account && !email) {
      return NextResponse.json(
        { success: false, error: '缺少登录信息（username/password 或 rtx_account/email）' },
        { status: 400 }
      );
    }

    // 在 sys_org_person 中查找人员
    let query = 'SELECT * FROM sys_org_person WHERE fd_is_login_enabled = 1';
    const params: unknown[] = [];

    if (rtx_account) {
      query += ' AND fd_rtx_account = ?';
      params.push(rtx_account);
    } else if (email) {
      query += ' AND fd_email = ?';
      params.push(email);
    }

    const result = await dbManager.query(query, params);
    const rows = result.rows as Array<Record<string, unknown>>;

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const person = rows[0];
    const userId = person.fd_id as string;

    console.log('[API:Auth] 登录成功', {
      userId,
      username: person.fd_login_name,
      personName: person.fd_name,
    });

    return NextResponse.json({
      success: true,
      data: {
        userId,
        username: person.fd_login_name as string,
        personName: person.fd_name as string,
        email: person.fd_email as string | null,
        mobile: person.fd_mobile as string | null,
        deptId: person.fd_dept_id as string | null,
        rtxAccount: person.fd_rtx_account as string | null,
      },
    });
  } catch (error: unknown) {
    console.error('[API:Auth] 登录错误:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/current
 * 获取当前登录用户信息（从 header 获取 userId）
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-ID');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户 ID' },
        { status: 401 }
      );
    }

    // 获取人员信息
    const result = await dbManager.query(
      'SELECT * FROM sys_org_person WHERE fd_id = ?',
      [userId]
    );
    const rows = result.rows as Array<Record<string, unknown>>;

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const person = rows[0];

    return NextResponse.json({
      success: true,
      data: {
        userId: person.fd_id as string,
        username: person.fd_login_name as string,
        personName: person.fd_name as string,
        email: person.fd_email as string | null,
        mobile: person.fd_mobile as string | null,
        deptId: person.fd_dept_id as string | null,
        rtxAccount: person.fd_rtx_account as string | null,
      },
    });
  } catch (error: unknown) {
    console.error('[API:Auth] 获取用户信息错误:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
