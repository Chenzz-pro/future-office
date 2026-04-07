/**
 * 组织架构同步系统初始化任务
 * 在系统启动时自动执行，初始化同步表和配置
 */

import { dbManager } from '../database/manager';
import { orgSyncLogRepository } from '../database/repositories/org-sync-log.repository';
import { orgSyncConfigRepository } from '../database/repositories/org-sync-config.repository';
import { orgSyncTokenRepository } from '../database/repositories/org-sync-token.repository';

export interface InitResult {
  success: boolean;
  initialized: boolean;
  message: string;
  details?: {
    tablesCreated: string[];
    configsInitialized: string[];
    tokensInitialized: string[];
  };
}

export class SyncSystemInitializer {
  private initialized = false;
  private initPromise: Promise<InitResult> | null = null;

  /**
   * 初始化同步系统
   */
  async initialize(): Promise<InitResult> {
    // 如果正在初始化中，返回同一个Promise
    if (this.initPromise) {
      return this.initPromise;
    }

    // 如果已经初始化过，直接返回成功
    if (this.initialized) {
      return {
        success: true,
        initialized: false,
        message: '同步系统已初始化'
      };
    }

    // 开始初始化
    this.initPromise = this.doInitialize();

    try {
      const result = await this.initPromise;

      if (result.success) {
        this.initialized = true;
      }

      return result;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * 执行初始化
   */
  private async doInitialize(): Promise<InitResult> {
    console.log('[SyncSystemInitializer] 开始初始化同步系统...');

    try {
      const details: InitResult['details'] = {
        tablesCreated: [],
        configsInitialized: [],
        tokensInitialized: []
      };

      // 1. 检查并创建同步表
      await this.ensureTables();
      details.tablesCreated = [
        'org_sync_logs',
        'org_sync_details',
        'org_sync_tokens',
        'org_sync_config'
      ];
      console.log('[SyncSystemInitializer] 同步表检查完成');

      // 2. 初始化配置
      await this.initializeConfigs();
      details.configsInitialized = [
        'sync.default_password',
        'sync.default_role_id',
        'sync.enable_incremental_sync',
        'sync.incremental_sync_interval',
        'sync.enable_full_sync',
        'sync.full_sync_interval',
        'sync.batch_size',
        'sync.enable_monitor',
        'sync.alert_on_failure',
        'sync.alert_on_data_anomaly',
        'sync.sync_delay_threshold',
        'sync.data_anomaly_threshold',
        'sync.data_anomaly_lower_threshold',
        'sync.filter_inactive_users',
        'sync.notification_channels'
      ];
      console.log('[SyncSystemInitializer] 配置初始化完成');

      // 3. 初始化令牌
      await this.initializeTokens();
      details.tokensInitialized = [
        'last_sync_timestamp',
        'current_page_token'
      ];
      console.log('[SyncSystemInitializer] 令牌初始化完成');

      console.log('[SyncSystemInitializer] 同步系统初始化成功');

      return {
        success: true,
        initialized: true,
        message: '同步系统初始化成功',
        details
      };
    } catch (error) {
      console.error('[SyncSystemInitializer] 初始化失败:', error);
      return {
        success: false,
        initialized: false,
        message: `初始化失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 确保同步表存在
   */
  private async ensureTables(): Promise<void> {
    const tables = [
      'org_sync_logs',
      'org_sync_details',
      'org_sync_tokens',
      'org_sync_config'
    ];

    for (const table of tables) {
      const checkSql = `
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = ?
      `;

      const result = await dbManager.query(checkSql, [table]);
      const count = result.rows[0]?.count || 0;

      if (count === 0) {
        console.warn(`[SyncSystemInitializer] 表 ${table} 不存在，请执行数据库初始化脚本`);
        // 不自动创建表，由管理员执行SQL脚本
      }
    }
  }

  /**
   * 初始化配置
   */
  private async initializeConfigs(): Promise<void> {
    const configs: Array<{ key: string; value: unknown; type: 'string' | 'number' | 'boolean' | 'json' }> = [
      { key: 'sync.default_password', value: '123456', type: 'string' },
      { key: 'sync.default_role_id', value: '00000000-0000-0000-0000-000000000003', type: 'string' },
      { key: 'sync.enable_incremental_sync', value: true, type: 'boolean' },
      { key: 'sync.incremental_sync_interval', value: 30, type: 'number' },
      { key: 'sync.enable_full_sync', value: true, type: 'boolean' },
      { key: 'sync.full_sync_interval', value: 720, type: 'number' },
      { key: 'sync.batch_size', value: 500, type: 'number' },
      { key: 'sync.enable_monitor', value: true, type: 'boolean' },
      { key: 'sync.alert_on_failure', value: true, type: 'boolean' },
      { key: 'sync.alert_on_data_anomaly', value: true, type: 'boolean' },
      { key: 'sync.alert_on_sync_delay', value: true, type: 'boolean' },
      { key: 'sync.sync_delay_threshold', value: 120, type: 'number' },
      { key: 'sync.data_anomaly_threshold', value: 10000, type: 'number' },
      { key: 'sync.data_anomaly_lower_threshold', value: 10, type: 'number' },
      { key: 'sync.filter_inactive_users', value: true, type: 'boolean' },
      { key: 'sync.notification_channels', value: ['email'], type: 'json' }
    ];

    for (const config of configs) {
      const existing = await orgSyncConfigRepository.getByKey(config.key);
      if (existing === null) {
        await orgSyncConfigRepository.setKey(config.key, config.value, config.type);
      }
    }
  }

  /**
   * 初始化令牌
   */
  private async initializeTokens(): Promise<void> {
    const tokens = [
      { name: 'last_sync_timestamp', type: 'timestamp' },
      { name: 'current_page_token', type: 'page_token' }
    ];

    for (const token of tokens) {
      const existing = await orgSyncTokenRepository.getByName(token.name);
      if (!existing) {
        await orgSyncTokenRepository.setValue(token.name, null);
      }
    }
  }

  /**
   * 检查是否已初始化
   */
  async isInitialized(): Promise<boolean> {
    try {
      // 检查同步日志表是否存在
      const checkSql = `
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'org_sync_logs'
      `;

      const result = await dbManager.query(checkSql);
      const count = result.rows[0]?.count || 0;

      return count > 0 && this.initialized;
    } catch (error) {
      return false;
    }
  }

  /**
   * 重置初始化状态
   */
  reset(): void {
    this.initialized = false;
    this.initPromise = null;
    console.log('[SyncSystemInitializer] 初始化状态已重置');
  }

  /**
   * 获取初始化状态
   */
  getStatus(): {
    initialized: boolean;
    initializing: boolean;
  } {
    return {
      initialized: this.initialized,
      initializing: !!this.initPromise
    };
  }
}

// 导出单例
export const syncSystemInitializer = new SyncSystemInitializer();
