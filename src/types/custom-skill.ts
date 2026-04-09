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
  
  // 子技能配置（用于支持多操作的技能如EKP待办服务）
  subSkills?: EKPNotifySubSkill[];
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

// ============================================
// EKP 待办服务接口定义
// ============================================

export type EKPNotifyAction = 'sendTodo' | 'deleteTodo' | 'setTodoDone' | 'getTodo' | 'getTodoCount' | 'updateTodo' | 'getTodoTargets';

export interface EKPNotifyRequestParam {
  name: string;              // 参数名
  label: string;             // 显示名称
  type: ParamType;           // 参数类型
  required: boolean;         // 是否必填
  defaultValue?: string;     // 默认值
  placeholder?: string;      // 输入框占位符
  description?: string;      // 参数说明
  enumOptions?: string[];    // 枚举选项（type为enum时使用）
}

export interface EKPNotifySubSkill {
  action: EKPNotifyAction;  // 接口操作类型
  name: string;              // 操作名称
  description: string;       // 操作描述
  params: EKPNotifyRequestParam[];  // 请求参数
}

// EKP待办服务 - 7个接口定义
export const EKP_NOTIFY_SUB_SKILLS: EKPNotifySubSkill[] = [
  {
    action: 'getTodoCount',
    name: '获取待办数量',
    description: '获取指定用户的待办数量，支持按类型筛选',
    params: [
      {
        name: 'target',
        label: '待办所属对象',
        type: 'string',
        required: true,
        placeholder: '{"LoginName":"admin"}',
        description: '待办所属人，数据格式为JSON，支持类型：Id、PersonNo、DeptNo、PostNo、LoginName等',
      },
      {
        name: 'types',
        label: '待办类型',
        type: 'string',
        required: false,
        defaultValue: '[{"type":"0"}]',
        placeholder: '[{"type":"0"}]',
        description: '-1所有已办，0所有待办，1审批类，2通知类，3暂挂类，13审批+暂挂',
      },
    ],
  },
  {
    action: 'getTodo',
    name: '获取待办列表',
    description: '获取指定用户的待办事项列表，支持分页和多种筛选条件',
    params: [
      {
        name: 'targets',
        label: '待办所属对象',
        type: 'string',
        required: true,
        placeholder: '{"LoginName":"admin"}',
        description: '待办所属人，数据格式为JSON',
      },
      {
        name: 'type',
        label: '待办类型',
        type: 'string',
        required: false,
        defaultValue: '0',
        placeholder: '0',
        description: '-1所有已办，0所有待办，1审批类，2通知类，3暂挂类，4已处理，5已阅，13审批+暂挂',
      },
      {
        name: 'otherCond',
        label: '其他查询条件',
        type: 'string',
        required: false,
        placeholder: '[{"key":"reviewmain"},{"modelId":"xxx"}]',
        description: 'JSON数组格式，支持：appName、modelName、modelId、subject、beginTime、endTime等',
      },
      {
        name: 'rowSize',
        label: '每页条数',
        type: 'string',
        required: false,
        defaultValue: '20',
        placeholder: '20',
        description: '每页显示的待办数量，不填取系统默认值',
      },
      {
        name: 'pageNo',
        label: '页码',
        type: 'string',
        required: false,
        defaultValue: '1',
        placeholder: '1',
        description: '要获取的页码，从1开始',
      },
    ],
  },
  {
    action: 'sendTodo',
    name: '发送待办',
    description: '向指定人员发送待办通知',
    params: [
      {
        name: 'modelName',
        label: '模块名',
        type: 'string',
        required: true,
        placeholder: 'com.landray.kmss.km_review',
        description: '标识待办来源的模块',
      },
      {
        name: 'modelId',
        label: '待办唯一标识',
        type: 'string',
        required: true,
        placeholder: '文档ID',
        description: '待办在原系统中的唯一标识',
      },
      {
        name: 'subject',
        label: '待办标题',
        type: 'string',
        required: true,
        placeholder: '请处理:XXX',
        description: '待办事项的标题',
      },
      {
        name: 'link',
        label: 'PC端链接',
        type: 'string',
        required: true,
        placeholder: 'https://oa.fjhxrl.com/sys/xxx',
        description: '待办对应的PC端链接地址(全路径)',
      },
      {
        name: 'mobileLink',
        label: '移动端链接',
        type: 'string',
        required: true,
        placeholder: 'https://oa.fjhxrl.com/mobile/xxx',
        description: '待办对应的移动端链接地址(全路径)',
      },
      {
        name: 'padLink',
        label: 'Pad端链接',
        type: 'string',
        required: true,
        placeholder: 'https://oa.fjhxrl.com/pad/xxx',
        description: '待办对应的Pad端链接地址(全路径)',
      },
      {
        name: 'type',
        label: '待办类型',
        type: 'string',
        required: true,
        defaultValue: '1',
        placeholder: '1',
        description: '1表示审批类待办，2表示通知类待办',
      },
      {
        name: 'targets',
        label: '待办接收人',
        type: 'string',
        required: true,
        placeholder: '[{"LoginName":"zhangsan"},{"Id":"xxx"}]',
        description: '待办接收人，数据格式为JSON数组',
      },
      {
        name: 'createTime',
        label: '创建时间',
        type: 'string',
        required: true,
        placeholder: '2024-01-15 10:30:00',
        description: '待办创建时间，格式：yyyy-MM-dd HH:mm:ss',
      },
      {
        name: 'key',
        label: '关键字',
        type: 'string',
        required: false,
        placeholder: 'reviewmain',
        description: '用于区分同一文档下不同类型的待办',
      },
      {
        name: 'level',
        label: '优先级',
        type: 'string',
        required: false,
        defaultValue: '3',
        placeholder: '3',
        description: '待办优先级：1紧急，2急，3一般',
      },
    ],
  },
  {
    action: 'deleteTodo',
    name: '删除待办',
    description: '删除指定的待办事项',
    params: [
      {
        name: 'modelName',
        label: '模块名',
        type: 'string',
        required: true,
        placeholder: 'com.landray.kmss.km_review',
        description: '标识待办来源的模块',
      },
      {
        name: 'modelId',
        label: '待办唯一标识',
        type: 'string',
        required: true,
        placeholder: '文档ID',
        description: '待办在原系统中的唯一标识',
      },
      {
        name: 'optType',
        label: '操作类型',
        type: 'string',
        required: true,
        defaultValue: '1',
        placeholder: '1',
        description: '1表示删除待办，2表示删除指定待办所属人（已办处理）',
      },
      {
        name: 'type',
        label: '待办类型',
        type: 'string',
        required: false,
        placeholder: '1',
        description: '待办类型：1待审，2待阅，3暂挂',
      },
      {
        name: 'targets',
        label: '待办所属人',
        type: 'string',
        required: false,
        placeholder: '[{"LoginName":"zhangsan"}]',
        description: '操作类型为2时必填，待办所属人',
      },
      {
        name: 'key',
        label: '关键字',
        type: 'string',
        required: false,
        placeholder: 'reviewmain',
        description: '用于区分同一文档下不同类型的待办',
      },
    ],
  },
  {
    action: 'setTodoDone',
    name: '设为已办',
    description: '将待办标记为已处理状态',
    params: [
      {
        name: 'modelName',
        label: '模块名',
        type: 'string',
        required: true,
        placeholder: 'com.landray.kmss.km_review',
        description: '标识待办来源的模块',
      },
      {
        name: 'modelId',
        label: '待办唯一标识',
        type: 'string',
        required: true,
        placeholder: '文档ID',
        description: '待办在原系统中的唯一标识',
      },
      {
        name: 'optType',
        label: '操作类型',
        type: 'string',
        required: true,
        defaultValue: '1',
        placeholder: '1',
        description: '1表示设待办为已办，2表示设置目标待办所属人为已办',
      },
      {
        name: 'type',
        label: '待办类型',
        type: 'string',
        required: false,
        placeholder: '1',
        description: '待办类型：1待审，2待阅，3暂挂',
      },
      {
        name: 'targets',
        label: '待办所属人',
        type: 'string',
        required: false,
        placeholder: '[{"LoginName":"zhangsan"}]',
        description: '操作类型为2时必填，待办所属人',
      },
      {
        name: 'key',
        label: '关键字',
        type: 'string',
        required: false,
        placeholder: 'reviewmain',
        description: '用于区分同一文档下不同类型的待办',
      },
    ],
  },
  {
    action: 'updateTodo',
    name: '更新待办',
    description: '更新已存在的待办信息',
    params: [
      {
        name: 'modelName',
        label: '模块名',
        type: 'string',
        required: true,
        placeholder: 'com.landray.kmss.km_review',
        description: '标识待办来源的模块',
      },
      {
        name: 'modelId',
        label: '待办唯一标识',
        type: 'string',
        required: true,
        placeholder: '文档ID',
        description: '待办在原系统中的唯一标识',
      },
      {
        name: 'subject',
        label: '待办标题',
        type: 'string',
        required: true,
        placeholder: '请处理:XXX',
        description: '更新后的待办标题',
      },
      {
        name: 'link',
        label: 'PC端链接',
        type: 'string',
        required: true,
        placeholder: 'https://oa.fjhxrl.com/sys/xxx',
        description: '待办对应的PC端链接地址(全路径)',
      },
      {
        name: 'mobileLink',
        label: '移动端链接',
        type: 'string',
        required: true,
        placeholder: 'https://oa.fjhxrl.com/mobile/xxx',
        description: '待办对应的移动端链接地址(全路径)',
      },
      {
        name: 'padLink',
        label: 'Pad端链接',
        type: 'string',
        required: true,
        placeholder: 'https://oa.fjhxrl.com/pad/xxx',
        description: '待办对应的Pad端链接地址(全路径)',
      },
      {
        name: 'type',
        label: '待办类型',
        type: 'string',
        required: true,
        defaultValue: '1',
        placeholder: '1',
        description: '待办类型：1待审，2待阅，3暂挂',
      },
      {
        name: 'level',
        label: '优先级',
        type: 'string',
        required: true,
        defaultValue: '3',
        placeholder: '3',
        description: '待办优先级：1紧急，2急，3一般',
      },
      {
        name: 'key',
        label: '关键字',
        type: 'string',
        required: false,
        placeholder: 'reviewmain',
        description: '用于区分同一文档下不同类型的待办',
      },
    ],
  },
  {
    action: 'getTodoTargets',
    name: '获取待办接收人',
    description: '获取指定待办的所有接收人列表',
    params: [
      {
        name: 'fdId',
        label: '待办ID',
        type: 'string',
        required: true,
        placeholder: '待办在EKP中的唯一标识',
        description: '要查询的待办ID',
      },
    ],
  },
];

