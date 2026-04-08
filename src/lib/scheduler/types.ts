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
