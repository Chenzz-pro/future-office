/**
 * EKP SSO 客户端
 * 基于蓝凌官方 WebService 接口实现 SSO 单点登录
 * - getLoginSessionId: 获取 sessionId
 * - getTokenLoginName: 解析 token
 */

import { ekpConfigManager } from './ekp-config-manager';

export interface SSOLoginResult {
  success: boolean;
  sessionId?: string;
  loginName?: string;
  error?: string;
}

/**
 * 调用 EKP WebService 获取 sessionId
 * @param loginName 登录名
 * @param password 密码
 */
export async function getLoginSessionId(loginName: string, password: string): Promise<SSOLoginResult> {
  const config = ekpConfigManager.getConfig();
  const baseUrl = config.baseUrl;
  
  if (!baseUrl) {
    return { success: false, error: 'EKP 未配置' };
  }

  try {
    // 构造 SOAP 请求
    const serviceId = config.ssoServiceId || 'loginWebserviceService';
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <getLoginSessionId xmlns="http://webservice.sys.ekp.landray.com.cn/">
      <arg0>${escapeXml(loginName)}</arg0>
      <arg1>${escapeXml(password)}</arg1>
    </getLoginSessionId>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(`${baseUrl}${config.ssoWebservicePath || '/sys/webserviceservice/'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `http://webservice.sys.ekp.landray.com.cn/${serviceId}/getLoginSessionId`,
      },
      body: soapBody,
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    
    // 解析 SOAP 响应
    const sessionId = extractSoapValue(text, 'return');
    
    if (sessionId) {
      return { success: true, sessionId, loginName };
    } else {
      return { success: false, error: '获取 sessionId 失败' };
    }
  } catch (error) {
    console.error('getLoginSessionId 失败:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 调用 EKP WebService 解析 token 获取登录名
 * @param token SSO token
 */
export async function getTokenLoginName(token: string): Promise<SSOLoginResult> {
  const config = ekpConfigManager.getConfig();
  const baseUrl = config.baseUrl;
  
  if (!baseUrl) {
    return { success: false, error: 'EKP 未配置' };
  }

  try {
    // 构造 SOAP 请求
    const serviceId = config.ssoServiceId || 'loginWebserviceService';
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <getTokenLoginName xmlns="http://webservice.sys.ekp.landray.com.cn/">
      <arg0>${escapeXml(token)}</arg0>
    </getTokenLoginName>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(`${baseUrl}${config.ssoWebservicePath || '/sys/webserviceservice/'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `http://webservice.sys.ekp.landray.com.cn/${serviceId}/getTokenLoginName`,
      },
      body: soapBody,
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    
    // 解析 SOAP 响应
    const loginName = extractSoapValue(text, 'return');
    
    if (loginName) {
      return { success: true, loginName };
    } else {
      return { success: false, error: '解析 token 失败' };
    }
  } catch (error) {
    console.error('getTokenLoginName 失败:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * SSO 自动登录（使用 sessionId）
 * @param sessionId EKP sessionId
 * @param returnUrl 登录后跳转的 URL
 */
export function buildSSOLoginUrl(sessionId: string, returnUrl?: string): string {
  const config = ekpConfigManager.getConfig();
  const baseUrl = config.baseUrl;
  const loginPath = config.ssoLoginPath || '/sys/authentication/sso/login_auto.jsp';
  
  const url = new URL(`${baseUrl}${loginPath}`);
  url.searchParams.set('sessionId', sessionId);
  if (returnUrl) {
    url.searchParams.set('redirectUrl', returnUrl);
  }
  
  return url.toString();
}

/**
 * 验证 sessionId 是否有效
 * @param sessionId EKP sessionId
 */
export async function verifySession(sessionId: string): Promise<boolean> {
  const config = ekpConfigManager.getConfig();
  const baseUrl = config.baseUrl;
  
  if (!baseUrl) {
    return false;
  }

  try {
    const verifyPath = config.ssoSessionVerifyPath || '/sys/org/sys-inf/sysInfo.do?method=currentUser';
    const response = await fetch(`${baseUrl}${verifyPath}`, {
      headers: {
        'Cookie': `JSESSIONID=${sessionId}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data && (data.userId || data.userid || data.user_name);
    }
    return false;
  } catch (error) {
    console.error('验证 session 失败:', error);
    return false;
  }
}

/**
 * 获取 SSO Token
 * @param ekpLoginName EKP 登录名
 */
export async function getSSOToken(ekpLoginName: string): Promise<string | null> {
  // 简单的 token 生成，实际项目中可能需要更复杂的逻辑
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `sso_${ekpLoginName}_${timestamp}_${random}`;
}

// 辅助函数：转义 XML 特殊字符
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 辅助函数：从 SOAP 响应中提取值
function extractSoapValue(xml: string, tagName: string): string | null {
  // 尝试匹配 <return>...</return> 或 <ns2:return>...</ns2:return>
  const patterns = [
    new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i'),
    new RegExp(`<[^:]*:${tagName}[^>]*>([^<]*)</[^:]*:${tagName}>`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}
