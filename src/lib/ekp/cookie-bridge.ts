/**
 * EKP Cookie 桥接服务
 * 
 * 功能：
 * 1. 获取用户在 EKP 的登录态（通过 SSO、账号密码或 Session Token）
 * 2. 将 EKP Cookie 转换为我们域名的 Cookie
 * 3. 存储和管理用户 EKP Session
 */

import { dbManager } from '@/lib/database';
import { encrypt, decrypt } from '@/lib/utils';

// ============================================
// 类型定义
// ============================================

export interface EKPSession {
  userId: string;                    // 我们系统的用户ID
  ekpUsername: string;              // EKP 用户名
  ekpSessionId?: string;           // EKP Session ID
  ekpCookie?: string;              // 加密后的 EKP Cookie
  ekpToken?: string;               // EKP Token（如果有）
  loginTime: Date;                  // 登录时间
  expireTime: Date;                 // 过期时间
  isValid: boolean;                 // 是否有效
}

export interface EKPConfig {
  baseUrl: string;
  username: string;
  password: string;
  apiPath: string;
  ssoEnabled?: boolean;
  ssoType?: 'cas' | 'oauth2' | 'jwt' | 'cookie';
  casUrl?: string;
  oauth2Url?: string;
}

// ============================================
// Cookie 加密/解密
// ============================================

const ENCRYPTION_KEY = process.env.COOKIE_ENCRYPTION_KEY || 'ekp-cookie-bridge-key-2024';

/**
 * 加密 Cookie
 */
export function encryptCookie(cookie: string): string {
  return encrypt(cookie, ENCRYPTION_KEY);
}

/**
 * 解密 Cookie
 */
export function decryptCookie(encrypted: string): string {
  return decrypt(encrypted, ENCRYPTION_KEY);
}

// ============================================
// Cookie 域名转换
// ============================================

/**
 * 将 EKP Cookie 转换为目标域名的 Cookie
 * 
 * @param cookie - 原始 Cookie 字符串
 * @param targetDomain - 目标域名
 * @returns 转换后的 Cookie
 */
export function convertCookieDomain(cookie: string, targetDomain: string): string {
  // EKP 原始域名
  const sourceDomain = 'oa.fjhxrl.com';
  const sourceDomainAlias = 'fjhxrl.com.fjhrxl.com';
  
  return cookie
    .replace(new RegExp(`domain=${sourceDomain}`, 'gi'), `domain=${targetDomain}`)
    .replace(new RegExp(`domain=\\.${sourceDomain}`, 'gi'), `domain=.${targetDomain}`)
    .replace(new RegExp(`domain=${sourceDomainAlias}`, 'gi'), `domain=${targetDomain}`);
}

// ============================================
// Session 管理
// ============================================

/**
 * 获取用户的 EKP Session
 */
export async function getEKPSession(userId: string): Promise<EKPSession | null> {
  try {
    // 从数据库获取 Session
    const result = await dbManager.executeQuery(
      `SELECT * FROM ekp_sessions WHERE user_id = ? AND is_valid = 1 AND expire_time > NOW()`,
      [userId]
    );
    
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      return {
        userId: row.user_id,
        ekpUsername: row.ekp_username,
        ekpSessionId: row.ekp_session_id,
        ekpCookie: row.ekp_cookie ? decryptCookie(row.ekp_cookie) : undefined,
        ekpToken: row.ekp_token,
        loginTime: new Date(row.login_time),
        expireTime: new Date(row.expire_time),
        isValid: row.is_valid === 1,
      };
    }
    
    return null;
  } catch (error) {
    console.error('获取 EKP Session 失败:', error);
    return null;
  }
}

/**
 * 保存用户的 EKP Session
 */
export async function saveEKPSession(session: EKPSession): Promise<void> {
  try {
    const encryptedCookie = session.ekpCookie 
      ? encryptCookie(session.ekpCookie) 
      : null;
    
    await dbManager.executeQuery(
      `INSERT INTO ekp_sessions 
       (user_id, ekp_username, ekp_session_id, ekp_cookie, ekp_token, login_time, expire_time, is_valid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       ekp_username = VALUES(ekp_username),
       ekp_session_id = VALUES(ekp_session_id),
       ekp_cookie = VALUES(ekp_cookie),
       ekp_token = VALUES(ekp_token),
       login_time = VALUES(login_time),
       expire_time = VALUES(expire_time),
       is_valid = VALUES(is_valid)`,
      [
        session.userId,
        session.ekpUsername,
        session.ekpSessionId || null,
        encryptedCookie,
        session.ekpToken || null,
        session.loginTime,
        session.expireTime,
        session.isValid ? 1 : 0,
      ]
    );
  } catch (error) {
    console.error('保存 EKP Session 失败:', error);
    throw error;
  }
}

