/**
 * 蓝凌EKP SOAP 客户端
 * 
 * 使用 Basic Auth 认证，通过 SOAP 协议调用 EKP WebService
 */

// ============================================
// 类型定义
// ============================================

export interface EKPConfig {
  baseUrl: string;
  username: string;
  password: string;
  serviceId: string;  // 服务标识，如 'kmReviewWebserviceService'
}

export interface KmReviewParameterForm {
  fdTemplateId?: string;      // 表单模板ID
  docSubject?: string;        // 文档主题
  docContent?: string;        // 文档内容
  formValues?: string;        // 表单数据（JSON字符串）
  fdId?: string;              // 流程ID（更新时使用）
  docCreator?: string;        // 创建者
  authAreaId?: string;        // 授权域ID
  fdKeyword?: string;         // 关键词
  fdSource?: string;          // 来源
  docProperty?: string;       // 文档属性
  docStatus?: string;         // 文档状态
  flowParam?: string;         // 流程参数
  identity?: string;          // 身份标识
  language?: string;          // 语言
}

export interface SoapResponse {
  success: boolean;
  data?: string;
  error?: string;
}

// ============================================
// SOAP 客户端
// ============================================

export class EKPSoapClient {
  private config: EKPConfig;

  constructor(config: EKPConfig) {
    this.config = config;
  }

  /**
   * 构建 SOAP Envelope
   */
  private buildSoapEnvelope(methodName: string, params: Record<string, string | undefined>): string {
    const paramXml = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        // 处理特殊字符
        const escapedValue = this.escapeXml(String(value));
        return `<${key}>${escapedValue}</${key}>`;
      })
      .join('\n          ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:rev="http://webservice.review.km.kmss.landray.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <rev:${methodName}>
      <arg0>
        ${paramXml}
      </arg0>
    </rev:${methodName}>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * 转义 XML 特殊字符
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 生成 Basic Auth 头
   */
  private getBasicAuthHeader(): string {
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * 发送 SOAP 请求
   */
  async sendSoapRequest(methodName: string, params: KmReviewParameterForm): Promise<SoapResponse> {
    // 转换参数为 Record 类型
    const typedParams: Record<string, string | undefined> = {
      fdTemplateId: params.fdTemplateId,
      docSubject: params.docSubject,
      docContent: params.docContent,
      formValues: params.formValues,
      fdId: params.fdId,
      docCreator: params.docCreator,
      authAreaId: params.authAreaId,
      fdKeyword: params.fdKeyword,
      fdSource: params.fdSource,
      docProperty: params.docProperty,
      docStatus: params.docStatus,
      flowParam: params.flowParam,
      identity: params.identity,
      language: params.language,
    };
    
    const soapEnvelope = this.buildSoapEnvelope(methodName, typedParams);
    const endpoint = `${this.config.baseUrl}/sys/webservice/${this.config.serviceId}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'Authorization': this.getBasicAuthHeader(),
          'SOAPAction': '',
        },
        body: soapEnvelope,
      });

      const responseText = await response.text();

      // 检查 HTTP 状态
      if (!response.ok) {
        // 检查是否是认证失败
        if (response.status === 401) {
          return {
            success: false,
            error: '认证失败：用户名或密码错误',
          };
        }
        return {
          success: false,
          error: `HTTP ${response.status}: ${responseText.substring(0, 200)}`,
        };
      }

      // 解析 SOAP 响应
      return this.parseSoapResponse(responseText, methodName);

    } catch (err) {
      return {
        success: false,
        error: `网络错误：${err instanceof Error ? err.message : '未知错误'}`,
      };
    }
  }

  /**
   * 解析 SOAP 响应
   */
  private parseSoapResponse(xml: string, methodName: string): SoapResponse {
    // 检查是否是 SOAP Fault
    if (xml.includes('<soap:Fault') || xml.includes('<S:Fault')) {
      const faultMatch = xml.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
      const faultString = faultMatch ? faultMatch[1] : 'SOAP 请求失败';
      return {
        success: false,
        error: faultString,
      };
    }

    // 提取返回值
    const returnMatch = xml.match(new RegExp(`<return[^>]*>([^<]*)<\/return>`, 'i'));
    const returnValue = returnMatch ? returnMatch[1] : '';

    // 检查是否包含错误信息
    if (returnValue.includes('error') || returnValue.includes('失败') || returnValue.includes('异常')) {
      return {
        success: false,
        error: returnValue,
      };
    }

    return {
      success: true,
      data: returnValue,
    };
  }

  /**
   * 发起流程
   */
  async addReview(formData: KmReviewParameterForm): Promise<SoapResponse> {
    return this.sendSoapRequest('addReview', formData);
  }

  /**
   * 审批流程
   */
  async approveReview(formData: KmReviewParameterForm): Promise<SoapResponse> {
    return this.sendSoapRequest('approveProcess', formData);
  }

  /**
   * 更新流程信息
   */
  async updateReviewInfo(formData: KmReviewParameterForm): Promise<SoapResponse> {
    return this.sendSoapRequest('updateReviewInfo', formData);
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<SoapResponse> {
    // 尝试获取 WSDL 来验证连接
    const wsdlUrl = `${this.config.baseUrl}/sys/webservice/${this.config.serviceId}?wsdl`;

    try {
      const response = await fetch(wsdlUrl, {
        method: 'GET',
        headers: {
          'Authorization': this.getBasicAuthHeader(),
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: '认证失败：用户名或密码错误',
          };
        }
        return {
          success: false,
          error: `连接失败：HTTP ${response.status}`,
        };
      }

      const wsdlText = await response.text();

      // 检查是否是有效的 WSDL
      if (!wsdlText.includes('wsdl:definitions') && !wsdlText.includes('definitions')) {
        return {
          success: false,
          error: '无效的服务端点，请检查服务标识',
        };
      }

      return {
        success: true,
        data: '连接成功，服务可用',
      };

    } catch (err) {
      return {
        success: false,
        error: `连接失败：${err instanceof Error ? err.message : '网络错误'}`,
      };
    }
  }
}

// ============================================
// 辅助函数
// ============================================

/**
 * 构建请假表单数据
 */
export function buildLeaveFormData(options: {
  templateId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  duration: number;
  reason: string;
  contactPhone?: string;
}): KmReviewParameterForm {
  const formValues = JSON.stringify({
    fdLeaveType: options.leaveType,
    fdStartDate: options.startDate,
    fdEndDate: options.endDate,
    fdDuration: String(options.duration),
    fdReason: options.reason,
    fdContactPhone: options.contactPhone || '',
  });

  return {
    fdTemplateId: options.templateId,
    docSubject: `${options.leaveType}申请 - ${options.startDate}至${options.endDate}`,
    docContent: options.reason,
    formValues: formValues,
  };
}

/**
 * 构建报销表单数据
 */
export function buildExpenseFormData(options: {
  templateId: string;
  expenseType: string;
  amount: number;
  description: string;
  expenseDate: string;
  projectName?: string;
}): KmReviewParameterForm {
  const formValues = JSON.stringify({
    fdExpenseType: options.expenseType,
    fdAmount: String(options.amount),
    fdDescription: options.description,
    fdExpenseDate: options.expenseDate,
    fdProjectName: options.projectName || '',
  });

  return {
    fdTemplateId: options.templateId,
    docSubject: `${options.expenseType}报销 - ¥${options.amount}`,
    docContent: options.description,
    formValues: formValues,
  };
}
