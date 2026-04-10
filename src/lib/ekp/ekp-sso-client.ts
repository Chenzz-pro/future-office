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
 * 使用 Node.js 原生 https/http 模块发送请求
 * 注意：在 Edge Runtime 中不可用，仅用于服务器端
 */
async function nativeRequest(url: string, options: {
  method: string;
  headers: Record<string, string>;
  body: string;
}): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  const urlObj = new URL(url);
  
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const client = urlObj.protocol === 'https:' 
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ? require('https')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      : require('http');
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method,
      headers: options.headers,
    };
    
    const req = client.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers as Record<string, string | string[] | undefined>,
          body,
        });
      });
    });
    
    req.on('error', reject);
    req.write(options.body);
    req.end();
  });
}

/**
 * 辅助函数：XML 转义
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 辅助函数：从 SOAP 响应中提取值
 */
function extractSoapValue(xml: string, tagName: string): string | null {
  // 首先检查是否有 <return> 标签，尝试从其中提取
  const returnMatch = xml.match(/<return[^>]*>([\s\S]*?)<\/return>/i);
  let searchXml = xml;
  
  if (returnMatch && returnMatch[1]) {
    searchXml = returnMatch[1];
    console.log('[extractSoapValue] 从 <return> 中提取:', { tagName, content: searchXml });
  }
  
  // 尝试匹配 <tagName>...</tagName> 或 <ns:tagName>...</ns:tagName>
  const patterns = [
    new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i'),
    new RegExp(`<[^:]*:${tagName}[^>]*>([^<]*)</[^:]*:${tagName}>`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = searchXml.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * 调用 EKP WebService 获取 sessionId
 * 根据官方文档，getLoginSessionId 接口只需要 loginName 参数
 * @param loginName 登录名
 */
export async function getLoginSessionId(loginName: string): Promise<SSOLoginResult> {
  const config = ekpConfigManager.getConfig();
  const baseUrl = config.baseUrl;
  
  if (!baseUrl) {
    return { success: false, error: 'EKP 未配置' };
  }

  try {
    // 构造 SOAP 请求
    // 注意：根据官方文档，getLoginSessionId 接口只需要 loginName 参数（arg0）
    // arg1 参数可以为空或任意值
    const serviceId = config.ssoServiceId || 'loginWebserviceService';
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <getLoginSessionId xmlns="http://webservice.sys.ekp.landray.com.cn/">
      <arg0>${escapeXml(loginName)}</arg0>
      <arg1></arg1>
    </getLoginSessionId>
  </soap:Body>
</soap:Envelope>`;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `http://webservice.sys.ekp.landray.com.cn/${serviceId}/getLoginSessionId`,
      'User-Agent': 'EKP-SSO-Client/1.0',
    };
    
    // 构建 WebService URL（确保只有一个斜杠）
    const baseUrlClean = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const wsPath = (config.ssoWebservicePath || '/sys/webserviceservice/').startsWith('/') 
      ? config.ssoWebservicePath || '/sys/webserviceservice/'
      : '/' + (config.ssoWebservicePath || 'sys/webserviceservice/');
    const wsUrl = `${baseUrlClean}${wsPath}`;
    
    console.log('[getLoginSessionId] 使用原生模块发送请求');
    console.log('[getLoginSessionId] 完整请求 URL:', wsUrl);
    
    // 使用原生模块发送请求
    const response = await nativeRequest(wsUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: soapBody,
    });

    console.log('[getLoginSessionId] 响应状态:', response.status);
    console.log('[getLoginSessionId] 响应头 Location:', response.headers.location);
    
    // 检查是否是重定向
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.location;
      console.log('[getLoginSessionId] 收到重定向到:', location);
      
      // 检查 Set-Cookie 中是否有 sessionId
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        console.log('[getLoginSessionId] Set-Cookie:', setCookie);
        // 从 Set-Cookie 中提取 sessionId
        const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
        for (const cookie of cookies) {
          const match = cookie.match(/SESSION=([^;]+)/);
          if (match) {
            console.log('[getLoginSessionId] 从 Cookie 获取到 sessionId:', match[1]);
            return { success: true, sessionId: match[1], loginName };
          }
        }
      }
      
      // 如果有 location，说明可能需要特殊处理
      return { success: false, error: `WebService 返回重定向: ${location}` };
    }

    const text = response.body;
    console.log('[getLoginSessionId] 响应长度:', text.length);
    
    // 检查响应是否是 HTML（登录页面），说明认证失败
    if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<script')) {
      console.error('[getLoginSessionId] 收到 HTML 响应，可能是认证失败');
      // 提取页面标题
      const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : '无标题';
      console.error('[getLoginSessionId] HTML 页面标题:', title);
      // 检查是否是登录页面
      if (text.includes('login') || text.includes('Login') || text.includes('登录')) {
        return { success: false, error: 'WebService 认证失败，请检查 EKP 配置中的用户名和密码' };
      }
      return { success: false, error: `WebService 返回异常页面: ${title}` };
    }
    
    // 解析 SOAP 响应
    const sessionId = extractSoapValue(text, 'return');
    
    if (sessionId) {
      return { success: true, sessionId, loginName };
    } else {
      // 尝试解析 result 和 errorMsg
      const result = extractSoapValue(text, 'result');
      const errorMsg = extractSoapValue(text, 'errorMsg');
      console.log('[getLoginSessionId] 解析结果:', { result, errorMsg });
      return { success: false, error: errorMsg || '获取 sessionId 失败' };
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

    const baseUrlClean = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const wsPath = (config.ssoWebservicePath || '/sys/webserviceservice/').startsWith('/') 
      ? config.ssoWebservicePath || '/sys/webserviceservice/'
      : '/' + (config.ssoWebservicePath || 'sys/webserviceservice/');
    const wsUrl = `${baseUrlClean}${wsPath}`;

    const response = await nativeRequest(wsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `http://webservice.sys.ekp.landray.com.cn/${serviceId}/getTokenLoginName`,
        'User-Agent': 'EKP-SSO-Client/1.0',
      },
      body: soapBody,
    });

    if (response.status !== 200) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const text = response.body;
    
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
    const response = await nativeRequest(`${baseUrl}${verifyPath}`, {
      method: 'GET',
      headers: {
        'Cookie': `JSESSIONID=${sessionId}`,
        'User-Agent': 'EKP-SSO-Client/1.0',
      },
      body: '',
    });

    if (response.status === 200) {
      try {
        const data = JSON.parse(response.body);
        return !!(data && (data.userId || data.userid || data.user_name));
      } catch {
        return false;
      }
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
