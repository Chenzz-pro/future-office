/**
 * 全局定时任务类型定义
 * 支持多种类型的定时任务，不限于特定系统
 */

/**
 * 任务类型枚举
 */
export enum TaskType {
  /** 组织架构同步 */
  ORG_SYNC = 'org_sync',
  /** 数据备份 */
  DATA_BACKUP = 'data_backup',
  /** 缓存清理 */
  CACHE_CLEANUP = 'cache_cleanup',
  /** 报表生成 */
  REPORT_GENERATION = 'report_generation',
  /** 自定义任务 */
  CUSTOM = 'custom',
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  /** 等待执行 */
  PENDING = 'pending',
  /** 运行中 */
  RUNNING = 'running',
  /** 执行成功 */
  SUCCESS = 'success',
  /** 执行失败 */
  FAILED = 'failed',
  /** 已取消 */
  CANCELLED = 'cancelled',
  /** 已暂停 */
  PAUSED = 'paused',
}

/**
 * 任务分组枚举
 */
export enum TaskGroup {
  /** 系统任务 */
  SYSTEM = 'system',
  /** 集成任务 */
  INTEGRATION = 'integration',
  /** 业务任务 */
  BUSINESS = 'business',
  /** 自定义任务 */
  CUSTOM = 'custom',
}

/**
 * 执行周期类型
 */
export enum ScheduleType {
  /** 间隔执行（每N分钟/小时） */
  INTERVAL = 'interval',
  /** Cron表达式 */
  CRON = 'cron',
  /** 只执行一次 */
  ONCE = 'once',
}

/**
 * 任务定义接口
 */
export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  type: TaskType;
  group: TaskGroup;
  enabled: boolean;
  scheduleType: ScheduleType;
  // Cron表达式或间隔配置
  cronExpression?: string;
  intervalMinutes?: number;
  intervalHours?: number;
  // 关联系统（用于标识任务属于哪个第三方系统）
  relatedSystem?: string;
  // 任务处理器配置
  handlerConfig: {
    handlerType: 'api' | 'script' | 'function';
    handlerPath: string;
    parameters?: Record<string, unknown>;
  };
  // 重试配置
  retryConfig?: {
    maxRetries: number;
    retryIntervalSeconds: number;
  };
  // 超时配置（秒）
  timeoutSeconds?: number;
  // 执行限制
  executionLimit?: {
    maxConcurrent: number;
    maxExecutionsPerDay?: number;
  };
  // 元数据
  metadata?: Record<string, unknown>;
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * 任务执行记录
 */
export interface TaskExecution {
  id: string;
  taskId: string;
  taskName: string;
  taskType: TaskType;
  status: TaskStatus;
  triggeredBy: 'schedule' | 'manual' | 'api';
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
  result?: {
    success: boolean;
    message?: string;
    data?: unknown;
    output?: string;
  };
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  parameters?: Record<string, unknown>;
  logs?: string[];
  createdAt: Date;
}

/**
 * 任务执行统计
 */
export interface TaskStats {
  taskId: string;
  taskName: string;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  avgDurationSeconds: number;
  lastExecutionAt?: Date;
  lastSuccessAt?: Date;
  lastFailedAt?: Date;
  nextScheduledAt?: Date;
  runningTasks?: number;
  enabledTasks?: number;
}

/**
 * 新建/更新任务的请求
 */
export interface CreateTaskRequest {
  name: string;
  description?: string;
  type: TaskType;
  group: TaskGroup;
  enabled?: boolean;
  scheduleType: ScheduleType;
  cronExpression?: string;
  intervalMinutes?: number;
  intervalHours?: number;
  relatedSystem?: string;
  handlerConfig: {
    handlerType: 'api' | 'script' | 'function';
    handlerPath: string;
    parameters?: Record<string, unknown>;
  };
  retryConfig?: {
    maxRetries: number;
    retryIntervalSeconds: number;
  };
  timeoutSeconds?: number;
  executionLimit?: {
    maxConcurrent: number;
    maxExecutionsPerDay?: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * 更新任务的请求
 */
export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  id: string;
}

/**
 * 手动触发任务的请求
 */
export interface TriggerTaskRequest {
  taskId: string;
  parameters?: Record<string, unknown>;
  triggeredBy?: 'manual' | 'api';
}

/**
 * 任务分组统计
 */
export interface TaskGroupStats {
  group: TaskGroup;
  label: string;
  totalTasks: number;
  enabledTasks: number;
  runningTasks: number;
  todayExecutions: number;
  todaySuccess: number;
  todayFailed: number;
}

/**
 * Cron表达式帮助信息
 */
export interface CronHelp {
  expression: string;
  description: string;
  nextRuns: Date[];
}

/**
 * 预定义Cron表达式模板
 */
export const CRON_TEMPLATES = [
  { label: '每5分钟', expression: '*/5 * * * *' },
  { label: '每15分钟', expression: '*/15 * * * *' },
  { label: '每30分钟', expression: '*/30 * * * *' },
  { label: '每小时', expression: '0 * * * *' },
  { label: '每6小时', expression: '0 */6 * * *' },
  { label: '每天凌晨', expression: '0 0 * * *' },
  { label: '每天2点', expression: '0 2 * * *' },
  { label: '每周一', expression: '0 0 * * 1' },
  { label: '每月1号', expression: '0 0 1 * *' },
  { label: '每季度', expression: '0 0 1 1,4,7,10 *' },
];

/**
 * 任务类型标签映射
 */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.ORG_SYNC]: '组织架构同步',
  [TaskType.DATA_BACKUP]: '数据备份',
  [TaskType.CACHE_CLEANUP]: '缓存清理',
  [TaskType.REPORT_GENERATION]: '报表生成',
  [TaskType.CUSTOM]: '自定义任务',
};

