/**
 * 组织架构同步监控告警服务
 * 负责监控同步状态，发送告警通知
 */

import { orgSyncLogRepository } from '../database/repositories/org-sync-log.repository';
import { orgSyncConfigRepository } from '../database/repositories/org-sync-config.repository';

export interface AlertConfig {
  alertOnFailure: boolean;
  alertOnDataAnomaly: boolean;
  alertOnSyncDelay: boolean;
  syncDelayThreshold: number; // 分钟
  dataAnomalyThreshold: number; // 条数
  dataAnomalyLowerThreshold: number; // 条数
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  type: 'sync_failure' | 'sync_delay' | 'data_anomaly' | 'sync_timeout';
  message: string;
  details?: Record<string, unknown>;
  syncLogId?: string;
  createdAt: Date;
  sent: boolean;
  sentAt?: Date;
  sentChannels: string[];
}

export class SyncMonitor {
  private alerts: Alert[] = [];
  private alertHistory: Alert[] = [];
  private config: AlertConfig;
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * 启动监控
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[SyncMonitor] 监控已在运行');
      return;
    }

    try {
      // 加载配置
      await this.loadConfig();

      // 每10分钟检查一次
      this.checkInterval = setInterval(async () => {
        try {
          await this.checkAll();
        } catch (error) {
          console.error('[SyncMonitor] 检查失败:', error);
        }
      }, 10 * 60 * 1000);

      this.isRunning = true;
      console.log('[SyncMonitor] 监控启动成功');
    } catch (error) {
      console.error('[SyncMonitor] 启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isRunning = false;
    console.log('[SyncMonitor] 监控已停止');
  }

  /**
   * 检查所有告警条件
   */
  private async checkAll(): Promise<void> {
    console.log('[SyncMonitor] 开始检查告警条件');

    // 检查同步延迟
    if (this.config.alertOnSyncDelay) {
      await this.checkSyncDelay();
    }

    // 检查数据量异常
    if (this.config.alertOnDataAnomaly) {
      await this.checkDataAnomaly();
    }

    // 检查正在运行的任务是否超时
    await this.checkRunningSync();
  }

  /**
   * 检查同步延迟
   */
  private async checkSyncDelay(): Promise<void> {
    const lastSync = await orgSyncLogRepository.getLastSuccessfulSync();

    if (!lastSync) {
      return;
    }

    const now = new Date();
    const lastSyncTime = new Date(lastSync.end_time || lastSync.start_time);
    const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);

    if (diffMinutes > this.config.syncDelayThreshold) {
      const alert: Alert = {
        id: crypto.randomUUID(),
        level: diffMinutes > 240 ? 'critical' : 'warning',
        type: 'sync_delay',
        message: `同步延迟超过${this.config.syncDelayThreshold}分钟，已延迟${Math.floor(diffMinutes)}分钟`,
        details: {
          lastSyncTime: lastSyncTime.toISOString(),
          delayMinutes: Math.floor(diffMinutes),
          syncLogId: lastSync.id
        },
        syncLogId: lastSync.id,
        createdAt: now,
        sent: false,
        sentChannels: []
      };

      await this.sendAlert(alert);
    }
  }

  /**
   * 检查数据量异常
   */
  private async checkDataAnomaly(): Promise<void> {
    const lastSync = await orgSyncLogRepository.getLastSuccessfulSync();

    if (!lastSync) {
      return;
    }

    const totalCount = lastSync.total_count || 0;

    // 检查数据量为0
    if (totalCount === 0 && lastSync.sync_type === 'incremental') {
      // 增量同步数据量为0是正常的，不告警
      return;
    }

    // 检查数据量过少（可能数据丢失）
    if (totalCount > 0 && totalCount < this.config.dataAnomalyLowerThreshold && lastSync.sync_type === 'full') {
      const alert: Alert = {
        id: crypto.randomUUID(),
        level: 'warning',
        type: 'data_anomaly',
        message: `同步数据量过少，仅${totalCount}条，低于阈值${this.config.dataAnomalyLowerThreshold}条`,
        details: {
          totalCount,
          threshold: this.config.dataAnomalyLowerThreshold,
          syncLogId: lastSync.id
        },
        syncLogId: lastSync.id,
        createdAt: new Date(),
        sent: false,
        sentChannels: []
      };

      await this.sendAlert(alert);
    }

    // 检查数据量过多（可能数据重复）
    if (totalCount > this.config.dataAnomalyThreshold) {
      const alert: Alert = {
        id: crypto.randomUUID(),
        level: 'warning',
        type: 'data_anomaly',
        message: `同步数据量过多，共${totalCount}条，超过阈值${this.config.dataAnomalyThreshold}条`,
        details: {
          totalCount,
          threshold: this.config.dataAnomalyThreshold,
          syncLogId: lastSync.id
        },
        syncLogId: lastSync.id,
        createdAt: new Date(),
        sent: false,
        sentChannels: []
      };

      await this.sendAlert(alert);
    }
  }

  /**
   * 检查正在运行的同步是否超时
   */
  private async checkRunningSync(): Promise<void> {
    const runningSync = await orgSyncLogRepository.findRunningSync();

    if (!runningSync) {
      return;
    }

    const now = new Date();
    const runningMinutes = (now.getTime() - runningSync.start_time.getTime()) / (1000 * 60);

    // 如果运行超过1小时，发送告警
    if (runningMinutes > 60) {
      const alert: Alert = {
        id: crypto.randomUUID(),
        level: runningMinutes > 120 ? 'critical' : 'warning',
        type: 'sync_timeout',
        message: `同步任务运行超过${Math.floor(runningMinutes)}分钟，可能卡住了`,
        details: {
          syncType: runningSync.sync_type,
          startTime: runningSync.start_time.toISOString(),
          runningMinutes: Math.floor(runningMinutes),
          syncLogId: runningSync.id
        },
        syncLogId: runningSync.id,
        createdAt: now,
        sent: false,
        sentChannels: []
      };

      await this.sendAlert(alert);
    }
  }

  /**
   * 同步失败告警
   */
  async onSyncFailed(syncLogId: string, errorMessage: string): Promise<void> {
    if (!this.config.alertOnFailure) {
      return;
    }

    const alert: Alert = {
      id: crypto.randomUUID(),
      level: 'error',
      type: 'sync_failure',
      message: `同步失败：${errorMessage}`,
      details: {
        errorMessage,
        syncLogId
      },
      syncLogId,
      createdAt: new Date(),
      sent: false,
      sentChannels: []
    };

    await this.sendAlert(alert);
  }

  /**
   * 发送告警
   */
  private async sendAlert(alert: Alert): Promise<void> {
    console.log(`[SyncMonitor] 发送告警 [${alert.level.toUpperCase()}]: ${alert.message}`);

    // 保存告警历史
    this.alerts.push(alert);
    this.alertHistory.push(alert);

    // 只保留最近100条历史
    if (this.alertHistory.length > 100) {
      this.alertHistory.shift();
    }

    // 获取通知渠道
    const channels = await orgSyncConfigRepository.getJSON<string[]>('sync.notification_channels', ['email']);

    try {
      // 发送邮件通知
      if (channels.includes('email')) {
        await this.sendEmailAlert(alert);
        alert.sentChannels.push('email');
      }

      // TODO: 添加其他通知渠道（短信、Webhook等）

      alert.sent = true;
      alert.sentAt = new Date();

      console.log(`[SyncMonitor] 告警已发送，渠道: ${alert.sentChannels.join(', ')}`);
    } catch (error) {
      console.error('[SyncMonitor] 发送告警失败:', error);
    }
  }

  /**
   * 发送邮件告警
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    // TODO: 实现邮件发送功能
    console.log(`[SyncMonitor] 发送邮件告警: ${alert.message}`);
    // 这里可以集成邮件服务（如nodemailer）
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    const alertOnFailure = await orgSyncConfigRepository.getBoolean('sync.alert_on_failure', true) ?? true;
    const alertOnDataAnomaly = await orgSyncConfigRepository.getBoolean('sync.alert_on_data_anomaly', true) ?? true;
    const alertOnSyncDelay = await orgSyncConfigRepository.getBoolean('sync.alert_on_sync_delay', true) ?? true;
    const syncDelayThreshold = await orgSyncConfigRepository.getNumber('sync.sync_delay_threshold', 120) ?? 120;
    const dataAnomalyThreshold = await orgSyncConfigRepository.getNumber('sync.data_anomaly_threshold', 10000) ?? 10000;
    const dataAnomalyLowerThreshold = await orgSyncConfigRepository.getNumber('sync.data_anomaly_lower_threshold', 10) ?? 10;

    this.config = {
      alertOnFailure,
      alertOnDataAnomaly,
      alertOnSyncDelay,
      syncDelayThreshold,
      dataAnomalyThreshold,
      dataAnomalyLowerThreshold
    };

    console.log('[SyncMonitor] 配置加载成功', this.config);
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): AlertConfig {
    return {
      alertOnFailure: true,
      alertOnDataAnomaly: true,
      alertOnSyncDelay: true,
      syncDelayThreshold: 120, // 2小时
      dataAnomalyThreshold: 10000, // 1万条
      dataAnomalyLowerThreshold: 10 // 10条
    };
  }

  /**
   * 获取告警列表
   */
  getAlerts(level?: 'info' | 'warning' | 'error' | 'critical'): Alert[] {
    if (level) {
      return this.alerts.filter(alert => alert.level === level);
    }
    return [...this.alerts];
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit).reverse();
  }

  /**
   * 清除告警
   */
  clearAlerts(alertId?: string): void {
    if (alertId) {
      this.alerts = this.alerts.filter(alert => alert.id !== alertId);
    } else {
      this.alerts = [];
    }
  }

  /**
   * 获取监控状态
   */
  getStatus(): {
    isRunning: boolean;
    alertCount: number;
    historyCount: number;
    config: AlertConfig;
  } {
    return {
      isRunning: this.isRunning,
      alertCount: this.alerts.length,
      historyCount: this.alertHistory.length,
      config: this.config
    };
  }

  /**
   * 重启监控
   */
  async restart(): Promise<void> {
    this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start();
  }
}

// 导出单例
export const syncMonitor = new SyncMonitor();
