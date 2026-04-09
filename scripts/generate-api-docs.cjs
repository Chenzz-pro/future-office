/**
 * 生成接口文档 Excel 文件
 */

const XLSX = require('xlsx');

// ============================================
// 接口文档数据
// ============================================

const API_DOCS = [
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
  // 二、组织架构模块
  // ==========================================
  {
    category: '组织架构',
    path: '/api/organization',
    method: 'GET',
    description: '获取组织架构数据（树形列表）',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：tree/list' },
      { name: 'type', type: 'number', required: false, description: '组织类型：1机构/2部门/3岗位' },
      { name: 'parentId', type: 'string', required: false, description: '父级ID（list操作时使用）' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '组织架构数据数组' },
      { field: 'data[].fd_id', type: 'string', description: '组织ID' },
      { field: 'data[].fd_name', type: 'string', description: '组织名称' },
      { field: 'data[].fd_org_type', type: 'number', description: '组织类型：1机构 2部门 3岗位' },
    ],
  },
  {
    category: '组织架构',
    path: '/api/organization',
    method: 'POST',
    description: '组织架构CRUD操作',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：create/update/delete' },
      { name: 'type', type: 'string', required: true, description: '类型：organization/department/position/person' },
      { name: 'data', type: 'object', required: false, description: '创建/更新的数据' },
      { name: 'id', type: 'string', required: false, description: '记录ID' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.id', type: 'string', description: '创建的记录ID' },
      { field: 'generatedPassword', type: 'string', description: '自动生成的登录密码' },
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
    ],
  },
  {
    category: '组织架构',
    path: '/api/organization/role',
    method: 'POST',
    description: '角色CRUD操作',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：create/update/delete' },
      { name: 'data', type: 'object', required: false, description: '角色数据' },
      { name: 'id', type: 'string', required: false, description: '角色ID' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.id', type: 'string', description: '角色ID' },
    ],
  },

  // ==========================================
  // 三、组织架构同步模块
  // ==========================================
  {
    category: '组织架构同步',
    path: '/api/organization/sync',
    method: 'POST',
    description: '从EKP同步组织架构数据（使用getUpdatedElements接口）',
    params: [
      { name: 'source', type: 'string', required: true, description: '同步来源，固定值：ekp' },
      { name: 'type', type: 'string', required: false, description: '同步类型：full/incremental' },
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
      { name: 'syncType', type: 'string', required: true, description: '同步类型：full/incremental' },
      { name: 'operatorId', type: 'string', required: false, description: '操作人ID' },
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
  // 四、EKP集成模块
  // ==========================================
  {
    category: 'EKP集成',
    path: '/api/ekp',
    method: 'POST',
    description: 'EKP REST API统一代理接口',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：test/getTodoCount/addReview/approveReview' },
      { name: 'baseUrl', type: 'string', required: true, description: 'EKP系统地址' },
      { name: 'username', type: 'string', required: true, description: '认证用户名' },
      { name: 'password', type: 'string', required: true, description: '认证密码' },
      { name: 'loginName', type: 'string', required: false, description: '待办查询的用户登录名' },
      { name: 'todoType', type: 'number', required: false, description: '待办类型：-1已办/0所有/1审批/2通知/3暂挂' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'message', type: 'string', description: '结果消息' },
      { field: 'todoCount', type: 'string', description: '待办数量' },
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
    ],
  },

  // ==========================================
  // 五、管理后台EKP配置
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
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'object', description: '保存的配置信息' },
    ],
  },

  // ==========================================
  // 六、EKP接口管理
  // ==========================================
  {
    category: '管理后台-接口管理',
    path: '/api/admin/ekp-interfaces',
    method: 'GET',
    description: '获取EKP接口列表',
    params: [
      { name: 'type', type: 'string', required: false, description: '接口类型：official/custom/all' },
      { name: 'category', type: 'string', required: false, description: '接口分类' },
      { name: 'keyword', type: 'string', required: false, description: '搜索关键词' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '接口列表' },
      { field: 'data[].code', type: 'string', description: '接口代码' },
      { field: 'data[].name', type: 'string', description: '接口名称' },
      { field: 'data[].endpoint', type: 'string', description: 'API路径' },
    ],
  },
  {
    category: '管理后台-接口管理',
    path: '/api/admin/ekp-interfaces',
    method: 'POST',
    description: '创建EKP接口',
    params: [
      { name: 'source', type: 'string', required: true, description: '接口来源：official/custom' },
      { name: 'code', type: 'string', required: true, description: '接口代码' },
      { name: 'name', type: 'string', required: true, description: '接口名称' },
      { name: 'category', type: 'string', required: true, description: '接口分类' },
      { name: 'path', type: 'string', required: true, description: 'API路径' },
      { name: 'method', type: 'string', required: true, description: 'HTTP方法' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.id', type: 'string', description: '接口ID' },
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

  // ==========================================
  // 七、聊天与会话模块
  // ==========================================
  {
    category: '聊天模块',
    path: '/api/chat',
    method: 'POST',
    description: '统一聊天接口（调用RootAgent处理）',
    params: [
      { name: 'message', type: 'string', required: true, description: '用户消息' },
      { name: 'userId', type: 'string', required: true, description: '用户ID' },
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

  // ==========================================
  // 八、技能模块
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
      { name: 'action', type: 'string', required: true, description: '操作类型：execute/test' },
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
      { name: 'action', type: 'string', required: false, description: '操作类型：list/detail/category' },
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
      { name: 'action', type: 'string', required: true, description: '操作类型：create/update/delete' },
      { name: 'code', type: 'string', required: true, description: '技能代码' },
      { name: 'name', type: 'string', required: true, description: '技能名称' },
      { name: 'category', type: 'string', required: true, description: '技能分类' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.id', type: 'string', description: '技能ID' },
    ],
  },

  // ==========================================
  // 九、定时任务模块
  // ==========================================
  {
    category: '定时任务',
    path: '/api/scheduler/tasks',
    method: 'GET',
    description: '获取定时任务列表或单个任务',
    params: [
      { name: 'id', type: 'string', required: false, description: '任务ID' },
      { name: 'type', type: 'string', required: false, description: '任务类型' },
      { name: 'enabled', type: 'string', required: false, description: '启用状态：true/false' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '任务列表' },
      { field: 'data[].name', type: 'string', description: '任务名称' },
      { field: 'data[].cronExpression', type: 'string', description: 'Cron表达式' },
    ],
  },
  {
    category: '定时任务',
    path: '/api/scheduler/tasks',
    method: 'POST',
    description: '创建任务或手动触发任务',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：create/trigger/update/delete' },
      { name: 'taskId', type: 'string', required: false, description: '任务ID' },
      { name: 'parameters', type: 'object', required: false, description: '执行参数' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.executionId', type: 'string', description: '执行ID' },
    ],
  },

  // ==========================================
  // 十、监控告警模块
  // ==========================================
  {
    category: '监控告警',
    path: '/api/monitor/rules',
    method: 'GET',
    description: '获取告警规则列表',
    params: [
      { name: 'id', type: 'string', required: false, description: '规则ID' },
      { name: 'type', type: 'string', required: false, description: '告警类型' },
      { name: 'level', type: 'string', required: false, description: '告警级别' },
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
      { name: 'action', type: 'string', required: true, description: '操作类型：create/update/delete' },
      { name: 'name', type: 'string', required: true, description: '规则名称' },
      { name: 'type', type: 'string', required: true, description: '告警类型' },
      { name: 'level', type: 'string', required: true, description: '告警级别' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.id', type: 'string', description: '规则ID' },
    ],
  },

  // ==========================================
  // 十一、数据库模块
  // ==========================================
  {
    category: '数据库',
    path: '/api/database',
    method: 'POST',
    description: '数据库操作（初始化、测试、连接）',
    params: [
      { name: 'action', type: 'string', required: true, description: '操作类型：init/test/connect' },
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
    path: '/api/database/migrate',
    method: 'POST',
    description: '执行数据库迁移',
    params: [
      { name: 'sql', type: 'string', required: true, description: 'SQL迁移脚本' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'successCount', type: 'number', description: '成功数量' },
      { field: 'failedCount', type: 'number', description: '失败数量' },
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
      { field: 'needMigration', type: 'boolean', description: '是否需要迁移' },
    ],
  },

  // ==========================================
  // 十二、系统模块
  // ==========================================
  {
    category: '系统',
    path: '/api/system/status',
    method: 'GET',
    description: '获取系统状态',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'initialized', type: 'boolean', description: '系统是否已初始化' },
      { field: 'databaseConnected', type: 'boolean', description: '数据库是否已连接' },
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
      { field: 'adminCount', type: 'number', description: '管理员账号数量' },
    ],
  },
  {
    category: '系统',
    path: '/api/system/init',
    method: 'POST',
    description: '初始化系统（创建默认账号）',
    params: [
      { name: 'adminUsername', type: 'string', required: false, description: '管理员用户名' },
      { name: 'adminPassword', type: 'string', required: false, description: '管理员密码' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'message', type: 'string', description: '初始化结果' },
    ],
  },

  // ==========================================
  // 十三、OneAPI集成
  // ==========================================
  {
    category: 'OneAPI集成',
    path: '/api/admin/oneapi',
    method: 'GET',
    description: '获取OneAPI配置列表',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'array', description: '配置列表' },
    ],
  },
  {
    category: 'OneAPI集成',
    path: '/api/admin/oneapi',
    method: 'POST',
    description: '创建或更新OneAPI配置',
    params: [
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
  // 十四、API Keys管理
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
      { name: 'provider', type: 'string', required: true, description: '提供商' },
      { name: 'isActive', type: 'boolean', required: false, description: '是否启用' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data', type: 'object', description: '创建的API Key信息' },
    ],
  },

  // ==========================================
  // 十五、Agent管理
  // ==========================================
  {
    category: '管理后台-Agent',
    path: '/api/admin/agents',
    method: 'GET',
    description: '获取Agent列表或详情',
    params: [
      { name: 'action', type: 'string', required: false, description: '操作类型：list/detail' },
      { name: 'type', type: 'string', required: false, description: 'Agent类型' },
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
      { name: 'systemPrompt', type: 'string', required: false, description: '系统提示词' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
    ],
  },

  // ==========================================
  // 十六、用户绑定
  // ==========================================
  {
    category: '用户绑定',
    path: '/api/user-bindings',
    method: 'GET',
    description: '获取用户绑定配置列表',
    params: [
      { name: 'type', type: 'string', required: false, description: '类型：bindings/roles/all' },
      { name: 'active', type: 'string', required: false, description: '启用状态：true/false' },
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
      { name: 'action', type: 'string', required: true, description: '操作类型' },
      { name: 'binding', type: 'object', required: false, description: '绑定数据' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
    ],
  },

  // ==========================================
  // 十七、审批模块
  // ==========================================
  {
    category: '审批模块',
    path: '/api/approval/launch',
    method: 'POST',
    description: '发起EKP审批',
    params: [
      { name: 'formData', type: 'object', required: true, description: '表单数据' },
      { name: 'flowNodes', type: 'array', required: true, description: '审批流程节点ID列表' },
      { name: 'userId', type: 'string', required: true, description: '申请人ID' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.requestId', type: 'string', description: '审批请求ID' },
    ],
  },

  // ==========================================
  // 十八、会议模块
  // ==========================================
  {
    category: '会议模块',
    path: '/api/meeting/create',
    method: 'POST',
    description: '创建会议',
    params: [
      { name: 'title', type: 'string', required: true, description: '会议标题' },
      { name: 'startTime', type: 'string', required: true, description: '开始时间' },
      { name: 'endTime', type: 'string', required: true, description: '结束时间' },
      { name: 'location', type: 'string', required: true, description: '会议地点' },
      { name: 'participants', type: 'array', required: true, description: '参会人员ID列表' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'data.meetingId', type: 'string', description: '会议ID' },
    ],
  },

  // ==========================================
  // 十九、配置模块
  // ==========================================
  {
    category: '配置模块',
    path: '/api/config/llm',
    method: 'GET',
    description: '获取LLM配置',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'config', type: 'object', description: 'LLM配置' },
      { field: 'source', type: 'string', description: '配置来源' },
    ],
  },
  {
    category: '配置模块',
    path: '/api/config/ekp',
    method: 'GET',
    description: '获取EKP配置',
    params: [],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
      { field: 'config', type: 'object', description: 'EKP配置' },
      { field: 'source', type: 'string', description: '配置来源' },
    ],
  },

  // ==========================================
  // 二十、同步配置
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
    ],
  },
  {
    category: '管理后台-同步配置',
    path: '/api/admin/sync-scheduler/config',
    method: 'PUT',
    description: '更新定时同步配置',
    params: [
      { name: 'taskType', type: 'string', required: true, description: '任务类型' },
      { name: 'config', type: 'object', required: true, description: '配置数据' },
    ],
    returns: [
      { field: 'success', type: 'boolean', description: '是否成功' },
    ],
  },
];

