/**
 * 用户认证 API
 * 支持通过钉钉信息登录
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

/**
 * POST /api/auth/login
 * 通过用户名/密码登录
 */
export async function POST(request: NextRequest) {
  try {
    const { username, password, rtx_account, email } = await request.json();

    console.log('[API:Auth] 收到登录请求', { username, rtx_account, email });

    // 支持用户名/密码登录
    if (username && password) {
      // 在 users 表中查找用户
      const userResult = await dbManager.query(
        'SELECT * FROM users WHERE username = ? AND status = ?',
        [username, 'active']
      );
      const userRows = userResult.rows as Array<Record<string, unknown>>;

      if (userRows.length === 0) {
        return NextResponse.json(
          { success: false, error: '用户不存在或已被禁用' },
          { status: 401 }
        );
      }

      const user = userRows[0];

      // 验证密码
      const hashedPassword = Buffer.from(password).toString('base64');
      if (user.password !== hashedPassword) {
        return NextResponse.json(
          { success: false, error: '密码错误' },
          { status: 401 }
        );
      }

      // 获取人员信息
      let person: Record<string, unknown> | null = null;
      if (user.person_id) {
        const personResult = await dbManager.query(
          'SELECT * FROM sys_org_person WHERE fd_id = ?',
          [user.person_id]
        );
        const personRows = personResult.rows as Array<Record<string, unknown>>;
        if (personRows.length > 0) {
          person = personRows[0];
        }
      }

      console.log('[API:Auth] 登录成功', {
        userId: user.id,
        username: user.username,
        personId: user.person_id,
        personName: person?.fd_name,
      });

      return NextResponse.json({
        success: true,
        data: {
          userId: user.id as string,
          username: user.username as string,
          personId: user.person_id as string | null,
          personName: person?.fd_name as string | null,
          email: user.email as string | null,
          role: user.role as string,
          status: user.status as string,
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
    let query = 'SELECT * FROM sys_org_person WHERE 1=1';
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
    const personId = person.fd_id as string;

    // 获取对应的 users 表记录
    const userResult = await dbManager.query(
      'SELECT * FROM users WHERE person_id = ?',
      [personId]
    );
    const userRows = userResult.rows as Array<Record<string, unknown>>;

    if (userRows.length === 0) {
      console.error('[API:Auth] 用户记录不存在', { personId });
      return NextResponse.json(
        { success: false, error: '用户记录不存在' },
        { status: 500 }
      );
    }

    const user = userRows[0];

    console.log('[API:Auth] 登录成功', {
      userId: user.id,
      username: user.username,
      personId: user.person_id,
      personName: person.fd_name,
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id as string,
        username: user.username as string,
        personId: user.person_id as string,
        personName: person.fd_name as string,
        email: user.email as string | null,
        role: user.role as string,
        status: user.status as string,
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
 * 获取当前登录用户信息（从 header 获取）
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

    // 获取用户信息
    const userResult = await dbManager.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    const userRows = userResult.rows as Array<Record<string, unknown>>;

    if (userRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = userRows[0];

    // 获取人员信息
    let person: Record<string, unknown> | null = null;
    if (user.person_id) {
      const personResult = await dbManager.query(
        'SELECT * FROM sys_org_person WHERE fd_id = ?',
        [user.person_id]
      );
      const personRows = personResult.rows as Array<Record<string, unknown>>;
      if (personRows.length > 0) {
        person = personRows[0];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id as string,
        username: user.username as string,
        personId: user.person_id as string | null,
        personName: person?.fd_name as string | null,
        email: user.email as string | null,
        role: user.role as string,
        status: user.status as string,
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
