/**
 * 角色管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT fd_id, fd_name, fd_code, fd_description, fd_order, fd_is_available
      FROM sys_role
      WHERE fd_is_available = 1
      ORDER BY fd_order ASC, fd_create_time ASC
    `;

    const result = await dbManager.query<any>(query);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: unknown) {
    console.error('[API:Role] 获取角色列表失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data, id } = await request.json();

    console.log('[API:Role] 收到请求', { action, data, id });

    if (!action) {
      return NextResponse.json({ success: false, error: '缺少操作类型' }, { status: 400 });
    }

    switch (action) {
      case 'create':
        return await createRole(data);
      case 'update':
        return await updateRole(id, data);
      case 'delete':
        return await deleteRole(id);
      default:
        return NextResponse.json({ success: false, error: '无效的操作类型' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('[API:Role] 操作错误:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

async function createRole(data: Record<string, unknown>) {
  const id = crypto.randomUUID();

  await dbManager.query(
    `INSERT INTO sys_role (fd_id, fd_name, fd_code, fd_description, fd_order, fd_is_available)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.fd_name,
      data.fd_code,
      data.fd_description || null,
      data.fd_order || 0,
      data.fd_is_available ?? 1,
    ]
  );

  console.log('[API:Role] 角色创建成功', { id, code: data.fd_code });

  return NextResponse.json({ success: true, data: { id } });
}

async function updateRole(id: string, data: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.fd_name !== undefined) {
    fields.push('fd_name = ?');
    values.push(data.fd_name);
  }
  if (data.fd_description !== undefined) {
    fields.push('fd_description = ?');
    values.push(data.fd_description);
  }
  if (data.fd_order !== undefined) {
    fields.push('fd_order = ?');
    values.push(data.fd_order);
  }
  if (data.fd_is_available !== undefined) {
    fields.push('fd_is_available = ?');
    values.push(data.fd_is_available);
  }

  if (fields.length === 0) {
    return NextResponse.json({ success: false, error: '没有要更新的字段' }, { status: 400 });
  }

  values.push(id);

  await dbManager.query(
    `UPDATE sys_role SET ${fields.join(', ')} WHERE fd_id = ?`,
    values
  );

  return NextResponse.json({ success: true });
}

async function deleteRole(id: string) {
  // 先检查是否有人员关联到这个角色
  const checkResult = await dbManager.query<any>(
    'SELECT COUNT(*) as count FROM sys_org_person WHERE fd_role = ?',
    [id]
  );

  if (checkResult.rows[0]?.count > 0) {
    return NextResponse.json(
      { success: false, error: '该角色下还有人员，无法删除' },
      { status: 400 }
    );
  }

  await dbManager.query(`DELETE FROM sys_role WHERE fd_id = ?`, [id]);

  return NextResponse.json({ success: true });
}
