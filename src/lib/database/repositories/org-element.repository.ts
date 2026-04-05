/**
 * 组织元素（机构/部门/岗位）Repository
 * 统一管理机构、部门、岗位的数据访问
 */

import { dbManager } from './manager';
import {
  OrgElement,
  OrgElementDTO,
  OrgElementType,
  OrgTreeNode,
  OrgElementQuery,
  PageResult
} from '@/types/org-structure';

export class OrgElementRepository {
  private tableName = 'sys_org_element';

  /**
   * 创建组织元素
   */
  async create(dto: OrgElementDTO): Promise<string> {
    const id = dto.fd_id || crypto.randomUUID();
    const now = new Date();

    const sql = `
      INSERT INTO ${this.tableName} (
        fd_id,
        fd_org_type,
        fd_name,
        fd_order,
        fd_no,
        fd_keyword,
        fd_is_available,
        fd_is_business,
        fd_import_info,
        fd_org_email,
        fd_memo,
        fd_is_external,
        fd_this_leaderid,
        fd_super_leaderid,
        fd_parentorgid,
        fd_parentid,
        fd_creator_id,
        fd_create_time,
        fd_alter_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbManager.execute(sql, [
      id,
      dto.fd_org_type,
      dto.fd_name,
      dto.fd_order ?? 0,
      dto.fd_no || null,
      dto.fd_keyword || null,
      dto.fd_is_available ?? 1,
      dto.fd_is_business ?? 0,
      dto.fd_import_info || null,
      dto.fd_org_email || null,
      dto.fd_memo || null,
      dto.fd_is_external ?? 0,
      dto.fd_this_leaderid || null,
      dto.fd_super_leaderid || null,
      dto.fd_parentorgid || null,
      dto.fd_parentid || null,
      dto.fd_creator_id || null,
      now,
      now
    ]);

    // 更新层级ID
    await this.updateHierarchyId(id);

    // 更新父级人员数量
    if (dto.fd_parentid) {
      await this.incrementPersonCount(dto.fd_parentid);
    }
    if (dto.fd_parentorgid) {
      await this.incrementPersonCount(dto.fd_parentorgid);
    }

    return id;
  }

  /**
   * 更新组织元素
   */
  async update(id: string, dto: Partial<OrgElementDTO>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (dto.fd_name !== undefined) {
      fields.push('fd_name = ?');
      values.push(dto.fd_name);
    }
    if (dto.fd_order !== undefined) {
      fields.push('fd_order = ?');
      values.push(dto.fd_order);
    }
    if (dto.fd_no !== undefined) {
      fields.push('fd_no = ?');
      values.push(dto.fd_no);
    }
    if (dto.fd_keyword !== undefined) {
      fields.push('fd_keyword = ?');
      values.push(dto.fd_keyword);
    }
    if (dto.fd_is_available !== undefined) {
      fields.push('fd_is_available = ?');
      values.push(dto.fd_is_available);
    }
    if (dto.fd_is_business !== undefined) {
      fields.push('fd_is_business = ?');
      values.push(dto.fd_is_business);
    }
    if (dto.fd_org_email !== undefined) {
      fields.push('fd_org_email = ?');
      values.push(dto.fd_org_email);
    }
    if (dto.fd_memo !== undefined) {
      fields.push('fd_memo = ?');
      values.push(dto.fd_memo);
    }
    if (dto.fd_is_external !== undefined) {
      fields.push('fd_is_external = ?');
      values.push(dto.fd_is_external);
    }
    if (dto.fd_this_leaderid !== undefined) {
      fields.push('fd_this_leaderid = ?');
      values.push(dto.fd_this_leaderid);
    }
    if (dto.fd_super_leaderid !== undefined) {
      fields.push('fd_super_leaderid = ?');
      values.push(dto.fd_super_leaderid);
    }
    if (dto.fd_parentorgid !== undefined) {
      fields.push('fd_parentorgid = ?');
      values.push(dto.fd_parentorgid);
    }
    if (dto.fd_parentid !== undefined) {
      fields.push('fd_parentid = ?');
      values.push(dto.fd_parentid);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push('fd_alter_time = ?');
    values.push(new Date());

    const sql = `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE fd_id = ?`;
    values.push(id);

    await dbManager.execute(sql, values);

    // 更新层级ID
    await this.updateHierarchyId(id);
  }

  /**
   * 删除组织元素
   */
  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM ${this.tableName} WHERE fd_id = ?`;
    await dbManager.execute(sql, [id]);
  }

