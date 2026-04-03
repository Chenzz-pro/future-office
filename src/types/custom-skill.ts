/**
 * 自定义技能类型定义
 * 
 * 支持将外部 REST API 封装为可复用的技能
 */

// ============================================
// 认证配置
// ============================================

export type AuthType = 'basic' | 'bearer' | 'api-key' | 'none';

export interface BasicAuthConfig {
  type: 'basic';
  username: string;
  password: string;
}

export interface BearerAuthConfig {
  type: 'bearer';
  token: string;
}

export interface ApiKeyAuthConfig {
  type: 'api-key';
  apiKey: string;
  headerName: string;  // 如 'X-API-Key'
}

export interface NoAuthConfig {
  type: 'none';
}

export type AuthConfig = BasicAuthConfig | BearerAuthConfig | ApiKeyAuthConfig | NoAuthConfig;

// ============================================
// 请求参数配置
// ============================================

export type ParamType = 'string' | 'number' | 'boolean' | 'json' | 'enum';

export interface RequestParam {
  name: string;              // 参数名
  label: string;             // 显示名称
  type: ParamType;           // 参数类型
  required: boolean;         // 是否必填
  defaultValue?: string;     // 默认值
  placeholder?: string;      // 输入框占位符
  description?: string;      // 参数说明
  enumOptions?: string[];    // 枚举选项（type为enum时使用）
  jsonTemplate?: string;     // JSON模板（type为json时使用）
}

// ============================================
// 响应解析配置
// ============================================

export interface ResponseParsing {
  successField: string;      // 成功标识字段路径，如 'success' 或 'result.returnState'
  successValue: string;      // 成功时的值，如 'true' 或 '2'
  dataField: string;         // 数据字段路径，如 'data' 或 'result.message'
  messageField: string;      // 消息字段路径，如 'message' 或 'msg'
  dataIsJson?: boolean;      // 数据字段是否为JSON字符串，需要二次解析
  countField?: string;       // 数量字段路径（用于待办数量等），如 'count'
}

// ============================================
// API 配置
// ============================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type ContentType = 'application/json' | 'application/x-www-form-urlencoded' | 'text/plain';

export interface ApiConfig {
  baseUrl: string;           // 服务地址，如 'https://oa.fjhxrl.com'
  path: string;              // 服务路径，如 '/api/sys-notify/sysNotifyTodoRestService/getTodo'
  method: HttpMethod;        // HTTP 方法
  contentType: ContentType;  // Content-Type
  timeout?: number;          // 超时时间（毫秒），默认 10000
}

// ============================================
// 技能定义
// ============================================

export type SkillCategory = 
  | '信息获取' 
  | '创作工具' 
  | '开发工具' 
  | '信息处理' 
  | '数据分析' 
  | '语言处理' 
  | '自动化'
  | '企业服务';

export interface CustomSkill {
  id: string;
  name: string;
  description: string;
  icon: string;              // Lucide icon 名称，如 'Bell', 'Database'
  category: SkillCategory;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  
  // API 配置
  apiConfig: ApiConfig;
  
  // 认证配置
  authConfig: AuthConfig;
  
  // 请求参数
  requestParams: RequestParam[];
  
  // 请求体模板（用于构建请求体）
  bodyTemplate?: Record<string, unknown>;
  
  // 响应解析
  responseParsing: ResponseParsing;
  
  // 技能调用提示词（用于AI理解如何调用此技能）
  promptHint?: string;
}

// ============================================
// 技能执行相关
// ============================================

export interface SkillExecutionContext {
  skillId: string;
  params: Record<string, unknown>;
}

export interface SkillExecutionResult {
  success: boolean;
  data: unknown;
  message: string;
  rawResponse?: unknown;
}

// ============================================
// 预置技能模板
// ============================================

