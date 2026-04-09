/**
 * 业务权限规则完整版
 * 
 * 本文件定义了系统中所有业务操作的权限规则和业务流程规则
 * 
 * 权限规则格式：
 * - ruleId: 规则唯一标识（格式：{模块}-{操作}-{场景}）
 * - ruleName: 规则名称
 * - condition: 触发条件（查询/创建/更新/取消/审批/所有）
 * - checkLogic: 权限校验逻辑
 *   - "用户登录即可" - 只要登录即可
 *   - "查询他人数据:需要管理员" - 查询他人数据需要管理员
 *   - "查询他人数据:需要管理员或主管" - 查询他人数据需要管理员或主管
 *   - "仅管理员" - 只有管理员
 *   - "仅主管" - 只有主管
 *   - "仅本人" - 只有本人
 *   - "管理员或本人" - 管理员或本人
 *   - "管理员或主管" - 管理员或主管
 * - interceptAction: 拦截提示
 * 
 * 业务规则格式：
 * - ruleId: 规则唯一标识
 * - ruleName: 规则名称
 * - steps: 业务流程步骤
 *   - check_params: 参数校验
 *   - invoke_skill: 调用技能
 *   - filter_data: 数据过滤
 *   - format_data: 格式化响应
 */

// ==================== 权限规则 ====================
export const permissionRules = [
  // ==================== 待办相关权限 ====================
  {
    ruleId: 'notify-query-self',
    ruleName: '待办查询-查询本人',
    condition: '查询',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限查询待办',
  },
  {
    ruleId: 'notify-query-other',
    ruleName: '待办查询-查询他人',
    condition: '查询',
    checkLogic: '查询他人数据:需要管理员',
    interceptAction: '您无权查询他人的待办，普通用户只能查询自己的待办',
  },
  {
    ruleId: 'notify-approve',
    ruleName: '待办审批',
    condition: '审批',
    checkLogic: '仅本人或管理员',
    interceptAction: '您没有权限审批此待办',
  },
  {
    ruleId: 'notify-reject',
    ruleName: '待办驳回',
    condition: '取消',
    checkLogic: '仅本人或管理员',
    interceptAction: '您没有权限驳回此待办',
  },

  // ==================== 会议相关权限 ====================
  {
    ruleId: 'meeting-query-self',
    ruleName: '会议查询-查询本人',
    condition: '查询',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限查询会议',
  },
  {
    ruleId: 'meeting-query-other',
    ruleName: '会议查询-查询他人',
    condition: '查询',
    checkLogic: '查询他人数据:需要管理员',
    interceptAction: '您无权查询他人的会议，普通用户只能查询自己的会议',
  },
  {
    ruleId: 'meeting-create',
    ruleName: '会议创建',
    condition: '创建',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限创建会议',
  },
  {
    ruleId: 'meeting-update',
    ruleName: '会议更新',
    condition: '更新',
    checkLogic: '仅本人或管理员',
    interceptAction: '您没有权限更新此会议，只有创建者或管理员可以修改',
  },
  {
    ruleId: 'meeting-cancel',
    ruleName: '会议取消',
    condition: '取消',
    checkLogic: '仅本人或管理员',
    interceptAction: '您没有权限取消此会议，只有创建者或管理员可以取消',
  },

  // ==================== 考勤相关权限 ====================
  {
    ruleId: 'attendance-query-self',
    ruleName: '考勤查询-查询本人',
    condition: '查询',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限查询考勤',
  },
  {
    ruleId: 'attendance-query-other',
    ruleName: '考勤查询-查询他人',
    condition: '查询',
    checkLogic: '查询他人数据:需要管理员',
    interceptAction: '您无权查询他人的考勤记录',
  },
  {
    ruleId: 'attendance-apply',
    ruleName: '考勤申请',
    condition: '创建',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限提交考勤申请',
  },
  {
    ruleId: 'attendance-approve',
    ruleName: '考勤审批',
    condition: '审批',
    checkLogic: '管理员或主管',
    interceptAction: '您没有权限审批此考勤申请',
  },

  // ==================== 文档相关权限 ====================
  {
    ruleId: 'document-read-public',
    ruleName: '文档阅读-公共文档',
    condition: '查询',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限阅读此文档',
  },
  {
    ruleId: 'document-read-private',
    ruleName: '文档阅读-私有文档',
    condition: '查询',
    checkLogic: '仅本人或管理员',
    interceptAction: '您没有权限阅读此私有文档',
  },
  {
    ruleId: 'document-create',
    ruleName: '文档创建',
    condition: '创建',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限创建文档',
  },
  {
    ruleId: 'document-update-own',
    ruleName: '文档更新-自己的文档',
    condition: '更新',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限更新此文档',
  },
  {
    ruleId: 'document-update-other',
    ruleName: '文档更新-他人的文档',
    condition: '更新',
    checkLogic: '仅管理员',
    interceptAction: '您没有权限更新他人的文档',
  },
  {
    ruleId: 'document-delete-own',
    ruleName: '文档删除-自己的文档',
    condition: '取消',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限删除此文档',
  },
  {
    ruleId: 'document-delete-other',
    ruleName: '文档删除-他人的文档',
    condition: '取消',
    checkLogic: '仅管理员',
    interceptAction: '您没有权限删除他人的文档',
  },

  // ==================== 组织架构相关权限 ====================
  {
    ruleId: 'org-read',
    ruleName: '组织架构查询',
    condition: '查询',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限查看组织架构',
  },
  {
    ruleId: 'org-manage',
    ruleName: '组织架构管理',
    condition: '所有',
    checkLogic: '仅管理员',
    interceptAction: '您没有权限管理组织架构，只有管理员可以操作',
  },
  {
    ruleId: 'person-read',
    ruleName: '人员查询',
    condition: '查询',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限查看人员信息',
  },
  {
    ruleId: 'person-manage',
    ruleName: '人员管理',
    condition: '所有',
    checkLogic: '仅管理员',
    interceptAction: '您没有权限管理人员，只有管理员可以操作',
  },

  // ==================== 角色权限相关 ====================
  {
    ruleId: 'role-read',
    ruleName: '角色查询',
    condition: '查询',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限查看角色信息',
  },
  {
    ruleId: 'role-manage',
    ruleName: '角色管理',
    condition: '所有',
    checkLogic: '仅管理员',
    interceptAction: '您没有权限管理角色，只有管理员可以操作',
  },

  // ==================== 流程审批相关权限 ====================
  {
    ruleId: 'workflow-query-self',
    ruleName: '流程查询-自己的流程',
    condition: '查询',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限查询此流程',
  },
  {
    ruleId: 'workflow-query-other',
    ruleName: '流程查询-他人的流程',
    condition: '查询',
    checkLogic: '查询他人数据:需要管理员或主管',
    interceptAction: '您没有权限查询他人的流程',
  },
  {
    ruleId: 'workflow-approve',
    ruleName: '流程审批',
    condition: '审批',
    checkLogic: '管理员或主管',
    interceptAction: '您没有权限审批此流程',
  },
  {
    ruleId: 'workflow-reject',
    ruleName: '流程驳回',
    condition: '取消',
    checkLogic: '管理员或主管',
    interceptAction: '您没有权限驳回此流程',
  },

  // ==================== 系统配置相关权限 ====================
  {
    ruleId: 'system-config-read',
    ruleName: '系统配置查询',
    condition: '查询',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限查看系统配置',
  },
  {
    ruleId: 'system-config-manage',
    ruleName: '系统配置管理',
    condition: '所有',
    checkLogic: '仅管理员',
    interceptAction: '您没有权限管理系统配置，只有管理员可以操作',
  },
  {
    ruleId: 'ekp-config-manage',
    ruleName: 'EKP集成配置管理',
    condition: '所有',
    checkLogic: '仅管理员',
    interceptAction: '您没有权限管理EKP集成配置，只有管理员可以操作',
  },
  {
    ruleId: 'skill-manage',
    ruleName: '技能管理',
    condition: '所有',
    checkLogic: '仅管理员',
    interceptAction: '您没有权限管理技能，只有管理员可以操作',
  },

  // ==================== 日志审计相关权限 ====================
  {
    ruleId: 'log-read-own',
    ruleName: '日志查询-自己的操作日志',
    condition: '查询',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限查看自己的操作日志',
  },
  {
    ruleId: 'log-read-other',
    ruleName: '日志查询-他人的操作日志',
    condition: '查询',
    checkLogic: '仅管理员',
    interceptAction: '您没有权限查看他人的操作日志',
  },
];