function generateExcel() {
  const workbook = XLSX.utils.book_new();

  // ========== 工作表1: 接口总览 ==========
  const overviewData = [
    ['序号', '模块', '路径', '方法', '功能说明', '备注'],
  ];

  API_DOCS.forEach((api, index) => {
    overviewData.push([
      String(index + 1),
      api.category,
      api.path,
      api.method,
      api.description,
      api.notes || '',
    ]);
  });

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 40 },
    { wch: 8 },
    { wch: 50 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(workbook, overviewSheet, '接口总览');

  // ========== 工作表2: 详细接口文档 ==========
  const detailData = [
    ['序号', '模块', '路径', '方法', '功能说明', '参数名称', '参数类型', '是否必填', '参数说明', '返回字段', '字段类型', '字段说明', '备注'],
  ];

  let detailIndex = 0;
  API_DOCS.forEach((api) => {
    const maxParams = Math.max(api.params.length, 1);
    const maxReturns = Math.max(api.returns.length, 1);

    for (let i = 0; i < Math.max(maxParams, maxReturns); i++) {
      detailIndex++;
      const param = api.params[i] || { name: '', type: '', required: false, description: '' };
      const ret = api.returns[i] || { field: '', type: '', description: '' };

      detailData.push([
        String(detailIndex),
        api.category,
        api.path,
        api.method,
        api.description,
        param.name,
        param.type,
        param.required ? '是' : '否',
        param.description,
        ret.field,
        ret.type,
        ret.description,
        i === 0 ? (api.notes || '') : '',
      ]);
    }
  });

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  detailSheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 35 },
    { wch: 8 },
    { wch: 40 },
    { wch: 18 },
    { wch: 12 },
    { wch: 8 },
    { wch: 30 },
    { wch: 20 },
    { wch: 12 },
    { wch: 30 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(workbook, detailSheet, '详细接口文档');

  // ========== 工作表3: 按模块分类 ==========
  const categories = [...new Set(API_DOCS.map(api => api.category))];

  categories.forEach(cat => {
    const catData = [
      ['序号', '路径', '方法', '功能说明', '请求参数', '返回参数', '备注'],
    ];

    API_DOCS.filter(api => api.category === cat).forEach((api, index) => {
      const paramsStr = api.params
        .map(p => `${p.name}(${p.type}${p.required ? ',必填' : ',选填'}): ${p.description}`)
        .join('\n');

      const returnsStr = api.returns
        .map(r => `${r.field}(${r.type}): ${r.description}`)
        .join('\n');

      catData.push([
        String(index + 1),
        api.path,
        api.method,
        api.description,
        paramsStr,
        returnsStr,
        api.notes || '',
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(catData);
    sheet['!cols'] = [
      { wch: 6 },
      { wch: 40 },
      { wch: 8 },
      { wch: 35 },
      { wch: 50 },
      { wch: 50 },
      { wch: 25 },
    ];
    const sheetName = cat.length > 28 ? cat.substring(0, 28) : cat;
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  });

  // ========== 工作表4: EKP同步接口专用文档 ==========
  const ekpSyncData = [
    ['EKP组织架构同步接口说明'],
    [],
    ['接口名称', 'getUpdatedElements - 获取需要更新的组织架构信息'],
    ['功能说明', '获取蓝凌EKP组织架构全量/增量数据，这是组织架构同步的主接口'],
    ['接口路径', '/api/sys-organization/sysSynchroGetOrg/getUpdatedElements'],
    ['认证方式', 'Basic Auth'],
    ['Content-Type', 'application/json'],
    [],
    ['请求参数'],
    ['参数名', '类型', '必填', '说明'],
    ['returnOrgType', 'string(JSON数组)', '否', '组织类型过滤，如：[{"type":"org"},{"type":"dept"},{"type":"person"}]，可选值：org/dept/group/post/person'],
    ['count', 'int', '是', '每次获取的条目数，建议500'],
    ['beginTimeStamp', 'string', '否', '开始时间戳，格式：yyyy-MM-dd HH:mm:ss.SSS，用于增量同步'],
    [],
    ['返回参数'],
    ['字段名', '类型', '说明'],
    ['returnState', 'int', '返回状态：0未操作 1失败 2成功'],
    ['message', 'string/array', '返回的组织架构信息JSON数组'],
    ['count', 'int', '本次返回的条目数'],
    ['timeStamp', 'string', '本次调用后的时间戳（用于继续分页获取）'],
    [],
    ['message数组元素字段'],
    ['字段名', '类型', '说明'],
    ['id', 'string', '唯一标识'],
    ['lunid', 'string', '唯一标示（可作为数据主键）'],
    ['name', 'string', '名称'],
    ['type', 'string', '组织架构类型：org/dept/group/post/person'],
    ['no', 'string', '编号'],
    ['order', 'string', '排序号'],
    ['isAvailable', 'boolean', '是否有效（决定是否删除）'],
    ['parent', 'string', '父部门ID（org/dept/post/person类型有）'],
    ['loginName', 'string', '登录名（person类型有）'],
    ['mobileNo', 'string', '手机号（person类型有）'],
    ['email', 'string', '邮箱（person类型有）'],
    ['rtx', 'string', 'RTX账号（person类型有）'],
    [],
    ['分页逻辑'],
    ['说明', '当返回的count >= 请求的count时，表示还有更多数据，需要继续调用'],
    ['继续获取', '使用上次返回的timeStamp作为新的beginTimeStamp继续调用，直到count < 请求count'],
    [],
    ['相关接口'],
    ['接口名称', '路径', '说明'],
    ['getElementsBaseInfo', '/api/sys-organization/sysSynchroGetOrg/getElementsBaseInfo', '获取所有组织架构基本信息'],
    ['getUpdatedElementsByToken', '/api/sys-organization/sysSynchroGetOrg/getUpdatedElementsByToken', '分页获取（按token分页）'],
    [],
    ['系统内部使用'],
    ['接口路径', '/api/organization/sync?source=ekp'],
    ['说明', '这是本系统的组织架构同步入口，内部调用上述EKP接口'],
  ];

  const ekpSyncSheet = XLSX.utils.aoa_to_sheet(ekpSyncData);
  ekpSyncSheet['!cols'] = [
    { wch: 25 },
    { wch: 80 },
  ];

  XLSX.utils.book_append_sheet(workbook, ekpSyncSheet, 'EKP同步接口说明');

  // 保存文件
  XLSX.writeFile(workbook, '系统接口文档.xlsx');
  console.log('Excel文档已生成: 系统接口文档.xlsx');
  console.log(`共计 ${API_DOCS.length} 个接口`);
}

generateExcel();
