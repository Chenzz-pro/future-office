/**
 * 全局监控中心类型定义
 * 支持多种类型的监控告警，不限于特定系统
 */

/**
 * 告警级别枚举
 */
export enum AlertLevel {
  /** 信息 */
  INFO = 'info',
  /** 警告 */
  WARNING = 'warning',
  /** 错误 */
  ERROR = 'error',
  /** 严重 */
  CRITICAL = 'critical',
}

/**
 * 告警类型枚举
 */
export enum AlertType {
  /** 系统健康 */
  SYSTEM_HEALTH = 'system_health',
  /** 任务执行失败 */
  TASK_FAILURE = 'task_failure',
  /** 任务执行超时 */
  TASK_TIMEOUT = 'task_timeout',
  /** 同步延迟 */
  SYNC_DELAY = 'sync_delay',
  /** 数据异常 */
  DATA_ANOMALY = 'data_anomaly',
  /** 集成连接断开 */
  INTEGRATION_DISCONNECT = 'integration_disconnect',
  /** API调用失败 */
  API_FAILURE = 'api_failure',
  /** 自定义告警 */
  CUSTOM = 'custom',
}

/**
 * 通知渠道枚举
 */
export enum NotificationChannel {
  /** 邮件 */
  EMAIL = 'email',
  /** Webhook */
  WEBHOOK = 'webhook',
  /** 钉钉 */
  DINGTALK = 'dingtalk',
  /** 企业微信 */
  WECHAT_WORK = 'wechat_work',
  /** 系统消息 */
  SYSTEM = 'system',
}

/**
 * 告警规则定义
 */
export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  type: AlertType;
  level: AlertLevel;
  enabled: boolean;
  // 触发条件
  conditions: AlertCondition[];
  // 关联系统/模块
  relatedSystem?: string;
  relatedModule?: string;
  // 通知配置
  notificationConfig: {
    channels: NotificationChannel[];
    recipients?: string[];
    webhookUrls?: string[];
    emailTemplate?: string;
    // 告警抑制配置
    cooldownMinutes?: number; // 相同告警的冷却时间（分钟）
    maxAlertsPerHour?: number; // 每小时最大告警数
  };
  // 元数据
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * 告警条件
 */
export interface AlertCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';
  value: unknown;
  // 条件组合
  logical?: 'and' | 'or';
}

/**
 * 告警记录
 */
export interface Alert {
  id: string;
  ruleId?: string;
  ruleName?: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  source?: string;
  relatedSystem?: string;
  relatedModule?: string;
  relatedId?: string;
  details?: Record<string, unknown>;
  status: 'active' | 'acknowledged' | 'resolved' | 'muted';
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  mutedUntil?: Date;
  sentChannels: NotificationChannel[];
  sentAt?: Date;
  createdAt: Date;
}

/**
 * 通知渠道配置
 */
export interface ChannelConfig {
  id: string;
  channel: NotificationChannel;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  // SMTP配置（邮件）
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
  // Webhook配置
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
  webhookMethod?: 'GET' | 'POST' | 'PUT';
  // 钉钉配置
  dingtalkWebhook?: string;
  dingtalkSecret?: string;
  // 企业微信配置
  wechatWorkWebhook?: string;
  wechatWorkAgentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 告警统计
 */
export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  byLevel: Record<AlertLevel, number>;
  byType: Record<AlertType, number>;
  bySystem: Record<string, number>;
  recentTrend: Array<{ date: string; count: number }>;
}

/**
 * 新建/更新告警规则请求
 */
