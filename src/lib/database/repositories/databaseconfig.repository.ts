// 数据库配置数据访问层

import mysql from 'mysql2/promise';
import { dbManager } from '../manager';

export interface DatabaseConfig {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql';
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DatabaseConfigRepository {
  /**
   * 创建数据库配置
   */
  async create(config: Omit<DatabaseConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const sql = `
      INSERT INTO database_configs (id, name, type, host, port, database_name, username, password, is_active, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbManager.query(sql, [
      id,
      config.name,
      config.type,
      config.host,
      config.port,
      config.databaseName,
      config.username,
      config.password,
      config.isActive,
      config.isDefault,
    ]);
    return id;
  }

  /**
   * 根据 ID 查找配置
   */
  async findById(id: string): Promise<DatabaseConfig | null> {
    const sql = 'SELECT * FROM database_configs WHERE id = ?';
    const { rows } = await dbManager.query<DatabaseConfig>(sql, [id]);
    return rows[0] || null;
  }

  /**
   * 获取所有配置
   */
  async findAll(): Promise<DatabaseConfig[]> {
    const sql = 'SELECT * FROM database_configs ORDER BY is_default DESC, created_at DESC';
    const { rows } = await dbManager.query<DatabaseConfig>(sql);
    return rows;
  }

  /**
   * 获取激活的配置
   */
  async findActive(): Promise<DatabaseConfig | null> {
    const sql = 'SELECT * FROM database_configs WHERE is_active = true LIMIT 1';
    const { rows } = await dbManager.query<DatabaseConfig>(sql);
    return rows[0] || null;
  }

  /**
   * 获取默认配置
   */
  async findDefault(): Promise<DatabaseConfig | null> {
    const sql = 'SELECT * FROM database_configs WHERE is_default = true LIMIT 1';
    const { rows } = await dbManager.query<DatabaseConfig>(sql);
    return rows[0] || null;
  }

  /**
   * 更新配置
   */
  async update(id: string, updates: Partial<Omit<DatabaseConfig, 'id' | 'createdAt'>>): Promise<boolean> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      params.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      params.push(updates.type);
    }
    if (updates.host !== undefined) {
      fields.push('host = ?');
      params.push(updates.host);
    }
    if (updates.port !== undefined) {
      fields.push('port = ?');
      params.push(updates.port);
    }
    if (updates.databaseName !== undefined) {
      fields.push('database_name = ?');
      params.push(updates.databaseName);
    }
    if (updates.username !== undefined) {
      fields.push('username = ?');
      params.push(updates.username);
    }
    if (updates.password !== undefined) {
      fields.push('password = ?');
      params.push(updates.password);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      params.push(updates.isActive);
    }
    if (updates.isDefault !== undefined) {
      fields.push('is_default = ?');
      params.push(updates.isDefault);
    }

    if (fields.length === 0) return false;

    params.push(id);
    const sql = `UPDATE database_configs SET ${fields.join(', ')} WHERE id = ?`;
    const { affectedRows } = await dbManager.query(sql, params);
    return (affectedRows || 0) > 0;
  }

  /**
   * 设置为激活配置（只激活一个）
   */
  async setActive(id: string): Promise<boolean> {
    // 先取消所有激活状态
    await dbManager.query('UPDATE database_configs SET is_active = false');
    // 设置指定配置为激活
    const sql = 'UPDATE database_configs SET is_active = true WHERE id = ?';
    const { affectedRows } = await dbManager.query(sql, [id]);
    return (affectedRows || 0) > 0;
  }

  /**
   * 删除配置
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM database_configs WHERE id = ?';
    const { affectedRows } = await dbManager.query(sql, [id]);
    return (affectedRows || 0) > 0;
  }

  /**
   * 测试连接
   */
  async testConnection(config: DatabaseConfig): Promise<{ success: boolean; message: string }> {
    try {
      // 创建临时连接池测试
      const testPool = mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.databaseName,
        waitForConnections: true,
        connectionLimit: 1,
      });

      const connection = await testPool.getConnection();
      await connection.ping();
      connection.release();
      await testPool.end();

      return { success: true, message: '连接成功' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '连接失败',
      };
    }
  }
}

export const databaseConfigRepository = new DatabaseConfigRepository();
