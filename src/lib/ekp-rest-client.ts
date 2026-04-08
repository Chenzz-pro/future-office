/**
 * 蓝凌EKP REST 客户端
 * 
 * 使用 Basic Auth 认证，通过 REST API 调用 EKP 服务
 * 
 * 支持的接口：
 * 1. 获取待办数量：/ekp/api/sys-notify/sysNotifyTodoRestService/getTodo
 * 2. 获取待办列表：/ekp/api/sys-notify/sysNotifyTodoRestService/getTodoList
 */

// ============================================
// 类型定义
// ============================================

export interface EKPConfig {
  baseUrl: string;
  username: string;
  password: string;
  apiPath: string;      // REST服务路径（用于测试连接）
  serviceId: string;    // 服务标识
  enabled?: boolean;    // 是否启用
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

// 待办数量返回结果
export interface TodoCountResult {
  returnState: number;  // 0未操作, 1失败, 2成功
  message: string;      // 返回信息或错误信息
}

// 待办列表解析结果
export interface TodoListData {
  count: number;        // 待办总数
  pageCount: number;    // 页数
  pageno: number;       // 当前页
  docs: Array<{
    id: string;
    subject: string;
    type: number;
    createTime: string;
    link: string;
    moduleName: string;
  }>;
}

// 待办类型
export type TodoType = -1 | 0 | 1 | 2 | 3 | 13;
// -1: 所有已办
// 0: 所有待办
// 1: 审批类待办
// 2: 通知类待办
// 3: 暂挂类待办
// 13: 审批类待办、暂挂类待办

// EKP 预定义的 REST 服务路径
export const EKP_REST_PATHS = {
  // 待办通知服务
  notify: {
    getTodo: '/api/sys-notify/sysNotifyTodoRestService/getTodo',
    getTodoList: '/api/sys-notify/sysNotifyTodoRestService/getTodoList',
  },
  // 流程管理服务
  review: {
    addReview: '/api/km-review/kmReviewRestService/addReview',
    approve: '/api/km-review/kmReviewRestService/approveProcess',
  },
  // 组织架构服务（蓝凌标准REST接口）
  organization: {
    // 获取组织树（机构+部门）
    orgTree: '/api/sys/organization/orgTree',
    // 获取人员列表
    person: '/api/sys/organization/person',
    // 获取人员详细信息
    personInfo: '/api/sys/organization/personInfo',
    // 获取组织元素（机构、部门、岗位）
    element: '/api/sys/organization/element',
    // 获取岗位列表
    post: '/api/sys/organization/post',
  },
};

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
   * 发送 REST 请求到指定路径
   */
  private async post<T = unknown>(
    path: string,
    body?: Record<string, unknown>
  ): Promise<{ status: number; result: T | null; text: string; headers: Record<string, string> }> {
    const endpoint = `${this.config.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': this.getBasicAuthHeader(),
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        redirect: 'manual',  // 不自动跟随重定向
      });

      const text = await response.text();
      let result: T | null = null;
      try {
        result = JSON.parse(text) as T;
      } catch {
        // 非 JSON 响应
      }

      // 提取响应头
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return { status: response.status, result, text, headers: responseHeaders };

    } catch (err) {
      throw new Error(`网络错误：${err instanceof Error ? err.message : '未知错误'}`);
    }
  }

  /**
   * 发起流程
   */
  async addReview(formData: EKPRequest): Promise<EKPResponse<string>> {
    const response = await this.post<EKPResponse<string>>(EKP_REST_PATHS.review.addReview, {
      fdTemplateId: formData.fdTemplateId,
      docSubject: formData.docSubject,
      docContent: formData.docContent,
      formValues: typeof formData.formValues === 'string' 
        ? formData.formValues 
        : JSON.stringify(formData.formValues || {}),
    });

    if (response.status === 302) {
      return { success: false, data: null, msg: '认证失败：用户名或密码错误' };
    }

    if (response.status === 401) {
      return { success: false, data: null, msg: '认证失败：用户名或密码错误' };
    }

    return response.result || { success: false, data: null, msg: response.text };
  }

  /**
   * 审批流程
   */
  async approveReview(formData: EKPRequest): Promise<EKPResponse<string>> {
    const response = await this.post<EKPResponse<string>>(EKP_REST_PATHS.review.approve, {
      fdId: formData.fdId,
      formValues: typeof formData.formValues === 'string' 
        ? formData.formValues 
        : JSON.stringify(formData.formValues || {}),
    });

    if (response.status === 302) {
      return { success: false, data: null, msg: '认证失败：用户名或密码错误' };
    }

    if (response.status === 401) {
      return { success: false, data: null, msg: '认证失败：用户名或密码错误' };
    }

    return response.result || { success: false, data: null, msg: response.text };
  }

  /**
   * 获取待办数量
   * @param loginName 登录名或用户ID
   * @param type 待办类型：-1所有已办, 0所有待办, 1审批类, 2通知类, 3暂挂类, 13审批+暂挂
   */
  async getTodoCount(loginName: string, type: TodoType = 0): Promise<EKPResponse<string>> {
    try {
      const response = await this.post<TodoCountResult>(EKP_REST_PATHS.notify.getTodo, {
        targets: JSON.stringify({ LoginName: loginName }),
        type: type,
      });

      // 302 重定向表示认证失败
      if (response.status === 302) {
        return { success: false, data: null, msg: '认证失败：用户名或密码错误' };
      }

      // 认证失败
      if (response.status === 401) {
        return { success: false, data: null, msg: '认证失败：用户名或密码错误' };
      }

      // 权限不足
      if (response.status === 403) {
        return { success: false, data: null, msg: '权限不足：请检查用户是否有访问该服务的权限' };
      }

      // 服务不存在
      if (response.status === 404) {
        return { success: false, data: null, msg: '服务不存在：请检查访问路径是否正确' };
      }

      // 415 不支持的媒体类型
      if (response.status === 415) {
        return { success: false, data: null, msg: '请求格式错误：服务器不支持当前的 Content-Type' };
      }

      // 成功响应
      if (response.result && response.result.returnState === 2) {
        // 解析 message 中的 JSON 数据
        try {
          const todoData: TodoListData = JSON.parse(response.result.message);
          return {
            success: true,
            data: String(todoData.count),
            msg: `获取待办数量成功，共 ${todoData.count} 条待办`,
          };
        } catch {
          // message 不是 JSON，直接返回
          return {
            success: true,
            data: response.result.message,
            msg: '获取待办数量成功',
          };
        }
      } else if (response.result && response.result.returnState === 1) {
        return {
          success: false,
          data: null,
          msg: `获取失败：${response.result.message}`,
        };
      }

      // 尝试解析原始响应
      return {
        success: response.status === 200,
        data: response.text,
        msg: response.status === 200 ? '请求成功' : `请求失败：HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        success: false,
        data: null,
        msg: `请求失败：${err instanceof Error ? err.message : '网络错误'}`,
      };
    }
  }

  /**
   * 测试连接 - 使用获取待办数量接口验证
   */
  async testConnection(): Promise<EKPResponse<string>> {
    // 使用获取待办数量接口测试连接
    // 该接口是蓝凌EKP的标准REST服务
    try {
      const response = await this.post<TodoCountResult>(EKP_REST_PATHS.notify.getTodo, {
        targets: JSON.stringify({ LoginName: this.config.username }),
        type: 0,
      });

      // 302 重定向表示认证失败，被重定向到登录页面或匿名页面
      if (response.status === 302) {
        const location = response.headers['location'] || '';
        if (location.includes('login') || location.includes('anonym')) {
          return { 
            success: false, 
            data: null, 
            msg: '认证失败：用户名或密码错误，请检查登录凭据' 
          };
        }
        return { 
          success: false, 
          data: null, 
          msg: '认证失败：请求被重定向，请检查认证信息' 
        };
      }

      // 认证失败
      if (response.status === 401) {
        return { success: false, data: null, msg: '认证失败：用户名或密码错误' };
      }

      // 权限不足
      if (response.status === 403) {
        return { success: false, data: null, msg: '权限不足：请检查用户是否有访问该服务的权限' };
      }

      // 服务不存在
      if (response.status === 404) {
        return { success: false, data: null, msg: '服务不存在：请检查EKP系统地址是否正确' };
      }

      // 检查是否返回了登录页面（说明认证未通过）
      if (response.text && response.text.includes('<!doctype html') && response.text.includes('登录')) {
        return { 
          success: false, 
          data: null, 
          msg: '认证失败：服务器未接受 Basic Auth 认证，请检查用户名密码是否正确' 
        };
      }

      // 服务端错误
      if (response.status === 500) {
        // 尝试解析错误信息
        try {
          const errorData = JSON.parse(response.text);
          return {
            success: false,
            data: null,
            msg: `服务端错误：${errorData.message || errorData.msg || response.text.substring(0, 100)}`,
          };
        } catch {
          return {
            success: false,
            data: null,
            msg: '服务端错误（HTTP 500），请检查EKP服务状态',
          };
        }
      }

      // 成功响应
      if (response.result) {
        if (response.result.returnState === 2) {
          // 解析 message 中的 JSON 数据
          try {
            const todoData: TodoListData = JSON.parse(response.result.message);
            return {
              success: true,
              data: String(todoData.count),
              msg: `连接成功！待办数量：${todoData.count}`,
            };
          } catch {
            return {
              success: true,
              data: response.result.message,
              msg: `连接成功！返回：${response.result.message}`,
            };
          }
        } else if (response.result.returnState === 1) {
          return {
            success: false,
            data: null,
            msg: `连接成功但查询失败：${response.result.message}`,
          };
        }
      }

      // 其他情况
      if (response.status === 200) {
        // 检查响应是否为 JSON
        try {
          JSON.parse(response.text);
          return { success: true, data: '连接成功', msg: '连接成功，服务可用' };
        } catch {
          // 非 JSON 响应，可能是登录页面
          if (response.text.includes('<!doctype') || response.text.includes('<html')) {
            return { 
              success: false, 
              data: null, 
              msg: '认证失败：服务器返回了登录页面，请检查用户名密码是否正确' 
            };
          }
          return { success: false, data: null, msg: `连接失败：非预期的响应格式` };
        }
      }

      return {
        success: false,
        data: null,
        msg: `连接失败：HTTP ${response.status}`,
      };

    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('fetch failed') || err.message.includes('ENOTFOUND')) {
          return { success: false, data: null, msg: '网络错误：无法连接到EKP服务器，请检查地址是否正确' };
        }
        if (err.message.includes('certificate') || err.message.includes('SSL')) {
          return { success: false, data: null, msg: 'SSL证书错误：请检查服务器证书配置' };
        }
      }
      return {
        success: false,
        data: null,
        msg: `连接失败：${err instanceof Error ? err.message : '网络错误'}`,
      };
    }
  }

  // ============================================
  // 组织架构同步方法
  // ============================================

  /**
   * 获取组织树（机构+部门）
   * @param parentId 父级ID，不传则获取根节点
   */
  async getOrgTree(parentId?: string): Promise<EKPResponse<OrgTreeNode[]>> {
    try {
      const body: Record<string, unknown> = {};
      if (parentId) {
        body.parentId = parentId;
      }

      const response = await this.post<{ data?: OrgTreeNode[]; list?: OrgTreeNode[] }>(
        EKP_REST_PATHS.organization.orgTree,
        body
      );

      if (response.status === 302 || response.status === 401) {
        return { success: false, data: null, msg: '认证失败：用户名或密码错误' };
      }

      if (response.status === 403) {
        return { success: false, data: null, msg: '权限不足：请检查用户是否有访问组织架构的权限' };
      }

      if (response.status === 404) {
        return { success: false, data: null, msg: '服务不存在：请检查EKP系统是否支持组织架构接口' };
      }

      // 解析返回数据
      if (response.result) {
        const data = response.result.data || response.result.list || [];
        return { success: true, data, msg: `获取成功，共 ${data.length} 条` };
      }

      return { success: false, data: null, msg: response.text || '获取组织树失败' };
    } catch (err) {
      return { success: false, data: null, msg: `获取组织树失败：${err instanceof Error ? err.message : '网络错误'}` };
    }
  }

  /**
   * 获取人员列表
   * @param deptId 部门ID，不传则获取所有人员
   * @param page 页码
   * @param pageSize 每页数量
   */
  async getPersonList(deptId?: string, page = 1, pageSize = 100): Promise<EKPResponse<PersonListData>> {
    try {
      const body: Record<string, unknown> = {
        pageno: page,
        count: pageSize,
      };
      if (deptId) {
        body.deptId = deptId;
      }

      const response = await this.post<{ count?: number; datas?: PersonInfo[] }>(
        EKP_REST_PATHS.organization.person,
        body
      );

      if (response.status === 302 || response.status === 401) {
        return { success: false, data: null, msg: '认证失败：用户名或密码错误' };
      }

      if (response.status === 403) {
        return { success: false, data: null, msg: '权限不足：请检查用户是否有访问人员信息的权限' };
      }

      if (response.status === 404) {
        return { success: false, data: null, msg: '服务不存在：请检查EKP系统是否支持人员接口' };
      }

      // 解析返回数据
      if (response.result) {
        return {
          success: true,
          data: {
            count: response.result.count || 0,
            persons: response.result.datas || [],
          },
          msg: `获取成功，共 ${response.result.count || 0} 条`,
        };
      }

      return { success: false, data: null, msg: response.text || '获取人员列表失败' };
    } catch (err) {
      return { success: false, data: null, msg: `获取人员列表失败：${err instanceof Error ? err.message : '网络错误'}` };
    }
  }

  /**
   * 获取岗位列表
   */
  async getPostList(): Promise<EKPResponse<PostInfo[]>> {
    try {
      const response = await this.post<{ data?: PostInfo[]; list?: PostInfo[] }>(
        EKP_REST_PATHS.organization.post,
        {}
      );

      if (response.status === 302 || response.status === 401) {
        return { success: false, data: null, msg: '认证失败：用户名或密码错误' };
      }

      const data = response.result?.data || response.result?.list || [];
      return { success: true, data, msg: `获取成功，共 ${data.length} 条` };
    } catch (err) {
      return { success: false, data: null, msg: `获取岗位列表失败：${err instanceof Error ? err.message : '网络错误'}` };
    }
  }
}

