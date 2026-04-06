// 用户数据访问层（已废弃：使用 sys_org_person 作为用户表）
//
// 注意：此 Repository 已废弃，因为 users 表已被 sys_org_person 表取代。
// 现在应该直接使用 dbManager 操作 sys_org_person 表，或者创建专门的 sysOrgPersonRepository。
//
// 为了保持向后兼容性，此文件暂时保留，但所有操作已改为操作 sys_org_person 表。

import { dbManager } from '../manager';

export interface User {
  id: string; // 对应 sys_org_person.fd_id
  username: string; // 对应 sys_org_person.fd_login_name
  password: string; // 对应 sys_org_person.fd_password
  email: string; // 对应 sys_org_person.fd_email
  role: 'admin' | 'user'; // 对应 sys_org_person.fd_role
  avatarUrl?: string; // 不在 sys_org_person 中，需要额外存储
  status: 'active' | 'inactive' | 'banned'; // 对应 sys_org_person.fd_is_login_enabled
  lastLoginAt?: Date; // 不在 sys_org_person 中，需要额外存储
  createdAt?: Date; // 对应 sys_org_person.fd_create_time
  updatedAt?: Date; // 对应 sys_org_person.fd_alter_time
}

export class UserRepository {
  /**
   * 创建用户
   */
  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date();

    const sql = `
      INSERT INTO sys_org_person (
        fd_id, fd_name, fd_login_name, fd_password, fd_email, fd_role,
        fd_is_login_enabled, fd_is_business_related, fd_user_type, fd_create_time, fd_alter_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbManager.query(sql, [
      id,
      user.username, // fd_name
      user.username, // fd_login_name
      user.password,
      user.email,
      user.role,
      user.status === 'active' ? 1 : 0, // fd_is_login_enabled
      1, // fd_is_business_related
      'internal', // fd_user_type
      now,
      now,
    ]);

    return id;
  }

  /**
   * 根据 ID 查找用户
   */
  async findById(id: string): Promise<User | null> {
    const sql = `
      SELECT
        fd_id as id,
        fd_login_name as username,
        fd_password as password,
        fd_email as email,
        fd_role as role,
        fd_is_login_enabled as loginEnabled,
        fd_create_time as createdAt,
        fd_alter_time as updatedAt
      FROM sys_org_person
      WHERE fd_id = ?
    `;

    const { rows } = await dbManager.query<any>(sql, [id]);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      email: row.email,
      role: row.role,
      status: row.loginEnabled ? 'active' : 'inactive',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    const sql = `
      SELECT
        fd_id as id,
        fd_login_name as username,
        fd_password as password,
        fd_email as email,
        fd_role as role,
        fd_is_login_enabled as loginEnabled,
        fd_create_time as createdAt,
        fd_alter_time as updatedAt
      FROM sys_org_person
      WHERE fd_login_name = ?
    `;

    const { rows } = await dbManager.query<any>(sql, [username]);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      email: row.email,
      role: row.role,
      status: row.loginEnabled ? 'active' : 'inactive',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    const sql = `
      SELECT
        fd_id as id,
        fd_login_name as username,
        fd_password as password,
        fd_email as email,
        fd_role as role,
        fd_is_login_enabled as loginEnabled,
        fd_create_time as createdAt,
        fd_alter_time as updatedAt
      FROM sys_org_person
      WHERE fd_email = ?
    `;

    const { rows } = await dbManager.query<any>(sql, [email]);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      email: row.email,
      role: row.role,
      status: row.loginEnabled ? 'active' : 'inactive',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * 查找所有用户
   */
  async findAll(options?: {
    role?: 'admin' | 'user';
    status?: 'active' | 'inactive';
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    let sql = `
      SELECT
        fd_id as id,
        fd_login_name as username,
        fd_password as password,
        fd_email as email,
        fd_role as role,
        fd_is_login_enabled as loginEnabled,
        fd_create_time as createdAt,
        fd_alter_time as updatedAt
      FROM sys_org_person
      WHERE 1=1
    `;

    const params: unknown[] = [];

    if (options?.role) {
      sql += ' AND fd_role = ?';
      params.push(options.role);
    }

    if (options?.status) {
      sql += ' AND fd_is_login_enabled = ?';
      params.push(options.status === 'active' ? 1 : 0);
    }

    sql += ' ORDER BY fd_create_time DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);

      if (options.offset) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const { rows } = await dbManager.query<any>(sql, params);

    return rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      password: row.password,
      email: row.email,
      role: row.role,
      status: row.loginEnabled ? 'active' : 'inactive',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  /**
   * 更新用户
   */
  async update(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<boolean> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (updates.username !== undefined) {
      fields.push('fd_login_name = ?');
      params.push(updates.username);
    }
    if (updates.password !== undefined) {
      fields.push('fd_password = ?');
      params.push(updates.password);
    }
    if (updates.email !== undefined) {
      fields.push('fd_email = ?');
      params.push(updates.email);
    }
    if (updates.role !== undefined) {
      fields.push('fd_role = ?');
      params.push(updates.role);
    }
    if (updates.status !== undefined) {
      fields.push('fd_is_login_enabled = ?');
      params.push(updates.status === 'active' ? 1 : 0);
    }

    if (fields.length === 0) return false;

    fields.push('fd_alter_time = ?');
    params.push(new Date());
    params.push(id);

    const sql = `UPDATE sys_org_person SET ${fields.join(', ')} WHERE fd_id = ?`;
    const { affectedRows } = await dbManager.query(sql, params);
    return (affectedRows || 0) > 0;
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM sys_org_person WHERE fd_id = ?';
    const { affectedRows } = await dbManager.query(sql, [id]);
    return (affectedRows || 0) > 0;
  }
}

export const userRepository = new UserRepository();