/**
 * 任务分组标签映射
 */
export const TASK_GROUP_LABELS: Record<TaskGroup, string> = {
  [TaskGroup.SYSTEM]: '系统任务',
  [TaskGroup.INTEGRATION]: '集成任务',
  [TaskGroup.BUSINESS]: '业务任务',
  [TaskGroup.CUSTOM]: '自定义任务',
};

/**
 * 任务状态标签映射
 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '等待执行',
  [TaskStatus.RUNNING]: '运行中',
  [TaskStatus.SUCCESS]: '执行成功',
  [TaskStatus.FAILED]: '执行失败',
  [TaskStatus.CANCELLED]: '已取消',
  [TaskStatus.PAUSED]: '已暂停',
};

/**
 * 预置任务模板枚举
 * 封装常用的定时任务，用户只需选择模板即可
 */
export enum PresetTaskTemplate {
  /** EKP组织架构全量同步 */
  EKP_ORG_FULL_SYNC = 'ekp_org_full_sync',
  /** EKP组织架构增量同步 */
  EKP_ORG_INCREMENTAL_SYNC = 'ekp_org_incremental_sync',
  /** EKP待办数量同步 */
  EKP_TODO_SYNC = 'ekp_todo_sync',
  /** 数据备份 */
  DATA_BACKUP = 'data_backup',
  /** 缓存清理 */
  CACHE_CLEANUP = 'cache_cleanup',
  /** 健康检查 */
  HEALTH_CHECK = 'health_check',
  /** 监控告警检查 */
  MONITOR_CHECK = 'monitor_check',
  /** 报表生成 */
  REPORT_GENERATION = 'report_generation',
  /** 自定义任务 */
  CUSTOM = 'custom',
}

/**
 * 预置任务模板配置
 */
export interface PresetTaskTemplateConfig {
  /** 模板ID */
  id: PresetTaskTemplate;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 关联任务类型 */
  taskType: TaskType;
  /** 关联任务分组 */
  taskGroup: TaskGroup;
  /** 默认关联系统 */
  defaultRelatedSystem?: string;
  /** 默认处理器配置 */
  defaultHandlerConfig: {
    handlerType: 'api' | 'script' | 'function';
    handlerPath: string;
    parameters?: Record<string, unknown>;
  };
  /** 建议的Cron表达式 */
  suggestedCron?: string;
  /** 建议的执行间隔（分钟） */
  suggestedIntervalMinutes?: number;
  /** 模板图标 */
  icon?: string;
}

/**
 * 预置任务模板配置映射
 */
