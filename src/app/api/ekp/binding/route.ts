/**
 * EKP 用户绑定管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { encrypt, decrypt } from '@/lib/utils/crypto';
import { loginWithCredentials } from '@/lib/ekp/cookie-bridge';

// 加密密钥
const ENCRYPTION_KEY = process.env.EKP_BINDING_KEY || 'ekp-user-binding-key-2024';

// 查询结果类型
interface EKPBingingRow {
  user_id: string;
  ekp_username: string;
  ekp_account_id: string | null;
  bind_time: Date;
  last_used_time: Date | null;
  is_active: number;
}

export interface EKPDingTalkBinding {
  userId: string;
  ekpUsername: string;
  ekpPassword?: string;
  dingTalkId?: string;
  bindingTime: Date;
  lastUsedTime?: Date;
  isActive: boolean;
}

// ============================================
// 获取绑定信息
// ============================================

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未提供用户ID' },
        { status: 401 }
      );
    }
    
    // 查询绑定信息
    const result = await dbManager.query<EKPBingingRow>(
      `SELECT * FROM ekp_user_bindings WHERE user_id = ? AND is_active = 1`,
      [userId]
    );
    
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as EKPBingingRow;
      return NextResponse.json({
        success: true,
        data: {
          userId: row.user_id,
          ekpUsername: row.ekp_username,
          ekpAccountId: row.ekp_account_id,
          bindingTime: row.bind_time,
          lastUsedTime: row.last_used_time,
          isActive: row.is_active === 1,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error('获取 EKP 绑定信息失败:', error);
    return NextResponse.json(
      { success: false, error: '获取绑定信息失败' },
      { status: 500 }
    );
  }
}

// ============================================
// 绑定 EKP 账号
// ============================================

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未提供用户ID' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { ekpUsername, ekpPassword } = body;
    
    if (!ekpUsername || !ekpPassword) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }
    
    // 验证 EKP 账号
    const loginResult = await loginWithCredentials(ekpUsername, ekpPassword);
    
    if (!loginResult.success) {
      return NextResponse.json(
        { success: false, error: loginResult.error || 'EKP 账号验证失败' },
        { status: 400 }
      );
    }
    
    // 加密密码
    const encryptedPassword = encrypt(ekpPassword, ENCRYPTION_KEY);
    
    // 保存绑定信息
    await dbManager.query(
      `INSERT INTO ekp_user_bindings 
       (user_id, ekp_username, ekp_password_encrypted, bind_time, is_active)
       VALUES (?, ?, ?, NOW(), 1)
       ON DUPLICATE KEY UPDATE
       ekp_username = VALUES(ekp_username),
       ekp_password_encrypted = VALUES(ekp_password_encrypted),
       bind_time = VALUES(bind_time),
       is_active = 1`,
      [userId, ekpUsername, encryptedPassword]
    );
    
    return NextResponse.json({
      success: true,
      message: 'EKP 账号绑定成功',
      data: {
        userId,
        ekpUsername,
        bindingTime: new Date(),
      },
    });
  } catch (error) {
    console.error('绑定 EKP 账号失败:', error);
    return NextResponse.json(
      { success: false, error: '绑定失败' },
      { status: 500 }
    );
  }
}

// ============================================
// 解绑 EKP 账号
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未提供用户ID' },
        { status: 401 }
      );
    }
    
    // 删除绑定信息
    await dbManager.query(
      `UPDATE ekp_user_bindings SET is_active = 0 WHERE user_id = ?`,
      [userId]
    );
    
    // 同时删除 Session
    await dbManager.query(
      `UPDATE ekp_sessions SET is_valid = 0 WHERE user_id = ?`,
      [userId]
    );
    
    return NextResponse.json({
      success: true,
      message: 'EKP 账号解绑成功',
    });
  } catch (error) {
    console.error('解绑 EKP 账号失败:', error);
    return NextResponse.json(
      { success: false, error: '解绑失败' },
      { status: 500 }
    );
  }
}

// ============================================
// 更新最后使用时间
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未提供用户ID' },
        { status: 401 }
      );
    }
    
    // 更新最后使用时间
    await dbManager.query(
      `UPDATE ekp_user_bindings SET last_used_time = NOW() WHERE user_id = ?`,
      [userId]
    );
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('更新 EKP 绑定信息失败:', error);
    return NextResponse.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}
