/**
 * EKP 自动 SSO 登录 API
 * 
 * 适用于本系统用户从 EKP 同步的场景
 * 自动使用当前用户账号登录 EKP
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { encrypt } from '@/lib/utils/crypto';
import crypto from 'crypto';

// 加密密钥
const ENCRYPTION_KEY = process.env.COOKIE_ENCRYPTION_KEY || 'ekp-cookie-bridge-key-2024';

/**
 * POST /api/ekp/sso/auto-login
 * 自动 SSO 登录
 */
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
    const { loginName, email, mobile } = body;

    // 获取用户 EKP 账号信息
    const userResult = await dbManager.query<{
      fd_login_name: string;
      fd_email: string;
      fd_mobile: string;
      fd_name: string;
    }>(
      `SELECT fd_login_name, fd_email, fd_mobile, fd_name FROM sys_org_person WHERE fd_id = ?`,
      [userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    const ekpUsername = loginName || user.fd_login_name;
    const ekpEmail = email || user.fd_email;
    const ekpMobile = user.fd_mobile;

    // 尝试使用不同账号登录 EKP
    let ekpSession = null;
    const loginAttempts = [
      { type: 'username', value: ekpUsername },
      { type: 'email', value: ekpEmail },
      { type: 'mobile', value: ekpMobile },
    ];

    for (const attempt of loginAttempts) {
      if (!attempt.value) continue;

      const session = await tryEKPLogin(attempt.value);
      if (session) {
        ekpSession = session;
        break;
      }
    }

    if (!ekpSession) {
      return NextResponse.json({
        success: false,
        error: '无法自动登录 EKP。请确认您的 EKP 账号与本系统账号一致，或联系管理员配置账号映射。',
      });
    }

    // 保存 EKP Session
    await saveEKPSession(userId, ekpUsername, ekpSession);

    return NextResponse.json({
      success: true,
      message: '自动 SSO 登录成功',
      data: {
        ekpUsername,
        loginTime: new Date(),
        expireTime: ekpSession.expireTime,
      },
    });
  } catch (error) {
    console.error('自动 SSO 登录失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '自动 SSO 登录失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ekp/sso/status
 * 检查 SSO 状态
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未提供用户ID' },
        { status: 401 }
      );
    }

    // 检查是否有有效的 Session
    const sessionResult = await dbManager.query<{
      ekp_username: string;
      login_time: Date;
      expire_time: Date;
      is_valid: number;
    }>(
      `SELECT ekp_username, login_time, expire_time, is_valid 
       FROM ekp_sessions 
       WHERE user_id = ? AND is_valid = 1 AND expire_time > NOW()`,
      [userId]
    );

    if (sessionResult.rows && sessionResult.rows.length > 0) {
      const session = sessionResult.rows[0];
      return NextResponse.json({
        success: true,
        isConnected: true,
        data: {
          ekpUsername: session.ekp_username,
          loginTime: session.login_time,
          expireTime: session.expire_time,
        },
      });
    }

    return NextResponse.json({
      success: true,
      isConnected: false,
      data: null,
    });
  } catch (error) {
    console.error('检查 SSO 状态失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '检查失败' 
      },
      { status: 500 }
    );
  }
}

// ============================================
// 辅助函数
// ============================================

/**
 * 尝试登录 EKP
 */
async function tryEKPLogin(identifier: string): Promise<EKPSession | null> {
  const EKP_BASE_URL = process.env.EKP_BASE_URL || 'https://oa.fjhxrl.com';
  
  try {
    // 方式1: 尝试通过 EKP REST API 认证
    // 蓝凌 EKP 通常支持 Basic Auth 或表单认证
    
    // 首先尝试获取用户信息（验证账号存在）
    const validateResponse = await fetch(`${EKP_BASE_URL}/api/sys/organization/personInfo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 如果有配置，可以尝试 Basic Auth
        // 'Authorization': `Basic ${Buffer.from(`${identifier}:`).toString('base64')}`,
      },
      body: JSON.stringify({
        loginName: identifier,
      }),
    });

    if (validateResponse.ok) {
      // 账号验证成功，尝试建立 Session
      // 由于 EKP 的 Session 通常需要通过 Cookie 维护，
      // 这里我们记录账号信息，实际的 Cookie 桥接由代理层处理
      
      return {
        cookie: `ekp_auto_sso=${encodeURIComponent(identifier)}`,
        sessionId: crypto.randomUUID(),
        expireTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8小时
      };
    }

    return null;
  } catch (error) {
    console.error(`尝试 EKP 登录失败 (${identifier}):`, error);
    return null;
  }
}

/**
 * 保存 EKP Session
 */
async function saveEKPSession(
  userId: string,
  ekpUsername: string,
  session: EKPSession
): Promise<void> {
  // 确保表存在
  await ensureTablesExist();

  // 加密 Cookie
  const encryptedCookie = encrypt(session.cookie, ENCRYPTION_KEY);

  await dbManager.query(
    `INSERT INTO ekp_sessions 
     (user_id, ekp_username, ekp_session_id, ekp_cookie, login_time, expire_time, is_valid)
     VALUES (?, ?, ?, ?, NOW(), ?, 1)
     ON DUPLICATE KEY UPDATE
     ekp_username = VALUES(ekp_username),
     ekp_session_id = VALUES(ekp_session_id),
     ekp_cookie = VALUES(ekp_cookie),
     login_time = NOW(),
     expire_time = VALUES(expire_time),
     is_valid = 1`,
    [userId, ekpUsername, session.sessionId, encryptedCookie, session.expireTime]
  );
}

/**
 * 确保必要的表存在
 */
async function ensureTablesExist(): Promise<void> {
  try {
    // 检查表是否存在
    const tableCheck = await dbManager.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name = 'ekp_sessions'`
    );
    
    const exists = (tableCheck.rows[0] as { count: number })?.count > 0;
    
    if (!exists) {
      // 创建表
      await dbManager.query(`
        CREATE TABLE IF NOT EXISTS ekp_sessions (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
          ekp_username VARCHAR(128) NOT NULL COMMENT 'EKP用户名',
          ekp_session_id VARCHAR(256) DEFAULT NULL COMMENT 'EKP Session ID',
          ekp_cookie TEXT COMMENT '加密后的Cookie',
          login_time DATETIME NOT NULL COMMENT '登录时间',
          expire_time DATETIME NOT NULL COMMENT '过期时间',
          is_valid TINYINT(1) DEFAULT 1 COMMENT '是否有效',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_user_id (user_id),
          KEY idx_expire_time (expire_time),
          KEY idx_is_valid (is_valid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP Session存储表'
      `);
    }
  } catch (error) {
    console.error('确保表存在失败:', error);
  }
}

// 类型定义
interface EKPSession {
  cookie: string;
  sessionId: string;
  expireTime: Date;
}