export const SKILL_TEMPLATES = {
  ekpTodoCount: {
    name: 'EKP待办查询',
    description: '查询蓝凌EKP系统的待办数量，支持按类型筛选',
    icon: 'Bell',
    category: '企业服务' as SkillCategory,
    apiConfig: {
      baseUrl: '',
      path: '/api/sys-notify/sysNotifyTodoRestService/getTodo',
      method: 'POST' as HttpMethod,
      contentType: 'application/json' as ContentType,
      timeout: 10000,
    },
    authConfig: {
      type: 'basic' as const,
      username: '',
      password: '',
    },
    requestParams: [
      {
        name: 'loginName',
        label: '用户登录名',
        type: 'string' as ParamType,
        required: true,
        placeholder: '请输入EKP登录名',
        description: '要查询待办的用户登录名',
      },
      {
        name: 'type',
        label: '待办类型',
        type: 'enum' as ParamType,
        required: false,
        defaultValue: '0',
        description: '待办类型：-1所有已办，0所有待办，1审批类，2通知类，3暂挂类，13审批+暂挂',
        enumOptions: ['-1', '0', '1', '2', '3', '13'],
      },
    ],
    bodyTemplate: {
      targets: '{"LoginName":"{{loginName}}"}',
      type: '{{type}}',
    },
    responseParsing: {
      successField: 'returnState',
      successValue: '2',
      dataField: 'message',
      messageField: 'message',
      dataIsJson: true,
      countField: 'count',
    },
    promptHint: '用于查询用户的待办数量。调用时需提供loginName（用户登录名）和type（待办类型，默认0表示所有待办）。',
  },
  
  ekpLeaveApply: {
    name: 'EKP请假申请',
    description: '在蓝凌EKP系统发起请假申请流程',
    icon: 'Calendar',
    category: '企业服务' as SkillCategory,
    apiConfig: {
      baseUrl: '',
      path: '/api/km-review/kmReviewRestService/addReview',
      method: 'POST' as HttpMethod,
      contentType: 'application/json' as ContentType,
      timeout: 15000,
    },
    authConfig: {
      type: 'basic' as const,
      username: '',
      password: '',
    },
    requestParams: [
      {
        name: 'templateId',
        label: '表单模板ID',
        type: 'string' as ParamType,
        required: true,
        placeholder: '请输入请假表单模板ID',
        description: '请假表单的模板ID',
      },
      {
        name: 'startDate',
        label: '开始日期',
        type: 'string' as ParamType,
        required: true,
        placeholder: 'YYYY-MM-DD',
        description: '请假开始日期',
      },
      {
        name: 'endDate',
        label: '结束日期',
        type: 'string' as ParamType,
        required: true,
        placeholder: 'YYYY-MM-DD',
        description: '请假结束日期',
      },
      {
        name: 'leaveType',
        label: '请假类型',
        type: 'enum' as ParamType,
        required: true,
        enumOptions: ['年假', '事假', '病假', '调休', '婚假', '产假', '陪产假'],
        description: '请假类型',
      },
      {
        name: 'reason',
        label: '请假原因',
        type: 'string' as ParamType,
        required: true,
        placeholder: '请输入请假原因',
        description: '请假事由说明',
      },
    ],
    responseParsing: {
      successField: 'success',
      successValue: 'true',
      dataField: 'data',
      messageField: 'msg',
    },
    promptHint: '用于发起请假申请。需要提供请假时间范围、类型和原因。',
  },
};

// ============================================
// 工具函数
// ============================================

/**
 * 从技能配置获取完整的 API URL
 */
export function getFullApiUrl(skill: CustomSkill): string {
  const { baseUrl, path } = skill.apiConfig;
  // 确保 baseUrl 不以 / 结尾，path 以 / 开头
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBaseUrl}${cleanPath}`;
}

/**
 * 构建请求头
 */
export function buildHeaders(skill: CustomSkill): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': skill.apiConfig.contentType,
  };
  
  const { authConfig } = skill;
  
  switch (authConfig.type) {
    case 'basic':
      const credentials = typeof Buffer !== 'undefined'
        ? Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64')
        : btoa(`${authConfig.username}:${authConfig.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
      break;
    case 'bearer':
      headers['Authorization'] = `Bearer ${authConfig.token}`;
      break;
    case 'api-key':
      headers[authConfig.headerName] = authConfig.apiKey;
      break;
  }
  
  return headers;
}

/**
 * 构建请求体
 */
export function buildRequestBody(
  skill: CustomSkill, 
  params: Record<string, unknown>
): string | undefined {
  if (skill.apiConfig.method === 'GET') {
    return undefined;
  }
  
  const template = skill.bodyTemplate || {};
  const body: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      // 替换模板变量
      let processedValue = value;
      for (const [paramName, paramValue] of Object.entries(params)) {
        const placeholder = `{{${paramName}}}`;
        processedValue = processedValue.replace(
          new RegExp(placeholder, 'g'),
          String(paramValue)
        );
      }
      body[key] = processedValue;
    } else {
      body[key] = value;
    }
  }
  
  // 根据 Content-Type 格式化
  if (skill.apiConfig.contentType === 'application/x-www-form-urlencoded') {
    return new URLSearchParams(
      Object.entries(body).map(([k, v]) => [k, String(v)])
    ).toString();
  }
  
  return JSON.stringify(body);
}