export const PRESET_TASK_TEMPLATES: PresetTaskTemplateConfig[] = [
  {
    id: PresetTaskTemplate.EKP_ORG_FULL_SYNC,
    name: 'EKP组织架构全量同步',
    description: '从EKP系统全量同步组织架构数据（机构、部门、人员）',
    taskType: TaskType.ORG_SYNC,
    taskGroup: TaskGroup.INTEGRATION,
    defaultRelatedSystem: 'EKP',
    defaultHandlerConfig: {
      handlerType: 'api',
      handlerPath: '/api/organization/sync?source=ekp',
      parameters: { type: 'full', scope: ['organizations', 'departments', 'persons'] },
    },
    suggestedCron: '0 2 * * *', // 每天凌晨2点
    suggestedIntervalMinutes: undefined,
    icon: 'building',
  },
  {
    id: PresetTaskTemplate.EKP_ORG_INCREMENTAL_SYNC,
    name: 'EKP组织架构增量同步',
    description: '从EKP系统增量同步组织架构变更数据',
    taskType: TaskType.ORG_SYNC,
    taskGroup: TaskGroup.INTEGRATION,
    defaultRelatedSystem: 'EKP',
    defaultHandlerConfig: {
      handlerType: 'api',
      handlerPath: '/api/organization/sync?source=ekp',
      parameters: { type: 'incremental', scope: ['organizations', 'departments', 'persons'] },
    },
    suggestedCron: '*/30 * * * *', // 每30分钟
    suggestedIntervalMinutes: 30,
    icon: 'refresh',
  },
  {
    id: PresetTaskTemplate.EKP_TODO_SYNC,
    name: 'EKP待办数量同步',
    description: '同步EKP系统的待办数量到本地数据库',
    taskType: TaskType.ORG_SYNC,
    taskGroup: TaskGroup.INTEGRATION,
    defaultRelatedSystem: 'EKP',
    defaultHandlerConfig: {
      handlerType: 'api',
      handlerPath: '/api/ekp',
      parameters: { action: 'getTodoCount' },
    },
    suggestedCron: '*/15 * * * *', // 每15分钟
    suggestedIntervalMinutes: 15,
    icon: 'list',
  },
  {
    id: PresetTaskTemplate.DATA_BACKUP,
    name: '数据备份',
    description: '定期备份系统数据到指定存储',
    taskType: TaskType.DATA_BACKUP,
    taskGroup: TaskGroup.SYSTEM,
    defaultHandlerConfig: {
      handlerType: 'api',
      handlerPath: '/api/database/backup',
      parameters: {},
    },
    suggestedCron: '0 3 * * *', // 每天凌晨3点
    suggestedIntervalMinutes: undefined,
    icon: 'database',
  },
  {
    id: PresetTaskTemplate.CACHE_CLEANUP,
    name: '缓存清理',
    description: '清理系统缓存，释放存储空间',
    taskType: TaskType.CACHE_CLEANUP,
    taskGroup: TaskGroup.SYSTEM,
    defaultHandlerConfig: {
      handlerType: 'api',
      handlerPath: '/api/system/cache/cleanup',
      parameters: {},
    },
    suggestedCron: '0 4 * * *', // 每天凌晨4点
    suggestedIntervalMinutes: undefined,
    icon: 'trash',
  },
  {
    id: PresetTaskTemplate.HEALTH_CHECK,
    name: '健康检查',
    description: '检查系统各组件健康状态',
    taskType: TaskType.CUSTOM,
    taskGroup: TaskGroup.SYSTEM,
    defaultHandlerConfig: {
      handlerType: 'api',
      handlerPath: '/api/system/health',
      parameters: {},
    },
    suggestedCron: '*/5 * * * *', // 每5分钟
    suggestedIntervalMinutes: 5,
    icon: 'activity',
  },
  {
    id: PresetTaskTemplate.MONITOR_CHECK,
    name: '监控告警检查',
    description: '检查监控指标并发送告警通知',
    taskType: TaskType.CUSTOM,
    taskGroup: TaskGroup.SYSTEM,
    defaultHandlerConfig: {
      handlerType: 'api',
      handlerPath: '/api/monitor/check',
      parameters: {},
    },
    suggestedCron: '*/10 * * * *', // 每10分钟
    suggestedIntervalMinutes: 10,
    icon: 'bell',
  },
  {
    id: PresetTaskTemplate.REPORT_GENERATION,
    name: '报表生成',
    description: '自动生成系统运行报表',
    taskType: TaskType.REPORT_GENERATION,
    taskGroup: TaskGroup.BUSINESS,
    defaultHandlerConfig: {
      handlerType: 'api',
      handlerPath: '/api/reports/generate',
      parameters: {},
    },
    suggestedCron: '0 8 * * *', // 每天早上8点
    suggestedIntervalMinutes: undefined,
    icon: 'file-text',
  },
  {
    id: PresetTaskTemplate.CUSTOM,
    name: '自定义任务',
    description: '创建自定义的定时任务',
    taskType: TaskType.CUSTOM,
    taskGroup: TaskGroup.CUSTOM,
    defaultHandlerConfig: {
      handlerType: 'api',
      handlerPath: '',
      parameters: {},
    },
    suggestedCron: '*/5 * * * *',
    suggestedIntervalMinutes: 5,
    icon: 'settings',
  },
];

/**
 * 根据模板ID获取模板配置
 */
export function getPresetTemplate(templateId: PresetTaskTemplate): PresetTaskTemplateConfig | undefined {
  return PRESET_TASK_TEMPLATES.find(t => t.id === templateId);
}
