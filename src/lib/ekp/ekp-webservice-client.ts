/**
 * EKP WebService 客户端
 * 
 * 用于调用蓝凌 EKP 的 WebService 接口
 * 使用 SOAP 1.1 协议
 */

const EKP_BASE_URL = process.env.EKP_BASE_URL || 'https://oa.fjhxrl.com';
const EKP_WEBSERVICE_URL = `${EKP_BASE_URL}/sys/webserviceservice/`;

/**
 * 调用 EKP WebService 接口
 * 
 * @param serviceName 服务标识（如：loginWebserviceService）
 * @param methodName 方法名（如：getLoginSessionId）
 * @param params 参数对象
 * @returns 解析后的响应数据
 */
export async function callEKPWebService(
  serviceName: string,
  methodName: string,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // 构建 SOAP 请求体
  const soapRequest = buildSOAPRequest(serviceName, methodName, params);
  
  try {
    const response = await fetch(EKP_WEBSERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `urn:${methodName}`,
      },
      body: soapRequest,
    });

    if (!response.ok) {
      throw new Error(`WebService 请求失败: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();
    return parseSOAPResponse(responseText);
  } catch (error) {
    console.error('[EKP WebService] 调用失败:', error);
    throw error;
  }
}

/**
 * 构建 SOAP 1.1 请求体
 */
function buildSOAPRequest(
  serviceName: string,
  methodName: string,
  params: Record<string, unknown>
): string {
  // 构建参数部分
  const paramParts = Object.entries(params)
    .map(([key, value]) => `      <ns2:${key}>${escapeXML(String(value))}</ns2:${key}>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns2="${EKP_WEBSERVICE_URL}${serviceName}/">
  <soap:Header/>
  <soap:Body>
    <ns2:${methodName}>
${paramParts}
    </ns2:${methodName}>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * 解析 SOAP 响应
 */
function parseSOAPResponse(responseText: string): Record<string, unknown> {
  try {
    // 提取 Body 内容
    const bodyMatch = responseText.match(/<soap:Body[^>]*>([\s\S]*?)<\/soap:Body>/i);
    if (!bodyMatch) {
      throw new Error('无法解析 SOAP 响应: 缺少 Body');
    }

    const bodyContent = bodyMatch[1];
    
    // 提取返回的参数（支持 ns2: 前缀和无前缀）
    const result: Record<string, unknown> = {};
    
    // 匹配所有参数
    const paramRegex = /<(?:ns2:)?(\w+)>([^<]*)<\/(?:ns2:)?\w+>/g;
    let match;
    
    while ((match = paramRegex.exec(bodyContent)) !== null) {
      const key = match[1];
      let value: unknown = match[2];
      
      // 转换布尔值
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      
      result[key] = value;
    }

    return result;
  } catch (error) {
    console.error('[EKP WebService] 解析响应失败:', error);
    throw new Error('解析 SOAP 响应失败');
  }
}

/**
 * XML 特殊字符转义
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
