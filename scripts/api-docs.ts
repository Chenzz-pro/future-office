/**
 * 系统接口文档生成脚本
 * 生成完整的接口说明文档
 */

export interface ApiDoc {
  category: string;          // 接口分类
  path: string;              // 接口路径
  method: string;            // 请求方法
  description: string;       // 功能说明
  params: ApiParam[];         // 请求参数
  returns: ApiReturn[];       // 返回参数
  notes?: string;             // 备注说明
}

export interface ApiParam {
  name: string;              // 参数名
  type: string;              // 参数类型
  required: boolean;          // 是否必填
  description: string;        // 参数说明
}

export interface ApiReturn {
  field: string;              // 返回字段
  type: string;              // 字段类型
  description: string;         // 字段说明
}

// ============================================
// 系统接口文档
// ============================================

export const API_DOCS: ApiDoc[] = [
  // ==========================================
  // 一、认证模块 (/api/auth)
  // ==========================================
  {
    category: '认证模块',
    path: '/api/auth/login',
    method: 'POST',
    description: '用户登录接口，支持用户名/密码或钉钉信息登录',
    params: [
      { name: 'username', type: 'string', required: false, description: '登录用户名（与password配套）' },
      { name: 'password', type: 'string', required: false, description: '登录密码（与username配套）' },
      { name: 'rtx_account', type: 'string', required: false, description: 'RTX账号（与email配套）' },
      { name: 'email', type: 'string', required: false, description: '邮箱（与rtx_account配套）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.userId', type: 'string', description: '用户ID（sys_org_person.fd_id）' },
      { field: 'data.username', type: 'string', description: '登录名' },
      { field: 'data.personName', type: 'string', description: '人员姓名' },
      { field: 'data.role', type: 'object', description: '角色信息 {id, code, name, isAdmin}' },
      { field: 'data.needPasswordUpdate', type: 'boolean', description: '是否需要更新密码（base64旧密码迁移提示）' },
    ],
    notes: 'sys_org_person就是系统用户表，通过fd_login_name查找用户',
  },
  {
    category: '认证模块',
    path: '/api/auth/password',
    method: 'GET',
    description: '检查密码强度',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型，固定值：strength' },
      { name: 'password', type: 'string', required: true, description: '待检查的密码' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.valid', type: 'boolean', description: '密码是否有效' },
      { field: 'data.strength', type: 'string', description: '强度等级：weak/medium/strong' },
      { field: 'data.score', type: 'number', description: '强度分数（0-5）' },
      { field: 'data.errors', type: 'string[]', description: '错误信息列表' },
    ],
  },
  {
    category: '认证模块',
    path: '/api/auth/password',
    method: 'POST',
    description: '密码管理操作（重置密码、生成随机密码）',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：reset（重置）/ generate（生成）' },
      { name: 'userId', type: 'string', required: false, description: '用户ID（reset操作时必填）' },
      { name: 'newPassword', type: 'string', required: false, description: '新密码（reset操作时必填）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.password', type: 'string', description: '生成的随机密码（generate操作时返回）' },
      { field: 'error', type: 'string', description: '错误信息' },
    ],
  },

  // ==========================================
  // 二、组织架构模块 (/api/organization)
  // ==========================================
  {
    category: '组织架构',
    path: '/api/organization',
    method: 'GET',
    description: '获取组织架构数据（树形列表）',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：tree（树形数据）/ list（列表数据）' },
      { name: 'type', type: 'number', required: false, description: '组织类型：1（机构）/ 2（部门）/ 3（岗位）' },
      { name: 'parentId', type: 'string', required: false, description: '父级ID（list操作时使用）' },
      { name: 'keyword', type: 'string', required: false, description: '搜索关键词（list操作时使用）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '组织架构数据数组' },
      { field: 'data[].fd_id', type: 'string', description: '组织ID' },
      { field: 'data[].fd_name', type: 'string', description: '组织名称' },
      { field: 'data[].fd_org_type', type: 'number', description: '组织类型：1机构 2部门 3岗位' },
      { field: 'data[].children', type: 'array', description: '子节点（tree操作时返回）' },
    ],
  },
  {
    category: '组织架构',
    path: '/api/organization',
    method: 'POST',
    description: '组织架构CRUD操作',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：create / update / delete' },
      { name: 'type', type: 'string', required: true, description: '类型：organization/department/position/person' },
      { name: 'data', type: 'object', required: false, description: '创建/更新的数据' },
      { name: 'id', type: 'string', required: false, description: '记录ID（update/delete操作时必填）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.id', type: 'string', description: '创建的记录ID' },
      { field: 'generatedPassword', type: 'string', description: '自动生成的登录密码（创建人员时返回）' },
    ],
    notes: '创建人员时，如果没提供密码会自动生成12位随机密码',
  },
  {
    category: '组织架构',
    path: '/api/organization/role',
    method: 'GET',
    description: '获取角色列表',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '角色列表' },
      { field: 'data[].fd_id', type: 'string', description: '角色ID' },
      { field: 'data[].fd_name', type: 'string', description: '角色名称' },
      { field: 'data[].fd_code', type: 'string', description: '角色代码' },
    ],
  },
  {
    category: '组织架构',
    path: '/api/organization/role',
    method: 'POST',
    description: '角色CRUD操作',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：create / update / delete' },
      { name: 'data', type: 'object', required: false, description: '角色数据（create/update时使用）' },
      { name: 'id', type: 'string', required: false, description: '角色ID（update/delete时使用）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.id', type: 'string', description: '操作的角色ID' },
    ],
  },

  // ==========================================
  // 三、EKP集成模块 (/api/ekp)
  // ==========================================
  {
    category: 'EKP集成',
    path: '/api/ekp',
    method: 'POST',
    description: 'EKP REST API统一代理接口',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：test / getTodoCount / addReview / approveReview' },
      { name: 'baseUrl', type: 'string', required: true, description: 'EKP系统地址' },
      { name: 'username', type: 'string', required: true, description: '认证用户名' },
      { name: 'password', type: 'string', required: true, description: '认证密码' },
      { name: 'loginName', type: 'string', required: false, description: '待办查询的用户登录名（getTodoCount时使用）' },
      { name: 'todoType', type: 'number', required: false, description: '待办类型：-1已办/0所有/1审批/2通知/3暂挂/13审批+暂挂' },
      { name: 'templateId', type: 'string', required: false, description: '表单模板ID（addReview时使用）' },
      { name: 'data', type: 'object', required: false, description: '表单数据（addReview/approveReview时使用）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'message', type: 'string', description: '结果消息' },
      { field: 'todoCount', type: 'string', description: '待办数量（getTodoCount时返回）' },
    ],
  },
  {
    category: 'EKP集成',
    path: '/api/ekp/todo/list',
    method: 'GET',
    description: '查询EKP待办列表',
    params: [
      { name: 'todoType', type: 'number', required: false, description: '待办类型：0所有/1审批/2通知/3暂挂' },
      { name: 'page', type: 'number', required: false, description: '页码（默认1）' },
      { name: 'pageSize', type: 'number', required: false, description: '每页数量（默认20）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '待办列表' },
      { field: 'data[].id', type: 'string', description: '待办ID' },
      { field: 'data[].subject', type: 'string', description: '待办主题' },
      { field: 'data[].type', type: 'number', description: '待办类型' },
    ],
  },
  {
    category: 'EKP集成',
    path: '/api/ekp/todo/[id]/approve',
    method: 'POST',
    description: '审批EKP待办',
    params: [
      { name: 'fdId', type: 'string', required: true, description: '待办ID' },
      { name: 'formValues', type: 'object', required: false, description: '审批表单数据' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'object', description: '审批结果' },
    ],
  },

  // ==========================================
  // 四、组织架构同步模块 (/api/organization/sync, /api/org-sync)
  // ==========================================
  {
    category: '组织架构同步',
    path: '/api/organization/sync',
    method: 'POST',
    description: '从EKP同步组织架构数据（使用getUpdatedElements接口）',
    params: [
      { name: 'source', type: 'string', required: true, description: '同步来源，固定值：ekp' },
      { name: 'type', type: 'string', required: false, description: '同步类型：full（全量）/ incremental（增量）' },
      { name: 'scope', type: 'array', required: false, description: '同步范围：organizations/departments/persons' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'stats.total', type: 'number', description: '总记录数' },
      { field: 'stats.success', type: 'number', description: '成功数' },
      { field: 'stats.failed', type: 'number', description: '失败数' },
      { field: 'stats.organizations', type: 'object', description: '机构同步统计' },
      { field: 'stats.departments', type: 'object', description: '部门同步统计' },
      { field: 'stats.persons', type: 'object', description: '人员同步统计' },
    ],
    notes: '使用蓝凌标准同步接口：/api/sys-organization/sysSynchroGetOrg/getUpdatedElements',
  },
  {
    category: '组织架构同步',
    path: '/api/org-sync',
    method: 'POST',
    description: '触发组织架构同步（新版接口）',
    params: [
      { name: 'syncType', type: 'string', required: true, description: '同步类型：full / incremental' },
      { name: 'operatorId', type: 'string', required: false, description: '操作人ID' },
      { name: 'operatorName', type: 'string', required: false, description: '操作人姓名' },
      { name: 'returnOrgType', type: 'array', required: false, description: '返回的组织类型' },
      { name: 'orgIds', type: 'array', required: false, description: '指定同步的机构ID列表' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'object', description: '同步结果详情' },
    ],
  },
  {
    category: '组织架构同步',
    path: '/api/org-sync',
    method: 'GET',
    description: '获取同步状态',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型，固定值：status' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.isRunning', type: 'boolean', description: '是否有正在运行的同步' },
      { field: 'data.lastSync', type: 'object', description: '最后一次同步的信息' },
    ],
  },

  // ==========================================
  // 五、管理后台EKP配置 (/api/admin/ekp-configs)
  // ==========================================
  {
    category: '管理后台-EKP',
    path: '/api/admin/ekp-configs',
    method: 'GET',
    description: '获取EKP配置',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.baseUrl', type: 'string', description: 'EKP地址' },
      { field: 'data.username', type: 'string', description: '认证用户名' },
      { field: 'data.password', type: 'string', description: '认证密码（加密存储）' },
      { field: 'data.apiPath', type: 'string', description: 'API路径' },
    ],
  },
  {
    category: '管理后台-EKP',
    path: '/api/admin/ekp-configs',
    method: 'POST',
    description: '保存或更新EKP配置',
    params: [
      { name: 'baseUrl', type: 'string', required: true, description: 'EKP系统地址' },
      { name: 'username', type: 'string', required: true, description: '认证用户名' },
      { name: 'password', type: 'string', required: true, description: '认证密码' },
      { name: 'apiPath', type: 'string', required: false, description: 'API路径' },
      { name: 'serviceId', type: 'string', required: false, description: '服务标识' },
      { name: 'leaveTemplateId', type: 'string', required: false, description: '请假模板ID' },
      { name: 'expenseTemplateId', type: 'string', required: false, description: '报销模板ID' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'object', description: '保存的配置信息' },
    ],
  },

  // ==========================================
  // 六、EKP接口管理 (/api/admin/ekp-interfaces)
  // ==========================================
  {
    category: '管理后台-接口管理',
    path: '/api/admin/ekp-interfaces',
    method: 'GET',
    description: '获取EKP接口列表',
    params: [
      { name: 'type', type: 'string', required: false, description: '接口类型：official / custom / all' },
      { name: 'category', type: 'string', required: false, description: '接口分类：workflow/document/organization/system' },
      { name: 'keyword', type: 'string', required: false, description: '搜索关键词' },
      { name: 'enabled', type: 'string', required: false, description: '启用状态：true / false' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '接口列表' },
      { field: 'data[].code', type: 'string', description: '接口代码' },
      { field: 'data[].name', type: 'string', description: '接口名称' },
      { field: 'data[].endpoint', type: 'string', description: 'API路径' },
      { field: 'data[].method', type: 'string', description: 'HTTP方法' },
      { field: 'stats', type: 'object', description: '统计信息' },
    ],
  },
  {
    category: '管理后台-接口管理',
    path: '/api/admin/ekp-interfaces',
    method: 'POST',
    description: '创建EKP接口',
    params: [
      { name: 'source', type: 'string', required: true, description: '接口来源：official / custom' },
      { name: 'code', type: 'string', required: true, description: '接口代码（唯一标识）' },
      { name: 'name', type: 'string', required: true, description: '接口名称' },
      { name: 'category', type: 'string', required: true, description: '接口分类' },
      { name: 'path', type: 'string', required: true, description: 'API路径' },
      { name: 'method', type: 'string', required: true, description: 'HTTP方法：GET/POST/PUT/DELETE' },
      { name: 'description', type: 'string', required: false, description: '接口描述' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.id', type: 'string', description: '创建的接口ID' },
    ],
  },
  {
    category: '管理后台-接口管理',
    path: '/api/admin/ekp-interfaces/[id]',
    method: 'PUT',
    description: '更新EKP接口',
    params: [
      { name: 'id', type: 'string', required: true, description: '接口ID（路径参数）' },
      { name: 'name', type: 'string', required: false, description: '接口名称' },
      { name: 'enabled', type: 'boolean', required: false, description: '是否启用' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
    ],
  },
  {
    category: '管理后台-接口管理',
    path: '/api/admin/ekp-interfaces/[id]',
    method: 'DELETE',
    description: '删除EKP接口',
    params: [
      { name: 'id', type: 'string', required: true, description: '接口ID（路径参数）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
    ],
  },
  {
    category: '管理后台-接口管理',
    path: '/api/admin/ekp-interfaces/test',
    method: 'POST',
    description: '测试EKP接口',
    params: [
      { name: 'code', type: 'string', required: true, description: '接口代码' },
      { name: 'params', type: 'object', required: false, description: '接口参数' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'any', description: '接口返回数据' },
    ],
  },
  {
    category: '管理后台-接口管理',
    path: '/api/admin/ekp-interfaces/reload',
    method: 'POST',
    description: '重载EKP接口配置',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'message', type: 'string', description: '重载结果' },
    ],
  },

  // ==========================================
  // 七、聊天与会话模块 (/api/chat)
  // ==========================================
  {
    category: '聊天模块',
    path: '/api/chat',
    method: 'POST',
    description: '统一聊天接口（调用RootAgent处理）',
    params: [
      { name: 'message', type: 'string', required: true, description: '用户消息' },
      { name: 'userId', type: 'string', required: true, description: '用户ID' },
      { name: 'deptId', type: 'string', required: false, description: '部门ID' },
      { name: 'role', type: 'string', required: false, description: '用户角色' },
      { name: 'conversationHistory', type: 'array', required: false, description: '对话历史' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.message', type: 'string', description: 'AI回复消息' },
    ],
  },
  {
    category: '聊天模块',
    path: '/api/chat/sessions',
    method: 'GET',
    description: '获取会话列表',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '会话列表' },
      { field: 'data[].id', type: 'string', description: '会话ID' },
      { field: 'data[].title', type: 'string', description: '会话标题' },
      { field: 'data[].created_at', type: 'string', description: '创建时间' },
    ],
    notes: '需要X-User-ID请求头',
  },
  {
    category: '聊天模块',
    path: '/api/chat/sessions',
    method: 'POST',
    description: '创建新会话',
    params: [
      { name: 'title', type: 'string', required: true, description: '会话标题' },
      { name: 'agentId', type: 'string', required: false, description: 'Agent ID' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'object', description: '创建的会话信息' },
    ],
    notes: '需要X-User-ID请求头',
  },
  {
    category: '聊天模块',
    path: '/api/chat/sessions/[id]',
    method: 'GET',
    description: '获取会话详情',
    params: [
      { name: 'id', type: 'string', required: true, description: '会话ID（路径参数）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'object', description: '会话详情' },
    ],
    notes: '需要X-User-ID请求头',
  },
  {
    category: '聊天模块',
    path: '/api/chat/sessions/[id]/messages',
    method: 'GET',
    description: '获取会话消息列表',
    params: [
      { name: 'id', type: 'string', required: true, description: '会话ID（路径参数）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '消息列表' },
    ],
    notes: '需要X-User-ID请求头',
  },

  // ==========================================
  // 八、技能模块 (/api/custom-skill, /api/skills)
  // ==========================================
  {
    category: '技能模块',
    path: '/api/custom-skill',
    method: 'GET',
    description: '获取预置技能模板',
    params: [
      { name: 'type', type: 'string', required: false, description: '类型，固定值：templates' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '模板列表' },
    ],
  },
  {
    category: '技能模块',
    path: '/api/custom-skill',
    method: 'POST',
    description: '执行或测试自定义技能',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：execute / test' },
      { name: 'skill', type: 'object', required: true, description: '技能配置对象' },
      { name: 'params', type: 'object', required: false, description: '执行参数' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'message', type: 'string', description: '结果消息' },
      { field: 'data', type: 'any', description: '执行结果' },
    ],
  },
  {
    category: '技能模块',
    path: '/api/skills',
    method: 'GET',
    description: '获取所有技能（普通用户）',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '技能列表' },
    ],
  },
  {
    category: '管理后台-技能',
    path: '/api/admin/skills',
    method: 'GET',
    description: '获取所有技能（管理员）',
    params: [
      { name: 'action', type: 'string', required: false, description: '操作类型：list / detail / category' },
      { name: 'code', type: 'string', required: false, description: '技能代码（detail时使用）' },
      { name: 'category', type: 'string', required: false, description: '技能分类（category时使用）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array/object', description: '技能数据' },
    ],
  },
  {
    category: '管理后台-技能',
    path: '/api/admin/skills',
    method: 'POST',
    description: '创建或更新技能',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：create / update / delete' },
      { name: 'code', type: 'string', required: true, description: '技能代码' },
      { name: 'name', type: 'string', required: true, description: '技能名称' },
      { name: 'category', type: 'string', required: true, description: '技能分类' },
      { name: 'apiConfig', type: 'object', required: false, description: 'API配置' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.id', type: 'string', description: '技能ID' },
    ],
  },

  // ==========================================
  // 九、定时任务模块 (/api/scheduler)
  // ==========================================
  {
    category: '定时任务',
    path: '/api/scheduler/tasks',
    method: 'GET',
    description: '获取定时任务列表或单个任务',
    params: [
      { name: 'id', type: 'string', required: false, description: '任务ID（获取单个任务时使用）' },
      { name: 'type', type: 'string', required: false, description: '任务类型：ekp_sync / data_backup / cache_clean / health_check / alert / report / custom' },
      { name: 'group', type: 'string', required: false, description: '任务分组：ekp / oneapi / system' },
      { name: 'enabled', type: 'string', required: false, description: '启用状态：true / false' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '任务列表' },
      { field: 'data[].id', type: 'string', description: '任务ID' },
      { field: 'data[].name', type: 'string', description: '任务名称' },
      { field: 'data[].cronExpression', type: 'string', description: 'Cron表达式' },
      { field: 'data[].enabled', type: 'boolean', description: '是否启用' },
    ],
  },
  {
    category: '定时任务',
    path: '/api/scheduler/tasks',
    method: 'POST',
    description: '创建任务或手动触发任务',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：create / trigger / update / delete' },
      { name: 'taskId', type: 'string', required: false, description: '任务ID（trigger/update/delete时使用）' },
      { name: 'parameters', type: 'object', required: false, description: '执行参数（trigger时使用）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.executionId', type: 'string', description: '执行ID（trigger操作时返回）' },
    ],
  },
  {
    category: '定时任务',
    path: '/api/scheduler/status',
    method: 'GET',
    description: '获取调度器状态',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.running', type: 'number', description: '运行中的任务数' },
      { field: 'data.total', type: 'number', description: '总任务数' },
      { field: 'data.enabled', type: 'number', description: '启用的任务数' },
    ],
  },
  {
    category: '定时任务',
    path: '/api/scheduler/executions',
    method: 'GET',
    description: '获取任务执行记录',
    params: [
      { name: 'taskId', type: 'string', required: false, description: '任务ID' },
      { name: 'status', type: 'string', required: false, description: '执行状态：pending / running / success / failed' },
      { name: 'limit', type: 'number', required: false, description: '返回数量（默认20）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '执行记录列表' },
    ],
  },

  // ==========================================
  // 十、监控告警模块 (/api/monitor)
  // ==========================================
  {
    category: '监控告警',
    path: '/api/monitor/rules',
    method: 'GET',
    description: '获取告警规则列表',
    params: [
      { name: 'id', type: 'string', required: false, description: '规则ID（获取单个规则时使用）' },
      { name: 'type', type: 'string', required: false, description: '告警类型：health / task_failure / sync_delay / custom' },
      { name: 'level', type: 'string', required: false, description: '告警级别：info / warning / error / critical' },
      { name: 'enabled', type: 'string', required: false, description: '启用状态：true / false' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '告警规则列表' },
    ],
  },
  {
    category: '监控告警',
    path: '/api/monitor/rules',
    method: 'POST',
    description: '创建或更新告警规则',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：create / update / delete' },
      { name: 'name', type: 'string', required: true, description: '规则名称' },
      { name: 'type', type: 'string', required: true, description: '告警类型' },
      { name: 'level', type: 'string', required: true, description: '告警级别' },
      { name: 'conditions', type: 'array', required: false, description: '触发条件' },
      { name: 'notificationConfig', type: 'object', required: false, description: '通知配置' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.id', type: 'string', description: '规则ID' },
    ],
  },
  {
    category: '监控告警',
    path: '/api/monitor/alerts',
    method: 'GET',
    description: '获取告警记录',
    params: [
      { name: 'status', type: 'string', required: false, description: '告警状态：active / resolved / acknowledged' },
      { name: 'level', type: 'string', required: false, description: '告警级别' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '告警记录列表' },
    ],
  },

  // ==========================================
  // 十一、数据库模块 (/api/database)
  // ==========================================
  {
    category: '数据库',
    path: '/api/database',
    method: 'POST',
    description: '数据库操作（初始化、测试、连接）',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：init / test / connect / disconnect' },
      { name: 'host', type: 'string', required: false, description: '数据库主机' },
      { name: 'port', type: 'number', required: false, description: '数据库端口' },
      { name: 'databaseName', type: 'string', required: false, description: '数据库名称' },
      { name: 'username', type: 'string', required: false, description: '用户名' },
      { name: 'password', type: 'string', required: false, description: '密码' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'message', type: 'string', description: '操作结果消息' },
    ],
  },
  {
    category: '数据库',
    path: '/api/database',
    method: 'GET',
    description: '获取数据库配置列表',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '配置列表' },
    ],
  },
  {
    category: '数据库',
    path: '/api/database/migrate',
    method: 'POST',
    description: '执行数据库迁移',
    params: [
      { name: 'sql', type: 'string', required: true, description: 'SQL迁移脚本' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'successCount', type: 'number', description: '成功执行的SQL数量' },
      { field: 'failedCount', type: 'number', description: '失败的SQL数量' },
      { field: 'failedStatements', type: 'array', description: '失败的SQL语句' },
    ],
  },
  {
    category: '数据库',
    path: '/api/database/migrate/role',
    method: 'GET',
    description: '获取角色表迁移状态',
    params: [],
    returns: [
      { field: 'roleTableExists', type: 'boolean', description: '角色表是否存在' },
      { field: 'isEnumType', type: 'boolean', description: 'fd_role是否为ENUM类型' },
      { field: 'needMigration', type: 'boolean', description: '是否需要迁移' },
    ],
  },
  {
    category: '数据库',
    path: '/api/database/migrate/role',
    method: 'POST',
    description: '执行角色表迁移',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'message', type: 'string', description: '迁移结果' },
    ],
  },

  // ==========================================
  // 十二、系统模块 (/api/system)
  // ==========================================
  {
    category: '系统',
    path: '/api/system/status',
    method: 'GET',
    description: '获取系统状态（数据库连接、初始化状态）',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'initialized', type: 'boolean', description: '系统是否已初始化' },
      { field: 'databaseConnected', type: 'boolean', description: '数据库是否已连接' },
      { field: 'adminCount', type: 'number', description: '管理员数量' },
    ],
  },
  {
    category: '系统',
    path: '/api/system/init',
    method: 'GET',
    description: '检查系统是否已初始化',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'initialized', type: 'boolean', description: '是否已初始化' },
      { field: 'databaseConnected', type: 'boolean', description: '数据库是否连接' },
      { field: 'adminCount', type: 'number', description: '管理员账号数量' },
    ],
  },
  {
    category: '系统',
    path: '/api/system/init',
    method: 'POST',
    description: '初始化系统（创建默认账号）',
    params: [
      { name: 'adminUsername', type: 'string', required: false, description: '管理员用户名（默认admin）' },
      { name: 'adminPassword', type: 'string', required: false, description: '管理员密码（默认admin123）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'message', type: 'string', description: '初始化结果' },
    ],
  },

  // ==========================================
  // 十三、OneAPI集成 (/api/admin/oneapi, /api/integration/oneapi)
  // ==========================================
  {
    category: '管理后台-OneAPI',
    path: '/api/admin/oneapi',
    method: 'GET',
    description: '获取OneAPI配置列表',
    params: [
      { name: 'action', type: 'string', required: false, description: '操作类型：channels' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '配置列表（API Key已脱敏）' },
    ],
  },
  {
    category: '管理后台-OneAPI',
    path: '/api/admin/oneapi',
    method: 'POST',
    description: '创建或更新OneAPI配置',
    params: [
      { name: 'id', type: 'string', required: false, description: '配置ID（更新时使用）' },
      { name: 'name', type: 'string', required: true, description: '配置名称' },
      { name: 'baseUrl', type: 'string', required: true, description: 'OneAPI地址' },
      { name: 'apiKey', type: 'string', required: true, description: 'API Key' },
      { name: 'isActive', type: 'boolean', required: false, description: '是否启用' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.id', type: 'string', description: '配置ID' },
    ],
  },
  {
    category: 'OneAPI集成',
    path: '/api/integration/oneapi',
    method: 'GET',
    description: '获取OneAPI配置列表（旧版）',
    params: [
      { name: 'action', type: 'string', required: false, description: '操作类型：list' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'configured', type: 'boolean', description: '是否已配置' },
      { field: 'data', type: 'array', description: '配置列表' },
    ],
  },
  {
    category: 'OneAPI集成',
    path: '/api/integration/oneapi',
    method: 'POST',
    description: '创建或更新OneAPI配置（旧版）',
    params: [
      { name: 'name', type: 'string', required: true, description: '配置名称' },
      { name: 'baseUrl', type: 'string', required: true, description: 'OneAPI地址' },
      { name: 'apiKey', type: 'string', required: true, description: 'API Key' },
      { name: 'model', type: 'string', required: false, description: '模型名称' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
    ],
  },
  {
    category: 'OneAPI集成',
    path: '/api/integration/oneapi/test',
    method: 'POST',
    description: '测试OneAPI连接',
    params: [
      { name: 'baseUrl', type: 'string', required: true, description: 'OneAPI地址' },
      { name: 'apiKey', type: 'string', required: true, description: 'API Key' },
      { name: 'model', type: 'string', required: true, description: '模型名称' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'message', type: 'string', description: '测试结果' },
    ],
  },

  // ==========================================
  // 十四、API Keys管理 (/api/admin/api-keys)
  // ==========================================
  {
    category: '管理后台-API Keys',
    path: '/api/admin/api-keys',
    method: 'GET',
    description: '获取API Keys列表',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: 'API Keys列表' },
    ],
  },
  {
    category: '管理后台-API Keys',
    path: '/api/admin/api-keys',
    method: 'POST',
    description: '创建新的API Key',
    params: [
      { name: 'name', type: 'string', required: true, description: '配置名称' },
      { name: 'apiKey', type: 'string', required: true, description: 'API Key' },
      { name: 'provider', type: 'string', required: true, description: '提供商：openai / anthropic / azure' },
      { name: 'baseUrl', type: 'string', required: false, description: 'Base URL' },
      { name: 'isActive', type: 'boolean', required: false, description: '是否启用' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'object', description: '创建的API Key信息' },
    ],
  },
  {
    category: '管理后台-API Keys',
    path: '/api/admin/api-keys/[id]',
    method: 'PUT',
    description: '更新API Key',
    params: [
      { name: 'id', type: 'string', required: true, description: 'API Key ID（路径参数）' },
      { name: 'name', type: 'string', required: false, description: '配置名称' },
      { name: 'isActive', type: 'boolean', required: false, description: '是否启用' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
    ],
  },
  {
    category: '管理后台-API Keys',
    path: '/api/admin/api-keys/[id]',
    method: 'DELETE',
    description: '删除API Key',
    params: [
      { name: 'id', type: 'string', required: true, description: 'API Key ID（路径参数）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
    ],
  },

  // ==========================================
  // 十五、Agent管理 (/api/admin/agents)
  // ==========================================
  {
    category: '管理后台-Agent',
    path: '/api/admin/agents',
    method: 'GET',
    description: '获取Agent列表或详情',
    params: [
      { name: 'action', type: 'string', required: false, description: '操作类型：list / detail' },
      { name: 'type', type: 'string', required: false, description: 'Agent类型（detail时使用）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array/object', description: 'Agent数据' },
    ],
  },
  {
    category: '管理后台-Agent',
    path: '/api/admin/agents',
    method: 'POST',
    description: '更新Agent配置',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：update' },
      { name: 'type', type: 'string', required: true, description: 'Agent类型' },
      { name: 'name', type: 'string', required: false, description: 'Agent名称' },
      { name: 'description', type: 'string', required: false, description: 'Agent描述' },
      { name: 'systemPrompt', type: 'string', required: false, description: '系统提示词' },
      { name: 'skills', type: 'array', required: false, description: '关联的技能列表' },
      { name: 'permissionRules', type: 'object', required: false, description: '权限规则' },
      { name: 'businessRules', type: 'object', required: false, description: '业务规则' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
    ],
  },

  // ==========================================
  // 十六、用户绑定 (/api/user-bindings)
  // ==========================================
  {
    category: '用户绑定',
    path: '/api/user-bindings',
    method: 'GET',
    description: '获取用户绑定配置列表',
    params: [
      { name: 'type', type: 'string', required: false, description: '类型：bindings / roles / all（默认all）' },
      { name: 'active', type: 'string', required: false, description: '启用状态：true / false' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'bindings', type: 'array', description: '用户绑定列表' },
      { field: 'roleMappings', type: 'array', description: '角色映射列表' },
    ],
  },
  {
    category: '用户绑定',
    path: '/api/user-bindings',
    method: 'POST',
    description: '创建或更新用户绑定',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：create_binding / update_binding / delete_binding / create_mapping / delete_mapping' },
      { name: 'binding', type: 'object', required: false, description: '绑定数据' },
      { name: 'mapping', type: 'object', required: false, description: '映射数据' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
    ],
  },
  {
    category: '用户绑定',
    path: '/api/user-bindings/lookup',
    method: 'GET',
    description: '根据EKP用户信息查找绑定用户',
    params: [
      { name: 'ekpUserId', type: 'string', required: false, description: 'EKP用户ID' },
      { name: 'ekpLoginName', type: 'string', required: false, description: 'EKP登录名' },
      { name: 'ekpRoleId', type: 'string', required: false, description: 'EKP角色ID' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'localUserId', type: 'string', description: '绑定的本地用户ID' },
      { field: 'bound', type: 'boolean', description: '是否已绑定' },
    ],
  },

  // ==========================================
  // 十七、审批模块 (/api/approval)
  // ==========================================
  {
    category: '审批模块',
    path: '/api/approval/launch',
    method: 'POST',
    description: '发起EKP审批',
    params: [
      { name: 'formData', type: 'object', required: true, description: '表单数据 {templateId, subject, deptId}' },
      { name: 'flowNodes', type: 'array', required: true, description: '审批流程节点ID列表' },
      { name: 'userId', type: 'string', required: true, description: '申请人ID' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.requestId', type: 'string', description: '审批请求ID' },
      { field: 'data.status', type: 'string', description: '审批状态' },
    ],
  },

  // ==========================================
  // 十八、会议模块 (/api/meeting)
  // ==========================================
  {
    category: '会议模块',
    path: '/api/meeting/create',
    method: 'POST',
    description: '创建会议',
    params: [
      { name: 'title', type: 'string', required: true, description: '会议标题' },
      { name: 'startTime', type: 'string', required: true, description: '开始时间（ISO格式）' },
      { name: 'endTime', type: 'string', required: true, description: '结束时间（ISO格式）' },
      { name: 'location', type: 'string', required: true, description: '会议地点' },
      { name: 'participants', type: 'array', required: true, description: '参会人员ID列表' },
      { name: 'description', type: 'string', required: false, description: '会议描述' },
      { name: 'reminder', type: 'boolean', required: false, description: '是否发送提醒' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.meetingId', type: 'string', description: '创建的会议ID' },
    ],
  },

  // ==========================================
  // 十九、配置模块 (/api/config)
  // ==========================================
  {
    category: '配置模块',
    path: '/api/config/llm',
    method: 'GET',
    description: '获取LLM配置（全局配置）',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'config', type: 'object', description: 'LLM配置' },
      { field: 'source', type: 'string', description: '配置来源：global / personal / none' },
    ],
  },
  {
    category: '配置模块',
    path: '/api/config/ekp',
    method: 'GET',
    description: '获取EKP配置（全局配置）',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'config', type: 'object', description: 'EKP配置' },
      { field: 'source', type: 'string', description: '配置来源：global / personal / none' },
    ],
  },

  // ==========================================
  // 二十、同步配置模块 (/api/admin/sync-scheduler)
  // ==========================================
  {
    category: '管理后台-同步配置',
    path: '/api/admin/sync-scheduler/config',
    method: 'GET',
    description: '获取定时同步配置',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.incremental', type: 'object', description: '增量同步配置' },
      { field: 'data.full', type: 'object', description: '全量同步配置' },
      { field: 'data.monitor', type: 'object', description: '监控配置' },
    ],
  },
  {
    category: '管理后台-同步配置',
    path: '/api/admin/sync-scheduler/config',
    method: 'PUT',
    description: '更新定时同步配置',
    params: [
      { name: 'taskType', type: 'string', required: true, description: '任务类型：incremental / full / monitor' },
      { name: 'config', type: 'object', required: true, description: '配置数据 {enabled, interval, startTime}' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
    ],
  },
];

// 导出文档
export default API_DOCS;