// ============================================
// 预置技能模板
// ============================================

export const SKILL_TEMPLATES = {
  ekpNotifyService: {
    name: 'EKP待办服务',
    description: '蓝凌EKP待办REST服务，支持发送、删除、已办、查询、更新待办等7个接口操作',
    icon: 'BellRing',
    category: '企业服务' as SkillCategory,
    apiConfig: {
      baseUrl: '',
      path: '/api/sys-notify/sysNotifyTodoRestService',
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
        name: 'action',
        label: '操作类型',
        type: 'enum' as ParamType,
        required: true,
        defaultValue: 'getTodoCount',
        description: '选择要执行的待办操作',
        enumOptions: EKP_NOTIFY_SUB_SKILLS.map(s => s.action),
      },
    ],
    responseParsing: {
      successField: 'returnState',
      successValue: '2',
      dataField: 'message',
      messageField: 'message',
      dataIsJson: true,
    },
    promptHint: 'EKP待办服务，支持7个操作：getTodoCount(获取待办数量)、getTodo(获取待办列表)、sendTodo(发送待办)、deleteTodo(删除待办)、setTodoDone(设为已办)、updateTodo(更新待办)、getTodoTargets(获取待办接收人)',
    // EKP待办服务的子技能配置
    subSkills: EKP_NOTIFY_SUB_SKILLS,
  },
  ekpTodoCount: {
    name: 'EKP待办查询',
    description: '查询蓝凌EKP系统的待办数量，支持按类型筛选（兼容旧版）',
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
