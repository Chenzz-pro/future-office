// 数据库连接管理器

import mysql from 'mysql2/promise';
import type { DatabaseConfig, DatabaseConnectionOptions, QueryResult } from './types';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: mysql.Pool | null = null;
  private config: DatabaseConfig | null = null;

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
}

// 导出单例
export const dbManager = DatabaseManager.getInstance();
