/**
 * EKP SSO WebService 客户端
 * 
 * 调用蓝凌 EKP 的单点登录 WebService 接口
 * 服务标识：loginWebserviceService
 * 
 * 接口：
 * - getLoginSessionId: 获取 sessionId
 * - getTokenLoginName: 解析 token
 */

import { callEKPWebService } from './ekp-webservice-client';

export interface LoginSessionIdResult {
  result: boolean;
  sessionId?: string;
  errorMsg?: string;
}

export interface TokenLoginNameResult {
  result: boolean;
  loginName?: string;
  errorMsg?: string;
}

/**
 * 获取登录 SessionId
 * 
 * 流程：
 * 1. 调用 getLoginSessionId(loginName) 获取 sessionId
 * 2. 访问 /sys/authentication/sso/login_auto.jsp?sessionId=xxx&target=encoded_url
 * 3. EKP 设置 Cookie，完成登录
 * 
 * @param loginName EKP 登录名
 * @returns sessionId 或错误信息
 */
export async function getLoginSessionId(loginName: string): Promise<LoginSessionIdResult> {
  if (!loginName) {
    return { result: false, errorMsg: '登录名不能为空' };
  }

  try {
    const response = await callEKPWebService('loginWebserviceService', 'getLoginSessionId', {
      loginName,
    });

    return {
      result: response.result === true || response.result === 'true',
      sessionId: typeof response.sessionId === 'string' ? response.sessionId : undefined,
      errorMsg: typeof response.errorMsg === 'string' ? response.errorMsg : undefined,
    };
  } catch (error) {
    console.error('[EKP SSO] 获取 sessionId 失败:', error);
    return {
      result: false,
      errorMsg: error instanceof Error ? error.message : '获取 sessionId 失败',
    };
  }
}

/**
 * 解析 Token 获取登录名
 * 
 * 流程：
 * 1. 从 Cookie 获取 token (LtpaToken 或 LRToken)
 * 2. 调用 getTokenLoginName(token) 获取登录名
 * 3. 使用登录名自动登录本系统
 * 
 * @param token SSO Token
 * @returns 登录名或错误信息
 */
export async function getTokenLoginName(token: string): Promise<TokenLoginNameResult> {
  if (!token) {
    return { result: false, errorMsg: 'Token 不能为空' };
  }

  try {
    const response = await callEKPWebService('loginWebserviceService', 'getTokenLoginName', {
      token,
    });

    return {
      result: response.result === true || response.result === 'true',
      loginName: typeof response.loginName === 'string' ? response.loginName : undefined,
      errorMsg: typeof response.errorMsg === 'string' ? response.errorMsg : undefined,
    };
  } catch (error) {
    console.error('[EKP SSO] 解析 token 失败:', error);
    return {
      result: false,
      errorMsg: error instanceof Error ? error.message : '解析 token 失败',
    };
  }
}

/**
 * 构建 EKP SSO 登录 URL
 * 
 * @param sessionId 会话 ID
 * @param targetUrl 目标 URL（EKP 内部路径）
 * @returns 完整的 SSO 登录 URL
 */
export function buildSSOLoginUrl(sessionId: string, targetUrl?: string): string {
  const baseUrl = process.env.EKP_BASE_URL || 'https://oa.fjhxrl.com';
  const path = '/sys/authentication/sso/login_auto.jsp';
  
  const params = new URLSearchParams();
  params.set('sessionId', sessionId);
  
  if (targetUrl) {
    params.set('target', encodeURIComponent(targetUrl));
  }
  
  return `${baseUrl}${path}?${params.toString()}`;
}