// ==================== 业务规则 ====================
export const businessRules = [
  // ==================== 待办业务流程 ====================
  {
    ruleId: 'get-my-todo',
    ruleName: '获取我的待办',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'invoke_ekp', action: 'invoke_skill', skillCode: 'ekp_notify', desc: '调用EKP待办接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'get-todo-count',
    ruleName: '获取待办数量',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'invoke_ekp', action: 'invoke_skill', skillCode: 'ekp_notify', desc: '调用EKP待办接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'get-todo-list',
    ruleName: '获取待办列表',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'invoke_ekp', action: 'invoke_skill', skillCode: 'ekp_notify', desc: '调用EKP待办接口' },
      { name: 'filter_data', action: 'filter_data', desc: '过滤数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'approve-todo',
    ruleName: '审批待办',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_ekp', action: 'invoke_skill', skillCode: 'ekp_notify', desc: '调用EKP审批接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'reject-todo',
    ruleName: '驳回待办',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_ekp', action: 'invoke_skill', skillCode: 'ekp_notify', desc: '调用EKP驳回接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'delegate-todo',
    ruleName: '转交待办',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_ekp', action: 'invoke_skill', skillCode: 'ekp_notify', desc: '调用EKP转交接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'get-todo-detail',
    ruleName: '获取待办详情',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_ekp', action: 'invoke_skill', skillCode: 'ekp_notify', desc: '调用EKP待办详情接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },

  // ==================== 会议业务流程 ====================
  {
    ruleId: 'get-my-meeting',
    ruleName: '获取我的会议',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'invoke_meeting', action: 'invoke_skill', skillCode: 'ekp_meeting', desc: '调用会议接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'create-meeting',
    ruleName: '创建会议',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_meeting', action: 'invoke_skill', skillCode: 'ekp_meeting', desc: '调用会议创建接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'update-meeting',
    ruleName: '更新会议',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_meeting', action: 'invoke_skill', skillCode: 'ekp_meeting', desc: '调用会议更新接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'cancel-meeting',
    ruleName: '取消会议',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_meeting', action: 'invoke_skill', skillCode: 'ekp_meeting', desc: '调用会议取消接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },

  // ==================== 考勤业务流程 ====================
  {
    ruleId: 'get-my-attendance',
    ruleName: '获取我的考勤',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'invoke_attendance', action: 'invoke_skill', skillCode: 'ekp_attendance', desc: '调用考勤接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'apply-attendance',
    ruleName: '申请考勤',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_attendance', action: 'invoke_skill', skillCode: 'ekp_attendance', desc: '调用考勤申请接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'approve-attendance',
    ruleName: '审批考勤',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_attendance', action: 'invoke_skill', skillCode: 'ekp_attendance', desc: '调用考勤审批接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },

  // ==================== 文档业务流程 ====================
  {
    ruleId: 'get-document',
    ruleName: '获取文档',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_document', action: 'invoke_skill', skillCode: 'ekp_document', desc: '调用文档接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'create-document',
    ruleName: '创建文档',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_document', action: 'invoke_skill', skillCode: 'ekp_document', desc: '调用文档创建接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'update-document',
    ruleName: '更新文档',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_document', action: 'invoke_skill', skillCode: 'ekp_document', desc: '调用文档更新接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'delete-document',
    ruleName: '删除文档',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_document', action: 'invoke_skill', skillCode: 'ekp_document', desc: '调用文档删除接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },

  // ==================== 组织架构业务流程 ====================
  {
    ruleId: 'get-org-tree',
    ruleName: '获取组织架构树',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'fetch_data', action: 'invoke_skill', skillCode: 'ekp_org', desc: '获取组织架构数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'get-person-list',
    ruleName: '获取人员列表',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'fetch_data', action: 'invoke_skill', skillCode: 'ekp_org', desc: '获取人员数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'create-person',
    ruleName: '创建人员',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'save_data', action: 'invoke_skill', skillCode: 'ekp_org', desc: '保存人员数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'update-person',
    ruleName: '更新人员',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'save_data', action: 'invoke_skill', skillCode: 'ekp_org', desc: '更新人员数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'delete-person',
    ruleName: '删除人员',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'delete_data', action: 'invoke_skill', skillCode: 'ekp_org', desc: '删除人员数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },

  // ==================== 角色管理业务流程 ====================
  {
    ruleId: 'get-role-list',
    ruleName: '获取角色列表',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'fetch_data', action: 'invoke_skill', skillCode: 'ekp_role', desc: '获取角色数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'create-role',
    ruleName: '创建角色',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'save_data', action: 'invoke_skill', skillCode: 'ekp_role', desc: '保存角色数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'update-role',
    ruleName: '更新角色',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'save_data', action: 'invoke_skill', skillCode: 'ekp_role', desc: '更新角色数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'delete-role',
    ruleName: '删除角色',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'delete_data', action: 'invoke_skill', skillCode: 'ekp_role', desc: '删除角色数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },

  // ==================== 流程审批业务流程 ====================
  {
    ruleId: 'get-my-workflow',
    ruleName: '获取我的流程',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'invoke_workflow', action: 'invoke_skill', skillCode: 'ekp_workflow', desc: '调用流程接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'get-workflow-pending',
    ruleName: '获取待审批流程',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_workflow', action: 'invoke_skill', skillCode: 'ekp_workflow', desc: '调用待审批流程接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'approve-workflow',
    ruleName: '审批流程',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_workflow', action: 'invoke_skill', skillCode: 'ekp_workflow', desc: '调用流程审批接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'reject-workflow',
    ruleName: '驳回流程',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_workflow', action: 'invoke_skill', skillCode: 'ekp_workflow', desc: '调用流程驳回接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'delegate-workflow',
    ruleName: '转交流程',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'invoke_workflow', action: 'invoke_skill', skillCode: 'ekp_workflow', desc: '调用流程转交接口' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },

  // ==================== 日志审计业务流程 ====================
  {
    ruleId: 'get-my-log',
    ruleName: '获取我的操作日志',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'fetch_data', action: 'invoke_skill', skillCode: 'ekp_log', desc: '获取操作日志' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'get-all-log',
    ruleName: '获取所有操作日志',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'fetch_data', action: 'invoke_skill', skillCode: 'ekp_log', desc: '获取所有操作日志' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
];

// ==================== 默认权限规则（兜底） ====================
export const defaultPermissionRules = [
  {
    ruleId: 'default-all',
    ruleName: '默认规则-所有操作',
    condition: '所有',
    checkLogic: '用户登录即可',
    interceptAction: '您没有权限执行此操作',
  },
];

// ==================== 默认业务规则（兜底） ====================
export const defaultBusinessRules = [
  {
    ruleId: 'default-query',
    ruleName: '默认查询流程',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'fetch_data', action: 'invoke_skill', skillCode: 'ekp_default', desc: '获取数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'default-create',
    ruleName: '默认创建流程',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'save_data', action: 'invoke_skill', skillCode: 'ekp_default', desc: '保存数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'default-update',
    ruleName: '默认更新流程',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'update_data', action: 'invoke_skill', skillCode: 'ekp_default', desc: '更新数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
  {
    ruleId: 'default-delete',
    ruleName: '默认删除流程',
    steps: [
      { name: 'check_params', action: 'check_params', desc: '参数校验' },
      { name: 'check_permission', action: 'run_permission_rules', desc: '权限校验' },
      { name: 'delete_data', action: 'invoke_skill', skillCode: 'ekp_default', desc: '删除数据' },
      { name: 'format_result', action: 'format_data', desc: '格式化结果' },
    ],
  },
];

// ==================== 权限规则导出 ====================
export {
  permissionRules as defaultPermissionRulesList,
  businessRules as defaultBusinessRulesList,
};

// ==================== 规则匹配辅助函数 ====================

/**
 * 根据操作类型获取匹配的权限规则
 */
export function getMatchingPermissionRules(
  rules: typeof permissionRules,
  action: string
): typeof permissionRules {
  return rules.filter(rule => {
    const condition = rule.condition.toLowerCase();
    const lowerAction = action.toLowerCase();

    if (condition.includes('所有') || condition.includes('all')) {
      return true;
    }

    if (condition.includes('查询') && (lowerAction.includes('query') || lowerAction.includes('get') || lowerAction.includes('list'))) {
      return true;
    }
    if (condition.includes('创建') && (lowerAction.includes('create') || lowerAction.includes('add'))) {
      return true;
    }
    if (condition.includes('更新') && (lowerAction.includes('update') || lowerAction.includes('edit'))) {
      return true;
    }
    if (condition.includes('取消') && (lowerAction.includes('cancel') || lowerAction.includes('delete'))) {
      return true;
    }
    if (condition.includes('审批') && (lowerAction.includes('approve') || lowerAction.includes('reject'))) {
      return true;
    }

    return false;
  });
}

/**
 * 根据规则ID获取权限规则
 */
export function getPermissionRuleById(
  rules: typeof permissionRules,
  ruleId: string
): typeof permissionRules[0] | undefined {
  return rules.find(r => r.ruleId === ruleId);
}

/**
 * 根据规则ID获取业务规则
 */
export function getBusinessRuleById(
  rules: typeof businessRules,
  ruleId: string
): typeof businessRules[0] | undefined {
  return rules.find(r => r.ruleId === ruleId);
}

/**
 * 根据操作获取匹配的业务规则
 */
export function getMatchingBusinessRules(
  rules: typeof businessRules,
  action: string
): typeof businessRules {
  return rules.filter(rule => {
    // 精确匹配
    if (rule.ruleId === action || rule.ruleId === action.replace(/_/g, '-')) {
      return true;
    }
    // 模糊匹配（包含关系）
    if (rule.ruleId.includes(action) || action.includes(rule.ruleId)) {
      return true;
    }
    return false;
  });
}