export interface CreateAlertRuleRequest {
  name: string;
  description?: string;
  type: AlertType;
  level: AlertLevel;
  enabled?: boolean;
  conditions: AlertCondition[];
  relatedSystem?: string;
  relatedModule?: string;
  notificationConfig: {
    channels: NotificationChannel[];
    recipients?: string[];
    webhookUrls?: string[];
    cooldownMinutes?: number;
    maxAlertsPerHour?: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * 更新告警规则请求
 */
export interface UpdateAlertRuleRequest extends Partial<CreateAlertRuleRequest> {
  id: string;
}

/**
 * 创建告警请求
 */
export interface CreateAlertRequest {
  ruleId?: string;
  ruleName?: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  source?: string;
  relatedSystem?: string;
  relatedModule?: string;
  relatedId?: string;
  details?: Record<string, unknown>;
}

/**
 * 告警级别标签映射
 */
export const ALERT_LEVEL_LABELS: Record<AlertLevel, string> = {
  [AlertLevel.INFO]: '信息',
  [AlertLevel.WARNING]: '警告',
  [AlertLevel.ERROR]: '错误',
  [AlertLevel.CRITICAL]: '严重',
};

/**
 * 告警类型标签映射
 */
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  [AlertType.SYSTEM_HEALTH]: '系统健康',
  [AlertType.TASK_FAILURE]: '任务执行失败',
  [AlertType.TASK_TIMEOUT]: '任务执行超时',
  [AlertType.SYNC_DELAY]: '同步延迟',
  [AlertType.DATA_ANOMALY]: '数据异常',
  [AlertType.INTEGRATION_DISCONNECT]: '集成连接断开',
  [AlertType.API_FAILURE]: 'API调用失败',
  [AlertType.CUSTOM]: '自定义告警',
};

/**
 * 通知渠道标签映射
 */
export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  [NotificationChannel.EMAIL]: '邮件',
  [NotificationChannel.WEBHOOK]: 'Webhook',
  [NotificationChannel.DINGTALK]: '钉钉',
  [NotificationChannel.WECHAT_WORK]: '企业微信',
  [NotificationChannel.SYSTEM]: '系统消息',
};

/**
 * 告警级别颜色映射
 */
export const ALERT_LEVEL_COLORS: Record<AlertLevel, string> = {
  [AlertLevel.INFO]: 'blue',
  [AlertLevel.WARNING]: 'yellow',
  [AlertLevel.ERROR]: 'red',
  [AlertLevel.CRITICAL]: 'purple',
};

/**
 * 预定义告警规则模板
 */
export const ALERT_RULE_TEMPLATES = [
  {
    name: '同步任务失败告警',
    type: AlertType.TASK_FAILURE,
    level: AlertLevel.ERROR,
    description: '当定时任务执行失败时发送告警',
    conditions: [
      { field: 'status', operator: 'eq', value: 'failed' },
    ],
    notificationConfig: {
      channels: [NotificationChannel.SYSTEM, NotificationChannel.EMAIL],
    },
  },
  {
    name: '同步延迟告警',
    type: AlertType.SYNC_DELAY,
    level: AlertLevel.WARNING,
    description: '当同步任务超过指定时间未完成时告警',
    conditions: [
      { field: 'durationSeconds', operator: 'gt', value: 1800 },
    ],
    notificationConfig: {
      channels: [NotificationChannel.SYSTEM],
    },
  },
  {
    name: '集成连接断开告警',
    type: AlertType.INTEGRATION_DISCONNECT,
    level: AlertLevel.CRITICAL,
    description: '当第三方系统连接断开时立即告警',
    conditions: [
      { field: 'connected', operator: 'eq', value: false },
    ],
    notificationConfig: {
      channels: [NotificationChannel.SYSTEM, NotificationChannel.EMAIL, NotificationChannel.DINGTALK],
      cooldownMinutes: 30,
    },
  },
  {
    name: '数据异常告警',
    type: AlertType.DATA_ANOMALY,
    level: AlertLevel.WARNING,
    description: '当同步数据量异常时告警',
    conditions: [
      { field: 'changeCount', operator: 'gt', value: 10000 },
    ],
    notificationConfig: {
      channels: [NotificationChannel.SYSTEM],
    },
  },
];
