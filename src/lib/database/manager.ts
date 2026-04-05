// 数据库连接管理器

import mysql from 'mysql2/promise';
import type { DatabaseConfig, DatabaseConnectionOptions, QueryResult } from './types';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: mysql.Pool | null = null;
  private config: DatabaseConfig | null = null;
  private keepAliveTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * 初始化数据库连接
   */
  public async connect(config: DatabaseConfig): Promise<void> {
    try {
      // 如果已有连接，先关闭
      if (this.pool) {
        await this.disconnect();
      }

      const options: DatabaseConnectionOptions = {
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.databaseName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      };

      this.pool = mysql.createPool(options);
      this.config = config;

      // 测试连接
      await this.pool.getConnection();
      console.log('✅ 数据库连接成功:', config.name);

      // 自动迁移：修复旧的 system user ID
      await this.migrateSystemUserId();

      // 启动心跳保活机制（每5分钟检查一次）
      this.startKeepAlive();
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      throw new Error(`数据库连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 断开数据库连接
   */
  public async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.config = null;
      console.log('✅ 数据库连接已断开');
    }

    // 停止心跳保活
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  /**
   * 心跳保活机制
   */
  private startKeepAlive(): void {
    // 清除旧的定时器
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
    }

    // 每5分钟检查一次连接
    this.keepAliveTimer = setInterval(async () => {
      try {
        if (this.pool) {
          // 执行一个简单的查询来保持连接活跃
          await this.query('SELECT 1');
          console.log('[KeepAlive] 数据库连接保活成功');
        }
      } catch (error) {
        console.error('[KeepAlive] 数据库连接保活失败，尝试重新连接:', error);

        // 如果保活失败，尝试重新连接
        if (this.config) {
          try {
            await this.connect(this.config);
          } catch (reconnectError) {
            console.error('[KeepAlive] 重新连接失败:', reconnectError);
          }
        }
      }
    }, 5 * 60 * 1000); // 5分钟
  }

  /**
   * 执行查询
   */
  public async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('数据库未连接');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [results] = await this.pool.execute(sql, params as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rows: results as T[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        affectedRows: (results as any).affectedRows,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        insertId: (results as any).insertId,
      };
    } catch (error) {
      console.error('查询失败:', error);
      throw error;
    }
  }

  /**
   * 执行事务
   */
  public async transaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('数据库未连接');
    }

    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取当前配置
   */
  public getConfig(): DatabaseConfig | null {
    return this.config;
  }

  /**
   * 检查连接状态
   */
  public isConnected(): boolean {
    return this.pool !== null;
  }

  /**
   * 自动迁移：修复旧的 system user ID
   * 将所有 user_id = 'system' 的记录更新为正确的 UUID
   */
  private async migrateSystemUserId(): Promise<void> {
    try {
      const OLD_USER_ID = 'system';
      const NEW_USER_ID = '00000000-0000-0000-0000-000000000000';

      // 检查是否需要迁移
      const checkResult = await this.query(
        `SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?`,
        [OLD_USER_ID]
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const count = (checkResult.rows[0] as any).count;

      if (count > 0) {
        console.log(`[Migration] 发现 ${count} 条旧数据需要迁移...`);

        // 更新 api_keys 表
        await this.query(
          `UPDATE api_keys SET user_id = ? WHERE user_id = ?`,
          [NEW_USER_ID, OLD_USER_ID]
        );
        console.log('[Migration] api_keys 表迁移完成');

        // 更新 ekp_configs 表
        await this.query(
          `UPDATE ekp_configs SET user_id = ? WHERE user_id = ?`,
          [NEW_USER_ID, OLD_USER_ID]
        );
        console.log('[Migration] ekp_configs 表迁移完成');

        // 更新其他表（如果有）
        try {
          await this.query(
            `UPDATE chat_sessions SET user_id = ? WHERE user_id = ?`,
            [NEW_USER_ID, OLD_USER_ID]
          );
          console.log('[Migration] chat_sessions 表迁移完成');
        } catch (error) {
          // 表可能不存在，忽略错误
        }

        try {
          await this.query(
            `UPDATE custom_skills SET user_id = ? WHERE user_id = ?`,
            [NEW_USER_ID, OLD_USER_ID]
          );
          console.log('[Migration] custom_skills 表迁移完成');
        } catch (error) {
          // 表可能不存在，忽略错误
        }

        console.log('[Migration] ✅ 所有数据迁移完成');
      }
    } catch (error) {
      // 迁移失败不影响正常使用，只记录日志
      console.error('[Migration] 数据迁移失败:', error);
    }
  }
}

// 导出单例
export const dbManager = DatabaseManager.getInstance();
