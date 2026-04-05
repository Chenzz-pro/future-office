/**
 * 人员 Repository
 */

import { dbManager } from './manager';
import {
  OrgPerson,
  OrgPersonDTO,
  PostPersonRelation,
  Gender,
  UserType,
  PersonQuery,
  PageResult
} from '@/types/org-structure';
import { orgElementRepository } from './org-element.repository';

export class OrgPersonRepository {
  private tableName = 'sys_org_person';
  private postPersonTableName = 'sys_org_post_person';

  /**
   * 创建人员
   */
  async create(dto: OrgPersonDTO): Promise<string> {
    const id = dto.fd_id || crypto.randomUUID();
    const now = new Date();

    // 检查登录名是否已存在
    const existing = await this.findByLoginName(dto.fd_login_name);
    if (existing) {
      throw new Error(`登录名 "${dto.fd_login_name}" 已存在`);
    }

    const sql = `
      INSERT INTO ${this.tableName} (
        fd_id,
        fd_name,
        fd_nickname,
        fd_no,
        fd_dept_id,
        fd_email,
        fd_mobile,
        fd_office_phone,
        fd_login_name,
        fd_password,
        fd_default_language,
        fd_keyword,
        fd_order,
        fd_position,
        fd_post_id,
        fd_rtx_account,
        fd_dynamic_password,
        fd_gender,
        fd_wechat,
        fd_short_no,
        fd_double_validation,
        fd_is_business_related,
        fd_is_login_enabled,
        fd_memo,
        fd_creator_id,
        fd_staffing_level_id,
        fd_user_type,
        fd_person_to_more_dept,
        fd_create_time,
        fd_alter_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // 密码加密（简单实现，实际项目应使用 bcrypt）
    const password = dto.fd_password || '123456';
    const hashedPassword = this.hashPassword(password);

    await dbManager.execute(sql, [
      id,
      dto.fd_name,
      dto.fd_nickname || null,
      dto.fd_no || null,
      dto.fd_dept_id || null,
      dto.fd_email || null,
      dto.fd_mobile || null,
      dto.fd_office_phone || null,
      dto.fd_login_name,
      hashedPassword,
      dto.fd_default_language || 'zh-CN',
      dto.fd_keyword || null,
      dto.fd_order ?? 0,
      dto.fd_position || null,
      dto.fd_post_id || null,
      dto.fd_rtx_account || null,
      dto.fd_dynamic_password || null,
      dto.fd_gender ?? 1,
      dto.fd_wechat || null,
      dto.fd_short_no || null,
      dto.fd_double_validation ?? 0,
      dto.fd_is_business_related ?? 1,
      dto.fd_is_login_enabled ?? 1,
      dto.fd_memo || null,
      dto.fd_creator_id || null,
      dto.fd_staffing_level_id || null,
      dto.fd_user_type || 'internal',
      dto.fd_person_to_more_dept ?? 0,
      now,
      now
    ]);

    // 处理一人多岗
    if (dto.fd_post_ids && dto.fd_post_ids.length > 0) {
      for (const postId of dto.fd_post_ids) {
        if (postId && postId !== dto.fd_post_id) {
          await this.addPostPersonRelation(postId, id);
        }
      }
    }

    // 更新部门人员数量
    if (dto.fd_dept_id) {
      await orgElementRepository.decrementPersonCount(dto.fd_dept_id);
    }

    return id;
  }

  /**
   * 更新人员
   */
  async update(id: string, dto: Partial<OrgPersonDTO>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    // 检查登录名是否已存在
    if (dto.fd_login_name !== undefined) {
      const existing = await this.findByLoginName(dto.fd_login_name);
      if (existing && existing.fd_id !== id) {
        throw new Error(`登录名 "${dto.fd_login_name}" 已存在`);
      }
      fields.push('fd_login_name = ?');
      values.push(dto.fd_login_name);
    }

    if (dto.fd_name !== undefined) {
      fields.push('fd_name = ?');
      values.push(dto.fd_name);
    }
    if (dto.fd_nickname !== undefined) {
      fields.push('fd_nickname = ?');
      values.push(dto.fd_nickname);
    }
    if (dto.fd_no !== undefined) {
      fields.push('fd_no = ?');
      values.push(dto.fd_no);
    }
    if (dto.fd_dept_id !== undefined) {
      fields.push('fd_dept_id = ?');
      values.push(dto.fd_dept_id);
    }
    if (dto.fd_email !== undefined) {
      fields.push('fd_email = ?');
      values.push(dto.fd_email);
    }
    if (dto.fd_mobile !== undefined) {
      fields.push('fd_mobile = ?');
      values.push(dto.fd_mobile);
    }
    if (dto.fd_office_phone !== undefined) {
      fields.push('fd_office_phone = ?');
      values.push(dto.fd_office_phone);
    }
    if (dto.fd_password !== undefined) {
      fields.push('fd_password = ?');
      values.push(this.hashPassword(dto.fd_password));
    }
    if (dto.fd_default_language !== undefined) {
      fields.push('fd_default_language = ?');
      values.push(dto.fd_default_language);
    }
    if (dto.fd_keyword !== undefined) {
      fields.push('fd_keyword = ?');
      values.push(dto.fd_keyword);
    }
    if (dto.fd_order !== undefined) {
      fields.push('fd_order = ?');
      values.push(dto.fd_order);
    }
    if (dto.fd_position !== undefined) {
      fields.push('fd_position = ?');
      values.push(dto.fd_position);
    }
    if (dto.fd_post_id !== undefined) {
      fields.push('fd_post_id = ?');
      values.push(dto.fd_post_id);
    }
    if (dto.fd_rtx_account !== undefined) {
      fields.push('fd_rtx_account = ?');
      values.push(dto.fd_rtx_account);
    }
    if (dto.fd_dynamic_password !== undefined) {
      fields.push('fd_dynamic_password = ?');
      values.push(dto.fd_dynamic_password);
    }
    if (dto.fd_gender !== undefined) {
      fields.push('fd_gender = ?');
      values.push(dto.fd_gender);
    }
    if (dto.fd_wechat !== undefined) {
      fields.push('fd_wechat = ?');
      values.push(dto.fd_wechat);
    }
    if (dto.fd_short_no !== undefined) {
      fields.push('fd_short_no = ?');
      values.push(dto.fd_short_no);
    }
    if (dto.fd_double_validation !== undefined) {
      fields.push('fd_double_validation = ?');
      values.push(dto.fd_double_validation);
    }
    if (dto.fd_is_business_related !== undefined) {
      fields.push('fd_is_business_related = ?');
      values.push(dto.fd_is_business_related);
    }
    if (dto.fd_is_login_enabled !== undefined) {
      fields.push('fd_is_login_enabled = ?');
      values.push(dto.fd_is_login_enabled);
    }
    if (dto.fd_memo !== undefined) {
      fields.push('fd_memo = ?');
      values.push(dto.fd_memo);
    }
    if (dto.fd_staffing_level_id !== undefined) {
      fields.push('fd_staffing_level_id = ?');
      values.push(dto.fd_staffing_level_id);
    }
    if (dto.fd_user_type !== undefined) {
      fields.push('fd_user_type = ?');
      values.push(dto.fd_user_type);
    }
    if (dto.fd_person_to_more_dept !== undefined) {
      fields.push('fd_person_to_more_dept = ?');
      values.push(dto.fd_person_to_more_dept);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push('fd_alter_time = ?');
    values.push(new Date());

    const sql = `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE fd_id = ?`;
    values.push(id);

    await dbManager.execute(sql, values);

    // 处理岗位关联变更
    if (dto.fd_post_ids !== undefined) {
      // 删除旧关联
      await dbManager.execute(
        `DELETE FROM ${this.postPersonTableName} WHERE fd_person_id = ?`,
        [id]
      );

      // 添加新关联
      for (const postId of dto.fd_post_ids) {
        if (postId) {
          await this.addPostPersonRelation(postId, id);
        }
      }
    }
  }

  /**
   * 删除人员
   */
  async delete(id: string): Promise<void> {
    const person = await this.findById(id);
    if (!person) return;

    const sql = `DELETE FROM ${this.tableName} WHERE fd_id = ?`;
    await dbManager.execute(sql, [id]);

    // 更新部门人员数量
    if (person.fd_dept_id) {
      await orgElementRepository.decrementPersonCount(person.fd_dept_id);
    }
  }

  /**
   * 根据ID查询
   */
  async findById(id: string): Promise<OrgPerson | null> {
    const sql = `
      SELECT
        p.*,
        dept.fd_name as fd_dept_name,
        post.fd_name as fd_post_name,
        creator.fd_name as fd_creator_name,
        level.fd_name as fd_staffing_level_name
      FROM ${this.tableName} p
      LEFT JOIN sys_org_element dept ON p.fd_dept_id = dept.fd_id
      LEFT JOIN sys_org_element post ON p.fd_post_id = post.fd_id
      LEFT JOIN sys_org_person creator ON p.fd_creator_id = creator.fd_id
      LEFT JOIN sys_org_staffing_level level ON p.fd_staffing_level_id = level.fd_id
      WHERE p.fd_id = ?
    `;

    const rows = await dbManager.query(sql, [id]);
    if (rows.length === 0) return null;

    const person = this.mapRowToEntity(rows[0]);

    // 查询所有岗位（一人多岗）
    const postSql = `
      SELECT post.fd_id, post.fd_name
      FROM ${this.postPersonTableName} pp
      JOIN sys_org_element post ON pp.fd_post_id = post.fd_id
      WHERE pp.fd_person_id = ?
    `;
    const postRows = await dbManager.query(postSql, [id]);
    person.post_ids = postRows.map(row => row.fd_id);
    person.post_names = postRows.map(row => row.fd_name);

    return person;
  }

  /**
   * 根据登录名查询
   */
  async findByLoginName(loginName: string): Promise<OrgPerson | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE fd_login_name = ?`;
    const rows = await dbManager.query(sql, [loginName]);
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  /**
   * 查询人员列表
   */
  async findList(query: PersonQuery = {}): Promise<PageResult<OrgPerson>> {
    const conditions: string[] = ['1=1'];
    const values: any[] = [];

    if (query.fd_dept_id !== undefined) {
      conditions.push('p.fd_dept_id = ?');
      values.push(query.fd_dept_id);
    }

    if (query.fd_post_id !== undefined) {
      conditions.push('p.fd_post_id = ?');
      values.push(query.fd_post_id);
    }

    if (query.fd_is_login_enabled !== undefined) {
      conditions.push('p.fd_is_login_enabled = ?');
      values.push(query.fd_is_login_enabled);
    }

    if (query.fd_is_business_related !== undefined) {
      conditions.push('p.fd_is_business_related = ?');
      values.push(query.fd_is_business_related);
    }

    if (query.fd_user_type !== undefined) {
      conditions.push('p.fd_user_type = ?');
      values.push(query.fd_user_type);
    }

    if (query.keyword) {
      conditions.push('(p.fd_name LIKE ? OR p.fd_login_name LIKE ? OR p.fd_no LIKE ? OR p.fd_keyword LIKE ?)');
      const keyword = `%${query.keyword}%`;
      values.push(keyword, keyword, keyword, keyword);
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} p WHERE ${conditions.join(' AND ')}`;
    const countResult = await dbManager.query(countSql, values);
    const total = countResult[0].total;

    // 查询数据
    const dataSql = `
      SELECT
        p.*,
        dept.fd_name as fd_dept_name,
        post.fd_name as fd_post_name,
        creator.fd_name as fd_creator_name,
        level.fd_name as fd_staffing_level_name
      FROM ${this.tableName} p
      LEFT JOIN sys_org_element dept ON p.fd_dept_id = dept.fd_id
      LEFT JOIN sys_org_element post ON p.fd_post_id = post.fd_id
      LEFT JOIN sys_org_person creator ON p.fd_creator_id = creator.fd_id
      LEFT JOIN sys_org_staffing_level level ON p.fd_staffing_level_id = level.fd_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.fd_order ASC, p.fd_create_time DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await dbManager.query(dataSql, [...values, pageSize, offset]);
    const data = rows.map(row => this.mapRowToEntity(row));

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 添加岗位人员关联
   */
  private async addPostPersonRelation(postId: string, personId: string): Promise<void> {
    const sql = `
      INSERT INTO ${this.postPersonTableName} (fd_id, fd_post_id, fd_person_id, fd_create_time)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE fd_create_time = NOW()
    `;

    await dbManager.execute(sql, [crypto.randomUUID(), postId, personId]);
  }

  /**
   * 删除岗位人员关联
   */
  private async removePostPersonRelation(postId: string, personId: string): Promise<void> {
    const sql = `DELETE FROM ${this.postPersonTableName} WHERE fd_post_id = ? AND fd_person_id = ?`;
    await dbManager.execute(sql, [postId, personId]);
  }

  /**
   * 密码加密（简单实现）
   */
  private hashPassword(password: string): string {
    // 实际项目应使用 bcrypt 或其他安全的哈希算法
    return Buffer.from(password).toString('base64');
  }

  /**
   * 将数据库行映射为实体
   */
  private mapRowToEntity(row: any): OrgPerson {
    return {
      fd_id: row.fd_id,
      fd_name: row.fd_name,
      fd_nickname: row.fd_nickname,
      fd_no: row.fd_no,
      fd_dept_id: row.fd_dept_id,
      fd_dept_name: row.fd_dept_name,
      fd_email: row.fd_email,
      fd_mobile: row.fd_mobile,
      fd_office_phone: row.fd_office_phone,
      fd_login_name: row.fd_login_name,
      fd_password: row.fd_password,
      fd_default_language: row.fd_default_language,
      fd_keyword: row.fd_keyword,
      fd_order: row.fd_order,
      fd_position: row.fd_position,
      fd_post_id: row.fd_post_id,
      fd_post_name: row.fd_post_name,
      fd_rtx_account: row.fd_rtx_account,
      fd_dynamic_password: row.fd_dynamic_password,
      fd_gender: row.fd_gender,
      fd_wechat: row.fd_wechat,
      fd_short_no: row.fd_short_no,
      fd_double_validation: !!row.fd_double_validation,
      fd_is_business_related: !!row.fd_is_business_related,
      fd_is_login_enabled: !!row.fd_is_login_enabled,
      fd_memo: row.fd_memo,
      fd_create_time: new Date(row.fd_create_time),
      fd_alter_time: new Date(row.fd_alter_time),
      fd_creator_id: row.fd_creator_id,
      fd_creator_name: row.fd_creator_name,
      fd_lock_time: row.fd_lock_time ? new Date(row.fd_lock_time) : null,
      fd_staffing_level_id: row.fd_staffing_level_id,
      fd_staffing_level_name: row.fd_staffing_level_name,
      fd_user_type: row.fd_user_type,
      fd_person_to_more_dept: row.fd_person_to_more_dept,
      post_ids: [],
      post_names: []
    };
  }
}

// 导出单例
export const orgPersonRepository = new OrgPersonRepository();
