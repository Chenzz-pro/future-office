// 用户数据访问层

import { dbManager } from '../manager';

export interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  role: 'admin' | 'user';
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'banned';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository {
  /**
   * 创建用户
   */
  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const sql = `
      INSERT INTO users (id, username, password, email, role, avatar_url, status, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbManager.query(sql, [
      id,
      user.username,
      user.password,
      user.email,
      user.role,
      user.avatarUrl || null,
      user.status,
      user.lastLoginAt || null,
    ]);
    return id;
  }

  /**
   * 根据 ID 查找用户
   */
  async findById(id: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const { rows } = await dbManager.query<User>(sql, [id]);
    return rows[0] || null;
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE username = ?';
    const { rows } = await dbManager.query<User>(sql, [username]);
    return rows[0] || null;
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const { rows } = await dbManager.query<User>(sql, [email]);
    return rows[0] || null;
  }

  /**
   * 获取所有用户
   */
  async findAll(filters?: {
    role?: 'admin' | 'user';
    status?: 'active' | 'inactive' | 'banned';
  }): Promise<User[]> {
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.role) {
      sql += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY created_at DESC';

    const { rows } = await dbManager.query<User>(sql, params);
    return rows;
  }

  /**
   * 更新用户
   */
  async update(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<boolean> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (updates.username !== undefined) {
      fields.push('username = ?');
      params.push(updates.username);
    }
    if (updates.password !== undefined) {
      fields.push('password = ?');
      params.push(updates.password);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      params.push(updates.email);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      params.push(updates.role);
    }
    if (updates.avatarUrl !== undefined) {
      fields.push('avatar_url = ?');
      params.push(updates.avatarUrl);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.lastLoginAt !== undefined) {
      fields.push('last_login_at = ?');
      params.push(updates.lastLoginAt);
    }

    if (fields.length === 0) return false;

    params.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const { affectedRows } = await dbManager.query(sql, params);
    return (affectedRows || 0) > 0;
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM users WHERE id = ?';
    const { affectedRows } = await dbManager.query(sql, [id]);
    return (affectedRows || 0) > 0;
  }
}

export const userRepository = new UserRepository();