  /**
   * 根据ID查询
   */
  async findById(id: string): Promise<OrgElement | null> {
    const sql = `
      SELECT
        e.*,
        leader1.fd_name as fd_this_leader_name,
        leader2.fd_name as fd_super_leader_name,
        parentorg.fd_name as fd_parentorg_name,
        parent.fd_name as fd_parent_name,
        creator.fd_name as fd_creator_name
      FROM ${this.tableName} e
      LEFT JOIN sys_org_person leader1 ON e.fd_this_leaderid = leader1.fd_id
      LEFT JOIN sys_org_person leader2 ON e.fd_super_leaderid = leader2.fd_id
      LEFT JOIN ${this.tableName} parentorg ON e.fd_parentorgid = parentorg.fd_id
      LEFT JOIN ${this.tableName} parent ON e.fd_parentid = parent.fd_id
      LEFT JOIN sys_org_person creator ON e.fd_creator_id = creator.fd_id
      WHERE e.fd_id = ?
    `;

    const rows = await dbManager.query(sql, [id]);
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  /**
   * 查询组织元素列表
   */
  async findList(query: OrgElementQuery = {}): Promise<OrgElement[]> {
    const conditions: string[] = ['1=1'];
    const values: any[] = [];

    if (query.fd_org_type !== undefined) {
      conditions.push('e.fd_org_type = ?');
      values.push(query.fd_org_type);
    }

    if (query.fd_parentid !== undefined) {
      conditions.push('e.fd_parentid = ?');
      values.push(query.fd_parentid);
    }

    if (query.fd_parentorgid !== undefined) {
      conditions.push('e.fd_parentorgid = ?');
      values.push(query.fd_parentorgid);
    }

    if (query.fd_is_available !== undefined) {
      conditions.push('e.fd_is_available = ?');
      values.push(query.fd_is_available);
    }

    if (query.fd_is_business !== undefined) {
      conditions.push('e.fd_is_business = ?');
      values.push(query.fd_is_business);
    }

    if (query.keyword) {
      conditions.push('(e.fd_name LIKE ? OR e.fd_no LIKE ? OR e.fd_keyword LIKE ?)');
      const keyword = `%${query.keyword}%`;
      values.push(keyword, keyword, keyword);
    }

    const sql = `
      SELECT
        e.*,
        leader1.fd_name as fd_this_leader_name,
        leader2.fd_name as fd_super_leader_name,
        parentorg.fd_name as fd_parentorg_name,
        parent.fd_name as fd_parent_name,
        creator.fd_name as fd_creator_name
      FROM ${this.tableName} e
      LEFT JOIN sys_org_person leader1 ON e.fd_this_leaderid = leader1.fd_id
      LEFT JOIN sys_org_person leader2 ON e.fd_super_leaderid = leader2.fd_id
      LEFT JOIN ${this.tableName} parentorg ON e.fd_parentorgid = parentorg.fd_id
      LEFT JOIN ${this.tableName} parent ON e.fd_parentid = parent.fd_id
      LEFT JOIN sys_org_person creator ON e.fd_creator_id = creator.fd_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.fd_order ASC, e.fd_create_time ASC
    `;

    const rows = await dbManager.query(sql, values);
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * 获取组织架构树
   */
  async getTree(orgType?: OrgElementType, rootId?: string): Promise<OrgTreeNode[]> {
    const conditions: string[] = ['1=1'];
    const values: any[] = [];

    if (orgType !== undefined) {
      conditions.push('fd_org_type = ?');
      values.push(orgType);
    }

    if (rootId) {
      conditions.push('fd_id = ?');
      values.push(rootId);
    } else {
      // 默认查询根节点（机构）
      if (orgType === undefined) {
        conditions.push('fd_org_type = 1');
      }
    }

    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${conditions.join(' AND ')}
      ORDER BY fd_order ASC, fd_create_time ASC
    `;

    const rows = await dbManager.query(sql, values);

    // 构建树形结构
    const buildTree = (parentId: string | null = null): OrgTreeNode[] => {
      const nodes: OrgTreeNode[] = [];

      for (const row of rows) {
        if (
          (parentId === null && row.fd_parentid === null && row.fd_parentorgid === null) ||
          row.fd_parentid === parentId ||
          row.fd_parentorgid === parentId
        ) {
          const node = this.mapRowToTreeNode(row);
          node.children = buildTree(row.fd_id);
          node.personCount = node.children.reduce((sum, child) => sum + child.personsNumber, 0) + row.fd_persons_number;
          nodes.push(node);
        }
      }

      return nodes;
    };

    return buildTree();
  }

  /**
   * 更新层级ID
   */
  private async updateHierarchyId(id: string): Promise<void> {
    const element = await this.findById(id);
    if (!element) return;

    // 构建层级路径
    const hierarchyIds: string[] = [id];

    let currentId = element.fd_parentid || element.fd_parentorgid;
    while (currentId) {
      hierarchyIds.unshift(currentId);
      const parent = await this.findById(currentId);
      currentId = parent?.fd_parentid || parent?.fd_parentorgid;
    }

    const hierarchyId = '/' + hierarchyIds.join('/');

    const sql = `UPDATE ${this.tableName} SET fd_hierarchy_id = ? WHERE fd_id = ?`;
    await dbManager.execute(sql, [hierarchyId, id]);
  }

  /**
   * 增加人员数量
   */
  private async incrementPersonCount(id: string): Promise<void> {
    const sql = `UPDATE ${this.tableName} SET fd_persons_number = fd_persons_number + 1 WHERE fd_id = ?`;
    await dbManager.execute(sql, [id]);
  }

  /**
   * 减少人员数量
   */
  private async decrementPersonCount(id: string): Promise<void> {
    const sql = `UPDATE ${this.tableName} SET fd_persons_number = GREATEST(0, fd_persons_number - 1) WHERE fd_id = ?`;
    await dbManager.execute(sql, [id]);
  }

  /**
   * 将数据库行映射为实体
   */
  private mapRowToEntity(row: any): OrgElement {
    return {
      fd_id: row.fd_id,
      fd_org_type: row.fd_org_type,
      fd_name: row.fd_name,
      fd_order: row.fd_order,
      fd_no: row.fd_no,
      fd_keyword: row.fd_keyword,
      fd_is_available: !!row.fd_is_available,
      fd_is_business: !!row.fd_is_business,
      fd_import_info: row.fd_import_info,
      fd_org_email: row.fd_org_email,
      fd_persons_number: row.fd_persons_number,
      fd_memo: row.fd_memo,
      fd_hierarchy_id: row.fd_hierarchy_id,
      fd_create_time: new Date(row.fd_create_time),
      fd_alter_time: new Date(row.fd_alter_time),
      fd_is_external: !!row.fd_is_external,
      fd_this_leaderid: row.fd_this_leaderid,
      fd_this_leader_name: row.fd_this_leader_name,
      fd_super_leaderid: row.fd_super_leaderid,
      fd_super_leader_name: row.fd_super_leader_name,
      fd_parentorgid: row.fd_parentorgid,
      fd_parentorg_name: row.fd_parentorg_name,
      fd_parentid: row.fd_parentid,
      fd_parent_name: row.fd_parent_name,
      fd_name_pinyin: row.fd_name_pinyin,
      fd_name_simple_pinyin: row.fd_name_simple_pinyin,
      fd_is_abandon: !!row.fd_is_abandon,
      fd_flag_deleted: row.fd_flag_deleted,
      fd_ldap_dn: row.fd_ldap_dn,
      fd_pre_dept_id: row.fd_pre_dept_id,
      fd_pre_post_ids: row.fd_pre_post_ids,
      fd_creator_id: row.fd_creator_id,
      fd_creator_name: row.fd_creator_name
    };
  }

  /**
   * 将数据库行映射为树节点
   */
  private mapRowToTreeNode(row: any): OrgTreeNode {
    return {
      id: row.fd_id,
      name: row.fd_name,
      type: row.fd_org_type,
      typeLabel: row.fd_org_type === 1 ? '机构' : row.fd_org_type === 2 ? '部门' : '岗位',
      order: row.fd_order,
      no: row.fd_no,
      isAvailable: !!row.fd_is_available,
      isBusiness: !!row.fd_is_business,
      email: row.fd_org_email,
      personsNumber: row.fd_persons_number,
      memo: row.fd_memo,
      hierarchyId: row.fd_hierarchy_id,
      createTime: new Date(row.fd_create_time),
      isExternal: !!row.fd_is_external,
      thisLeaderId: row.fd_this_leaderid,
      thisLeaderName: row.fd_this_leader_name,
      superLeaderId: row.fd_super_leaderid,
      superLeaderName: row.fd_super_leader_name,
      parentOrgId: row.fd_parentorgid,
      parentOrgName: row.fd_parentorg_name,
      parentId: row.fd_parentid,
      parentName: row.fd_parent_name,
      creatorId: row.fd_creator_id,
      children: [],
      level: (row.fd_hierarchy_id?.split('/').filter(Boolean).length || 1) - 1
    };
  }
}

// 导出单例
export const orgElementRepository = new OrgElementRepository();
