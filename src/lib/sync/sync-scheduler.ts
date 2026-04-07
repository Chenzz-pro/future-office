/**
 * 组织架构同步定时任务调度器
 * 负责定时触发增量同步和全量同步
 */

import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { orgSyncService } from './org-sync.service';
import { orgSyncLogRepository } from '../database/repositories/org-sync-log.repository';
import { orgSyncConfigRepository } from '../database/repositories/org-sync-config.repository';

export interface SchedulerConfig {
  enableIncrementalSync: boolean;
  incrementalSyncInterval: number; // 分钟
  enableFullSync: boolean;
  fullSyncInterval: number; // 小时
  enableMonitor: boolean;
}

export class SyncScheduler {
  private isRunning = false;
  private incrementalTask: ScheduledTask | null = null;
  private fullSyncTask: ScheduledTask | null = null;
  private monitorTask: ScheduledTask | null = null;
  private incrementalRetryCount = 0;
  private fullSyncRetryCount = 0;
  private readonly MAX_RETRY_COUNT = 3;

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[SyncScheduler] 调度器已在运行');
      return;
    }

    try {
      // 获取配置
      const config = await this.getConfig();

      console.log('[SyncScheduler] 启动定时任务调度器', config);

      // 启动增量同步任务
      if (config.enableIncrementalSync) {
        this.startIncrementalSyncTask(config.incrementalSyncInterval);
      }

      // 启动全量同步任务
      if (config.enableFullSync) {
        this.startFullSyncTask();
      }

      // 启动监控任务
      if (config.enableMonitor) {
        this.startMonitorTask();
      }

      this.isRunning = true;
      console.log('[SyncScheduler] 调度器启动成功');
    } catch (error) {
      console.error('[SyncScheduler] 启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止调度器
   */
  stop(): void {
    console.log('[SyncScheduler] 停止调度器');

    if (this.incrementalTask) {
      this.incrementalTask.stop();
      this.incrementalTask = null;
    }

    if (this.fullSyncTask) {
      this.fullSyncTask.stop();
      this.fullSyncTask = null;
    }

    if (this.monitorTask) {
      this.monitorTask.stop();
      this.monitorTask = null;
    }

    this.isRunning = false;
    console.log('[SyncScheduler] 调度器已停止');
  }

  /**
   * 重启调度器
   */
  async restart(): Promise<void> {
    this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start();
  }

  /**
   * 启动增量同步任务
   */
  private startIncrementalSyncTask(intervalMinutes: number): void {
    // 使用cron表达式：每N分钟执行一次
    const cronExpression = `*/${intervalMinutes} * * * *`;

    console.log(`[SyncScheduler] 启动增量同步任务，间隔: ${intervalMinutes}分钟，Cron: ${cronExpression}`);

    this.incrementalTask = cron.schedule(cronExpression, async () => {
      try {
        console.log('[SyncScheduler] 执行定时增量同步');

        // 检查是否有正在运行的同步
        const runningSync = await orgSyncLogRepository.findRunningSync();
        if (runningSync) {
          console.warn('[SyncScheduler] 已有同步任务正在运行，跳过本次增量同步');
          return;
        }

        // 执行增量同步
        const result = await orgSyncService.incrementalSync({
          operatorId: 'system',
          operatorName: '定时任务',
          returnOrgType: [{ type: 'org' }, { type: 'dept' }, { type: 'post' }, { type: 'person' }]
        });

        if (result.success) {
          console.log('[SyncScheduler] 增量同步成功', result.stats);
          this.incrementalRetryCount = 0;
        } else {
          console.error('[SyncScheduler] 增量同步失败:', result.message);
          this.incrementalRetryCount++;

          // 如果连续失败超过3次，切换为全量同步
          if (this.incrementalRetryCount >= this.MAX_RETRY_COUNT) {
            console.warn('[SyncScheduler] 增量同步连续失败超过3次，切换为全量同步');
            this.incrementalRetryCount = 0;

            // 延迟5分钟后执行全量同步
            setTimeout(async () => {
              try {
                await orgSyncService.fullSync({
                  operatorId: 'system',
                  operatorName: '定时任务（失败恢复）',
                  returnOrgType: [{ type: 'org' }, { type: 'dept' }, { type: 'post' }, { type: 'person' }]
                });
              } catch (error) {
                console.error('[SyncScheduler] 恢复性全量同步失败:', error);
              }
            }, 5 * 60 * 1000);
          }
        }
      } catch (error) {
        console.error('[SyncScheduler] 增量同步异常:', error);
        this.incrementalRetryCount++;
      }
    });
  }

  /**
   * 启动全量同步任务（每月1号凌晨2点）
   */
  private startFullSyncTask(): void {
    // Cron表达式：每月1号凌晨2点执行
    const cronExpression = '0 2 1 * *';

    console.log(`[SyncScheduler] 启动全量同步任务，Cron: ${cronExpression}（每月1号凌晨2点）`);

    this.fullSyncTask = cron.schedule(cronExpression, async () => {
      try {
        console.log('[SyncScheduler] 执行定时全量同步');

        // 检查是否有正在运行的同步
        const runningSync = await orgSyncLogRepository.findRunningSync();
        if (runningSync) {
          console.warn('[SyncScheduler] 已有同步任务正在运行，跳过本次全量同步');
          return;
        }

        // 执行全量同步
        const result = await orgSyncService.fullSync({
          operatorId: 'system',
          operatorName: '定时任务（月度全量）',
          returnOrgType: [{ type: 'org' }, { type: 'dept' }, { type: 'post' }, { type: 'person' }]
        });

        if (result.success) {
          console.log('[SyncScheduler] 全量同步成功', result.stats);
          this.fullSyncRetryCount = 0;
        } else {
          console.error('[SyncScheduler] 全量同步失败:', result.message);
          this.fullSyncRetryCount++;

          // 重试一次
          if (this.fullSyncRetryCount < this.MAX_RETRY_COUNT) {
            console.log('[SyncScheduler] 1小时后重试全量同步');
            setTimeout(async () => {
              try {
                await orgSyncService.fullSync({
                  operatorId: 'system',
                  operatorName: '定时任务（月度重试）',
                  returnOrgType: [{ type: 'org' }, { type: 'dept' }, { type: 'post' }, { type: 'person' }]
                });
              } catch (error) {
                console.error('[SyncScheduler] 全量同步重试失败:', error);
              }
            }, 60 * 60 * 1000);
          }
        }
      } catch (error) {
        console.error('[SyncScheduler] 全量同步异常:', error);
        this.fullSyncRetryCount++;
      }
    });
  }

  /**
   * 启动监控任务
   */
  private startMonitorTask(): void {
    // 每5分钟检查一次同步状态
    const cronExpression = '*/5 * * * *';

    console.log(`[SyncScheduler] 启动监控任务，Cron: ${cronExpression}（每5分钟）`);

    this.monitorTask = cron.schedule(cronExpression, async () => {
      try {
        await this.checkSyncHealth();
      } catch (error) {
        console.error('[SyncScheduler] 监控任务异常:', error);
      }
    });
  }

  /**
   * 检查同步健康状态
   */
  private async checkSyncHealth(): Promise<void> {
    const lastSync = await orgSyncLogRepository.getLastSuccessfulSync();

    if (!lastSync) {
      console.warn('[SyncScheduler] 没有找到成功的同步记录');
      return;
    }

    const now = new Date();
    const lastSyncTime = new Date(lastSync.end_time || lastSync.start_time);
    const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);

    // 如果超过2小时没有成功同步，发送告警
    if (diffMinutes > 120) {
      console.error(`[SyncScheduler] 同步延迟超过2小时，上次同步时间: ${lastSyncTime.toISOString()}`);
      // TODO: 发送告警通知
    }

    // 检查是否有长时间运行的任务
    const runningSync = await orgSyncLogRepository.findRunningSync();
    if (runningSync) {
      const runningMinutes = (now.getTime() - runningSync.start_time.getTime()) / (1000 * 60);
      if (runningMinutes > 60) {
        console.warn(`[SyncScheduler] 同步任务运行超过1小时，可能卡住了，同步ID: ${runningSync.id}`);
        // TODO: 发送告警通知
      }
    }
  }

  /**
   * 获取配置
   */
  private async getConfig(): Promise<SchedulerConfig> {
    const enableIncrementalSync = await orgSyncConfigRepository.getBoolean('sync.enable_incremental_sync', true) ?? true;
    const incrementalSyncInterval = await orgSyncConfigRepository.getNumber('sync.incremental_sync_interval', 30) ?? 30;
    const enableFullSync = await orgSyncConfigRepository.getBoolean('sync.enable_full_sync', true) ?? true;
    const fullSyncInterval = await orgSyncConfigRepository.getNumber('sync.full_sync_interval', 720) ?? 720;
    const enableMonitor = await orgSyncConfigRepository.getBoolean('sync.enable_monitor', true) ?? true;

    return {
      enableIncrementalSync,
      incrementalSyncInterval,
      enableFullSync,
      fullSyncInterval,
      enableMonitor
    };
  }

  /**
   * 获取调度器状态
   */
  getStatus(): {
    isRunning: boolean;
    incrementalTaskRunning: boolean;
    fullSyncTaskRunning: boolean;
    monitorTaskRunning: boolean;
    incrementalRetryCount: number;
    fullSyncRetryCount: number;
  } {
    return {
      isRunning: this.isRunning,
      incrementalTaskRunning: !!this.incrementalTask,
      fullSyncTaskRunning: !!this.fullSyncTask,
      monitorTaskRunning: !!this.monitorTask,
      incrementalRetryCount: this.incrementalRetryCount,
      fullSyncRetryCount: this.fullSyncRetryCount
    };
  }

  /**
   * 手动触发增量同步
   */
  async manualIncrementalSync(): Promise<any> {
    return orgSyncService.incrementalSync({
      operatorId: 'system',
      operatorName: '手动触发',
      returnOrgType: [{ type: 'org' }, { type: 'dept' }, { type: 'post' }, { type: 'person' }]
    });
  }

  /**
   * 手动触发全量同步
   */
  async manualFullSync(): Promise<any> {
    return orgSyncService.fullSync({
      operatorId: 'system',
      operatorName: '手动触发',
      returnOrgType: [{ type: 'org' }, { type: 'dept' }, { type: 'post' }, { type: 'person' }]
    });
  }
}

// 导出单例
export const syncScheduler = new SyncScheduler();