/**
 * 删除用户的 EKP Session
 */
export async function deleteEKPSession(userId: string): Promise<void> {
  try {
    await dbManager.executeQuery(
      `UPDATE ekp_sessions SET is_valid = 0 WHERE user_id = ?`,
      [userId]
    );
  } catch (error) {
    console.error('删除 EKP Session 失败:', error);
    throw error;
  }
}

/**
 * 验证 Session 是否有效
 */
export async function isSessionValid(userId: string): Promise<boolean> {
  const session = await getEKPSession(userId);
  if (!session) return false;
  if (!session.isValid) return false;
  if (new Date() > session.expireTime) return false;
  return true;
}

// ============================================
// EKP 认证方式
// ============================================

/**
 * 通过账号密码获取 EKP Session
 * 
 * @param username - EKP 用户名
 * @param password - EKP 密码
 * @returns EKP Session Cookie
 */
export async function loginWithCredentials(
  username: string, 
  password: string
): Promise<{ success: boolean; cookie?: string; sessionId?: string; error?: string }> {
  try {
    const baseUrl = process.env.EKP_BASE_URL || 'https://oa.fjhxrl.com';
    
    // 方式1: 通过 EKP REST API 获取 Session
    // 蓝凌 EKP 通常使用 Form-based 认证
    const loginUrl = `${baseUrl}/sys/profile/getSysProfile.do`;
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
      redirect: 'manual',
    });
    
    // 提取 Set-Cookie
    const setCookies = response.headers.getSetCookie?.() || [];
    const sessionCookie = setCookies.find(c => 
      c.includes('JSESSIONID') || c.includes('kmsgss')
    );
    
    if (sessionCookie) {
      return {
        success: true,
        cookie: sessionCookie,
        sessionId: extractSessionId(sessionCookie),
      };
    }
    
    // 方式2: 尝试 Basic Auth
    const basicAuthResponse = await fetch(`${baseUrl}/api/sys-notify/sysNotifyTodoRestService/getTodo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
      body: JSON.stringify({ type: 0 }),
    });
    
    if (basicAuthResponse.ok) {
      return {
        success: true,
        cookie: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      };
    }
    
    return {
      success: false,
      error: '无法获取 EKP Session，请检查账号密码',
    };
  } catch (error) {
    console.error('EKP 登录失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 通过 CAS SSO 获取 EKP Session
 */
export async function loginWithCAS(
  casUrl: string,
  service: string
): Promise<{ success: boolean; ticket?: string; error?: string }> {
  try {
    // 1. 获取 CAS Ticket
    const ticketResponse = await fetch(
      `${casUrl}/cas/serviceValidate?service=${encodeURIComponent(service)}&format=JSON`
    );
    
    if (!ticketResponse.ok) {
      return { success: false, error: 'CAS 服务不可用' };
    }
    
    const data = await ticketResponse.json();
    
    if (data.serviceResponse?.authenticationSuccess?.user) {
      return {
        success: true,
        ticket: data.serviceResponse.authenticationSuccess,
      };
    }
    
    return { success: false, error: 'CAS 认证失败' };
  } catch (error) {
    console.error('CAS 登录失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

// ============================================
// 辅助函数
// ============================================

/**
 * 从 Cookie 字符串中提取 Session ID
 */
function extractSessionId(cookie: string): string | undefined {
  const match = cookie.match(/JSESSIONID=([^;]+)/) || 
                cookie.match(/kmsgss=([^;]+)/);
  return match?.[1];
}

/**
 * 将 Cookie 数组转换为字符串
 */
export function cookiesToString(cookies: string[]): string {
  return cookies.map(c => c.split(';')[0]).join('; ');
}

/**
 * 获取转换后的 Cookie（用于代理请求）
 */
export async function getConvertedEKPCookie(
  userId: string,
  targetDomain: string
): Promise<string | null> {
  const session = await getEKPSession(userId);
  if (!session?.ekpCookie) return null;
  
  return convertCookieDomain(session.ekpCookie, targetDomain);
}