// ============================================
// 组织架构数据类型
// ============================================

/**
 * 组织树节点
 */
export interface OrgTreeNode {
  id: string;
  fdId?: string;
  fdName?: string;
  name?: string;
  fdOrgType?: number; // 1: 机构, 2: 部门, 3: 岗位
  type?: number;
  fdHierarchyId?: string; // 层级路径，格式: x{id1}x{id2}x...
  fdParentId?: string;
  fdParentorgid?: string;
  children?: OrgTreeNode[];
  fdNo?: string;
  fdOrder?: number;
  fdOrgEmail?: string;
}

/**
 * 人员信息
 */
export interface PersonInfo {
  fdId?: string;
  fdName?: string;
  name?: string;
  fdLoginName?: string;
  fdEmail?: string;
  fdMobile?: string;
  fdNo?: string;
  fdRtxAccount?: string;
  fdDeptId?: string;
  fdHierarchyId?: string;
  fdIsLoginEnabled?: number;
}

/**
 * 岗位信息
 */
export interface PostInfo {
  id: string;
  fdId?: string;
  fdName?: string;
  name?: string;
  fdNo?: string;
  fdOrder?: number;
  fdParentId?: string;
}

/**
 * 人员列表数据
 */
export interface PersonListData {
  count: number;
  persons: PersonInfo[];
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
