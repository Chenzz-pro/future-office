/**
 * 组织架构管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

export async function POST(request: NextRequest) {
  try {
    const { action, type, data, id } = await request.json();

    if (!action) {
      return NextResponse.json({ success: false, error: '缺少操作类型' }, { status: 400 });
    }

    switch (action) {
      case 'create':
        return await createOrgElement(type, data);
      case 'update':
        return await updateOrgElement(type, id, data);
      case 'delete':
        return await deleteOrgElement(type, id);
      default:
        return NextResponse.json({ success: false, error: '无效的操作类型' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('组织架构操作错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'tree') {
      const type = searchParams.get('type');
      return await getTreeData(type ? parseInt(type) : 1);
    }

    if (action === 'list') {
      const type = searchParams.get('type');
      const parentId = searchParams.get('parentId');
      const keyword = searchParams.get('keyword');
      return await getOrgList(type || 'department', parentId || '', keyword || '');
    }

    return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
  } catch (error: unknown) {
    console.error('获取组织数据错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

// 创建组织元素
async function createOrgElement(type: string, data: Record<string, unknown>) {
  const id = crypto.randomUUID();

  let tableName = 'sys_org_element';
  let orgType = 1;

  if (type === 'organization') {
    orgType = 1;
  } else if (type === 'department') {
    orgType = 2;
  } else if (type === 'position') {
    orgType = 3;
  } else if (type === 'person') {
    tableName = 'sys_org_person';
  }

  if (type === 'person') {
    // 创建人员
    await dbManager.query(
      `INSERT INTO sys_org_person (
        fd_id, fd_name, fd_no, fd_email, fd_mobile, fd_login_name, fd_memo, fd_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.fd_name,
        data.fd_no || '',
        data.fd_email || '',
        data.fd_mobile || '',
        data.fd_login_name,
        data.fd_memo || '',
        data.fd_order || 0,
      ]
    );
  } else {
    // 创建组织元素
    await dbManager.query(
      `INSERT INTO sys_org_element (
        fd_id, fd_org_type, fd_name, fd_no, fd_order, fd_org_email, fd_memo, fd_parentid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        orgType,
        data.fd_name,
        data.fd_no || '',
        data.fd_order || 0,
        data.fd_email || '',
        data.fd_memo || '',
        data.fd_parentid || null,
      ]
    );
  }

  return NextResponse.json({ success: true, data: { id } });
}

// 更新组织元素
async function updateOrgElement(type: string, id: string, data: Record<string, unknown>) {
  let tableName = 'sys_org_element';

  if (type === 'person') {
    tableName = 'sys_org_person';
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  // 构建更新字段
  if (data.fd_name !== undefined) {
    fields.push('fd_name = ?');
    values.push(data.fd_name);
  }
  if (data.fd_no !== undefined) {
    fields.push('fd_no = ?');
    values.push(data.fd_no);
  }
  if (data.fd_order !== undefined) {
    fields.push('fd_order = ?');
    values.push(data.fd_order);
  }
  if (data.fd_email !== undefined) {
    const emailField = type === 'person' ? 'fd_email' : 'fd_org_email';
    fields.push(`${emailField} = ?`);
    values.push(data.fd_email);
  }
  if (data.fd_memo !== undefined) {
    fields.push('fd_memo = ?');
    values.push(data.fd_memo);
  }
  if (type === 'person' && data.fd_mobile !== undefined) {
    fields.push('fd_mobile = ?');
    values.push(data.fd_mobile);
  }
  if (type === 'person' && data.fd_login_name !== undefined) {
    fields.push('fd_login_name = ?');
    values.push(data.fd_login_name);
  }

  if (fields.length === 0) {
    return NextResponse.json({ success: false, error: '没有要更新的字段' }, { status: 400 });
  }

  values.push(id);

  await dbManager.query(
    `UPDATE ${tableName} SET ${fields.join(', ')} WHERE fd_id = ?`,
    values
  );

  return NextResponse.json({ success: true });
}

// 删除组织元素
async function deleteOrgElement(type: string, id: string) {
  let tableName = 'sys_org_element';

  if (type === 'person') {
    tableName = 'sys_org_person';
  }

  await dbManager.query(`DELETE FROM ${tableName} WHERE fd_id = ?`, [id]);

  return NextResponse.json({ success: true });
}

// 获取树形数据
async function getTreeData(type: number) {
  let query = `
    SELECT fd_id, fd_org_type, fd_name, fd_parentid, fd_parentorgid
    FROM sys_org_element
    WHERE fd_is_available = 1 AND fd_is_abandon = 0
  `;

  const params: unknown[] = [];

  if (type) {
    query += ' AND fd_org_type = ?';
    params.push(type);
  }

  query += ' ORDER BY fd_order ASC, fd_create_time ASC';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await dbManager.query<any>(query, params);

  // 构建树形结构
  const treeData = buildTree(result.rows, type);

  return NextResponse.json({ success: true, data: treeData });
}

// 构建树形结构
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTree(flatData: any[], rootType?: number): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roots: any[] = [];

  // 创建所有节点的映射
  flatData.forEach((item) => {
    map.set(item.fd_id, {
      id: item.fd_id,
      name: item.fd_name,
      type: item.fd_org_type,
      parentId: item.fd_parentid || item.fd_parentorgid,
      children: [],
      personCount: 0,
    });
  });

  // 构建树形结构
  flatData.forEach((item) => {
    const node = map.get(item.fd_id);
    const parentId = item.fd_parentid || item.fd_parentorgid;

    if (parentId && map.has(parentId)) {
      const parent = map.get(parentId);
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// 获取组织列表
async function getOrgList(type: string, parentId: string, keyword: string) {
  let tableName = 'sys_org_element';
  let query = '';
  const params: unknown[] = [];

  if (type === 'person') {
    tableName = 'sys_org_person';
    query = `
      SELECT fd_id, fd_name, fd_no, fd_email as fd_org_email, fd_mobile, fd_login_name, fd_order
      FROM sys_org_person
      WHERE 1=1
    `;

    if (keyword) {
      query += ' AND (fd_name LIKE ? OR fd_no LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (parentId) {
      query += ' AND fd_dept_id = ?';
      params.push(parentId);
    }
  } else {
    const orgType = type === 'organization' ? 1 : type === 'department' ? 2 : 3;
    query = `
      SELECT fd_id, fd_org_type, fd_name, fd_no, fd_org_email, fd_order
      FROM sys_org_element
      WHERE fd_org_type = ?
    `;
    params.push(orgType);

    if (keyword) {
      query += ' AND (fd_name LIKE ? OR fd_no LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (parentId) {
      query += ' AND fd_parentid = ?';
      params.push(parentId);
    }
  }

  query += ' ORDER BY fd_order ASC, fd_create_time ASC';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await dbManager.query<any>(query, params);

  return NextResponse.json({ success: true, data: result.rows });
}
