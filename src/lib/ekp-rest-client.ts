/**
 * 蓝凌EKP REST 客户端
 * 
 * 使用 Basic Auth 认证，通过 REST API 调用 EKP 服务
 */

// ============================================
// 类型定义
// ============================================

export interface EKPConfig {
  baseUrl: string;
  username: string;
  password: string;
  apiPath: string;      // REST服务路径，如 /api/km-review/kmReviewRestService
  serviceId: string;    // 服务标识
}

export interface EKPRequest {
  fdTemplateId?: string;    // 表单模板ID
  docSubject?: string;      // 文档主题
  docContent?: string;      // 文档内容
  formValues?: Record<string, unknown> | string;  // 表单数据
  fdId?: string;            // 流程ID
  docCreator?: string;      // 创建者
  authAreaId?: string;      // 授权域ID
  fdKeyword?: string;       // 关键词
  fdSource?: string;        // 来源
  docProperty?: string;     // 文档属性
  docStatus?: string;       // 文档状态
  flowParam?: string;       // 流程参数
}

export interface EKPResponse<T = unknown> {
  success: boolean;
  data: T | null;
  msg: string;
  code?: string;
}

// ============================================
// REST 客户端
// ============================================

export class EKPRestClient {
  private config: EKPConfig;

  constructor(config: EKPConfig) {
    this.config = config;
  }

  /**
   * 生成 Basic Auth 头
   */
  private getBasicAuthHeader(): string {
    const credentials = typeof Buffer !== 'undefined'
      ? Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')
      : btoa(`${this.config.username}:${this.config.password}`);
    return `Basic ${credentials}`;
  }

  /**
   * 发送 REST 请求
   */
  async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    action: string,
    data?: Record<string, unknown>
  ): Promise<EKPResponse<T>> {
    const endpoint = `${this.config.baseUrl}${this.config.apiPath}/${action}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': this.getBasicAuthHeader(),
    };

    try {
      const response = await fetch(endpoint, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = await response.json() as EKPResponse<T>;

      // 处理认证失败
      if (response.status === 401 || result.code === 'error.httpStatus.401') {
        return {
          success: false,
          data: null,
          msg: '认证失败：用户名或密码错误',
        };
      }

      return result;

    } catch (err) {
      return {
        success: false,
        data: null,
        msg: `网络错误：${err instanceof Error ? err.message : '未知错误'}`,
      };
    }
  }

  /**
   * 发起流程
   */
  async addReview(formData: EKPRequest): Promise<EKPResponse<string>> {
    const payload = {
      fdTemplateId: formData.fdTemplateId,
      docSubject: formData.docSubject,
      docContent: formData.docContent,
      formValues: typeof formData.formValues === 'string' 
        ? formData.formValues 
        : JSON.stringify(formData.formValues || {}),
      fdId: formData.fdId,
      docCreator: formData.docCreator,
      authAreaId: formData.authAreaId,
      fdKeyword: formData.fdKeyword,
      fdSource: formData.fdSource,
      docProperty: formData.docProperty,
      docStatus: formData.docStatus,
      flowParam: formData.flowParam,
    };

    return this.request<string>('POST', 'addReview', payload);
  }

  /**
   * 审批流程
   */
  async approveReview(formData: EKPRequest): Promise<EKPResponse<string>> {
    return this.request<string>('POST', 'approveProcess', {
      fdId: formData.fdId,
      formValues: typeof formData.formValues === 'string' 
        ? formData.formValues 
        : JSON.stringify(formData.formValues || {}),
    });
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<EKPResponse<string>> {
    // 尝试访问服务端点验证连接
    const endpoint = `${this.config.baseUrl}${this.config.apiPath}`;

    try {
      // 使用 POST 方法测试连接（REST 服务通常需要 POST）
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getBasicAuthHeader(),
        },
        body: JSON.stringify({}),
      });

      // 解析响应内容
      let resultText = '';
      try {
        resultText = await response.text();
      } catch {
        // 忽略解析错误
      }

      // 401 表示认证失败
      if (response.status === 401) {
        return {
          success: false,
          data: null,
          msg: '认证失败：用户名或密码错误',
        };
      }

      // 403 表示权限不足或服务不可用
      if (response.status === 403) {
        return {
          success: false,
          data: null,
          msg: '权限不足：请检查用户是否有访问该服务的权限',
        };
      }

      // 404 表示服务路径不存在
      if (response.status === 404) {
        return {
          success: false,
          data: null,
          msg: '服务不存在：请检查访问路径是否正确',
        };
      }

      // 500 是服务端错误，但可能只是因为请求参数为空
      // 如果返回了 JSON 且包含错误码，说明服务是可访问的
      if (response.status === 500) {
        // 尝试解析错误信息
        try {
          const errorResult = JSON.parse(resultText);
          // 如果是参数错误，说明服务存在且认证通过
          if (errorResult.code?.includes('param') || errorResult.msg?.includes('参数')) {
            return {
              success: true,
              data: '连接成功',
              msg: '服务可访问（认证通过），请配置表单模板ID后使用',
            };
          }
          return {
            success: false,
            data: null,
            msg: `服务端错误：${errorResult.msg || errorResult.message || resultText.substring(0, 100)}`,
          };
        } catch {
          return {
            success: false,
            data: null,
            msg: '服务端错误（HTTP 500），请检查EKP服务状态',
          };
        }
      }

      // 200 或其他成功状态
      if (response.ok) {
        return {
          success: true,
          data: '连接成功',
          msg: '连接成功，服务可用',
        };
      }

      return {
        success: false,
        data: null,
        msg: `连接失败：HTTP ${response.status} - ${resultText.substring(0, 100)}`,
      };

    } catch (err) {
      // 网络错误
      if (err instanceof Error) {
        if (err.message.includes('fetch failed') || err.message.includes('ENOTFOUND')) {
          return {
            success: false,
            data: null,
            msg: '网络错误：无法连接到EKP服务器，请检查地址是否正确',
          };
        }
        if (err.message.includes('certificate') || err.message.includes('SSL')) {
          return {
            success: false,
            data: null,
            msg: 'SSL证书错误：请检查服务器证书配置',
          };
        }
      }
      return {
        success: false,
        data: null,
        msg: `连接失败：${err instanceof Error ? err.message : '网络错误'}`,
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
}): EKPRequest {
  return {
    fdTemplateId: options.templateId,
    docSubject: `${options.leaveType}申请 - ${options.startDate}至${options.endDate}`,
    docContent: options.reason,
    formValues: {
      fdLeaveType: options.leaveType,
      fdStartDate: options.startDate,
      fdEndDate: options.endDate,
      fdDuration: String(options.duration),
      fdReason: options.reason,
      fdContactPhone: options.contactPhone || '',
    },
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
}): EKPRequest {
  return {
    fdTemplateId: options.templateId,
    docSubject: `${options.expenseType}报销 - ¥${options.amount}`,
    docContent: options.description,
    formValues: {
      fdExpenseType: options.expenseType,
      fdAmount: String(options.amount),
      fdDescription: options.description,
      fdExpenseDate: options.expenseDate,
      fdProjectName: options.projectName || '',
    },
  };
}
