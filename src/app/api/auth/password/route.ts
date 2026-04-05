/**
 * 密码管理 API
 * 包括密码重置、修改和强度检查
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import {
  hashPassword,
  verifyPassword,
  checkPasswordStrength,
  generateRandomPassword,
} from '@/lib/password/password-utils';

/**
 * GET /api/auth/password?action=strength&password=xxx
 * 检查密码强度
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'strength') {
      const password = searchParams.get('password');

      if (!password) {
        return NextResponse.json(
          { success: false, error: '缺少密码参数' },
          { status: 400 }
        );
      }

      const result = checkPasswordStrength(password);

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    return NextResponse.json(
      { success: false, error: '未知的操作' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('[API:Password] 处理 GET 请求失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/password
 * 支持两种操作：
 * - 重置密码（管理员操作）：action=reset
 * - 生成随机密码：action=generate
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'reset') {
      const { userId, newPassword } = await request.json();

      if (!userId || !newPassword) {
        return NextResponse.json(
          { success: false, error: '缺少用户 ID 或新密码' },
          { status: 400 }
        );
      }

      // 检查密码强度
      const strengthCheck = checkPasswordStrength(newPassword);
      if (!strengthCheck.valid) {
        return NextResponse.json(
          {
            success: false,
            error: '密码强度不足',
            details: strengthCheck.errors,
          },
          { status: 400 }
        );
      }

      // 加密新密码
      const hashedPassword = await hashPassword(newPassword);

      // 更新密码
      await dbManager.query(
        'UPDATE sys_org_person SET fd_password = ?, fd_alter_time = NOW() WHERE fd_id = ?',
        [hashedPassword, userId]
      );

      console.log('[API:Password] 密码重置成功', { userId });

      return NextResponse.json({ success: true, message: '密码重置成功' });
    } else if (action === 'generate') {
      const body = await request.json();
      const { length = 12, options = {} } = body;

      const randomPassword = generateRandomPassword(length, options);

      const strengthCheck = checkPasswordStrength(randomPassword);

      return NextResponse.json({
        success: true,
        data: {
          password: randomPassword,
          strength: strengthCheck,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: '未知的操作' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('[API:Password] 处理 POST 请求失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/password?action=change
 * 修改密码（用户自己操作，需要验证旧密码）
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'change') {
      const { userId, oldPassword, newPassword } = await request.json();

      if (!userId || !oldPassword || !newPassword) {
        return NextResponse.json(
          { success: false, error: '缺少用户 ID、旧密码或新密码' },
          { status: 400 }
        );
      }

      // 获取用户信息
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

      // 验证旧密码
      const isValid = await verifyPassword(oldPassword, person.fd_password as string);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: '旧密码错误' },
          { status: 401 }
        );
      }

      // 检查新密码强度
      const strengthCheck = checkPasswordStrength(newPassword);
      if (!strengthCheck.valid) {
        return NextResponse.json(
          {
            success: false,
            error: '新密码强度不足',
            details: strengthCheck.errors,
          },
          { status: 400 }
        );
      }

      // 加密新密码
      const hashedPassword = await hashPassword(newPassword);

      // 更新密码
      await dbManager.query(
        'UPDATE sys_org_person SET fd_password = ?, fd_alter_time = NOW() WHERE fd_id = ?',
        [hashedPassword, userId]
      );

      console.log('[API:Password] 密码修改成功', { userId });

      return NextResponse.json({ success: true, message: '密码修改成功' });
    }

    return NextResponse.json(
      { success: false, error: '未知的操作' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('[API:Password] 处理 PUT 请求失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
