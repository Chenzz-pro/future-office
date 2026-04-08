/**
 * 组织架构同步 API
 * 支持从EKP系统同步组织架构数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { EKPRestClient, OrgTreeNode, PersonInfo } from '@/lib/ekp-rest-client';
import { hashPassword, generateRandomPassword } from '@/lib/password/password-utils';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    
    if (source !== 'ekp') {
      return NextResponse.json({ 
        success: false, 
        error: '不支持的同步来源' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { type = 'full', scope = ['organizations', 'departments', 'persons'] } = body;

    console.log('[API:Organization/Sync] 开始同步', { type, scope });

    // 创建 EKP 客户端
    const client = await createEKPClient();
    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: 'EKP 未配置或连接失败，请先在"EKP集成"页面配置连接信息' 
      }, { status: 400 });
    }

    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      organizations: { total: 0, success: 0, failed: 0 },
      departments: { total: 0, success: 0, failed: 0 },
      persons: { total: 0, success: 0, failed: 0 },
    };

    // 同步机构
    if (scope.includes('organizations')) {
      const orgResult = await syncOrganizations(client, type);
      stats.organizations = orgResult;
      stats.total += orgResult.total;
      stats.success += orgResult.success;
      stats.failed += orgResult.failed;
    }

    // 同步部门
    if (scope.includes('departments')) {
      const deptResult = await syncDepartments(client, type);
      stats.departments = deptResult;
      stats.total += deptResult.total;
      stats.success += deptResult.success;
      stats.failed += deptResult.failed;
    }

    // 同步人员
    if (scope.includes('persons')) {
      const personResult = await syncPersons(client, type);
      stats.persons = personResult;
      stats.total += personResult.total;
      stats.success += personResult.success;
      stats.failed += personResult.failed;
    }

    console.log('[API:Organization/Sync] 同步完成', stats);

    return NextResponse.json({
      success: true,
      message: `同步完成：成功 ${stats.success} 条，失败 ${stats.failed} 条`,
      stats,
    });

  } catch (error: unknown) {
    console.error('[API:Organization/Sync] 同步失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '同步失败',
    }, { status: 500 });
  }
}

/**
 * 创建 EKP 客户端
 */
async function createEKPClient(): Promise<EKPRestClient | null> {
  try {
    // 从数据库加载 EKP 配置
    const configs = await dbManager.query(`
      SELECT ekp_address, username, password, config
      FROM ekp_configs
      WHERE user_id = '00000000-0000-0000-0000-000000000000'
      LIMIT 1
    `);

    if (configs.rows.length === 0) {
      console.warn('[Sync] 未找到 EKP 配置');
      return null;
    }

    const row = configs.rows[0] as any;
    const configJson = typeof row.config === 'string' ? JSON.parse(row.config) : (row.config || {});

    return new EKPRestClient({
      baseUrl: row.ekp_address,
      username: row.username,
      password: row.password,
      apiPath: configJson.apiPath || configJson.api_path || '/api/sys-notify/sysNotifyTodoRestService',
      serviceId: configJson.serviceId || 'default',
      enabled: true,
    });
  } catch (error) {
    console.error('[Sync] 创建 EKP 客户端失败:', error);
    return null;
  }
}

/**
 * 递归获取组织树
 */
async function fetchOrgTree(client: EKPRestClient, parentId?: string): Promise<OrgTreeNode[]> {
  try {
    const result = await client.getOrgTree(parentId);
    if (!result.success || !result.data) {
      return [];
    }
    return result.data;
  } catch (error) {
    console.error('[Sync] 获取组织树失败:', error);
    return [];
  }
}

/**
 * 同步机构
 */
async function syncOrganizations(client: EKPRestClient, type: string): Promise<{ total: number; success: number; failed: number }> {
  let total = 0, success = 0, failed = 0;
  
  try {
    // 获取组织树
    const treeData = await fetchOrgTree(client);
    
    // 筛选机构（type=1）
    const organizations = treeData.filter(node => {
      const nodeType = node.fdOrgType || node.type;
      return nodeType === 1;
    });

    total = organizations.length;

    for (const org of organizations) {
      try {
        const id = org.fdId || org.id;
        const name = org.fdName || org.name || '';
        const hierarchyId = org.fdHierarchyId || '';

        // 检查是否已存在
        const existing = await dbManager.query(
          'SELECT fd_id FROM sys_org_element WHERE fd_id = ?',
          [id]
        );

        if (existing.rows.length > 0) {
          // 更新
          await dbManager.query(`
            UPDATE sys_org_element SET 
              fd_name = ?, fd_no = ?, fd_order = ?, fd_hierarchy_id = ?
            WHERE fd_id = ?
          `, [
            name,
            org.fdNo || '',
            org.fdOrder || 0,
            hierarchyId,
            id,
          ]);
        } else {
          // 插入
          await dbManager.query(`
            INSERT INTO sys_org_element (fd_id, fd_org_type, fd_name, fd_no, fd_order, fd_parentorgid, fd_hierarchy_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            id,
            1, // 机构类型
            name,
            org.fdNo || '',
            org.fdOrder || 0,
            null, // 机构没有父级
            hierarchyId,
          ]);
        }
        success++;
      } catch (err) {
        console.error('[Sync] 同步机构失败:', org, err);
        failed++;
      }
    }

    console.log(`[Sync] 机构同步完成: 总计${total}, 成功${success}, 失败${failed}`);
  } catch (error) {
    console.error('[Sync] 同步机构失败:', error);
  }

  return { total, success, failed };
}

/**
 * 同步部门
 */
async function syncDepartments(client: EKPRestClient, type: string): Promise<{ total: number; success: number; failed: number }> {
  let total = 0, success = 0, failed = 0;
  
  try {
    // 获取组织树
    const treeData = await fetchOrgTree(client);
    
    // 筛选部门（type=2）
    const departments = treeData.filter(node => {
      const nodeType = node.fdOrgType || node.type;
      return nodeType === 2;
    });

    total = departments.length;

    for (const dept of departments) {
      try {
        const id = dept.fdId || dept.id;
        const name = dept.fdName || dept.name || '';
        const hierarchyId = dept.fdHierarchyId || '';
        
        // 从层级路径解析父级ID
        // 格式: x{id1}x{id2}x...，取倒数第二个作为父级
        let parentId: string | null = null;
        if (hierarchyId) {
          const parts = hierarchyId.split('x').filter(Boolean);
          if (parts.length >= 2) {
            parentId = parts[parts.length - 2];
          }
        }

        // 检查是否已存在
        const existing = await dbManager.query(
          'SELECT fd_id FROM sys_org_element WHERE fd_id = ?',
          [id]
        );

        if (existing.rows.length > 0) {
          // 更新
          await dbManager.query(`
            UPDATE sys_org_element SET 
              fd_name = ?, fd_no = ?, fd_order = ?, fd_hierarchy_id = ?, fd_parentorgid = ?
            WHERE fd_id = ?
          `, [
            name,
            dept.fdNo || '',
            dept.fdOrder || 0,
            hierarchyId,
            parentId,
            id,
          ]);
        } else {
          // 插入
          await dbManager.query(`
            INSERT INTO sys_org_element (fd_id, fd_org_type, fd_name, fd_no, fd_order, fd_parentorgid, fd_hierarchy_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            id,
            2, // 部门类型
            name,
            dept.fdNo || '',
            dept.fdOrder || 0,
            parentId,
            hierarchyId,
          ]);
        }
        success++;
      } catch (err) {
        console.error('[Sync] 同步部门失败:', dept, err);
        failed++;
      }
    }

    console.log(`[Sync] 部门同步完成: 总计${total}, 成功${success}, 失败${failed}`);
  } catch (error) {
    console.error('[Sync] 同步部门失败:', error);
  }

  return { total, success, failed };
}

/**
 * 同步人员
 */
async function syncPersons(client: EKPRestClient, type: string): Promise<{ total: number; success: number; failed: number }> {
  let total = 0, success = 0, failed = 0;
  
  try {
    // 分页获取人员列表
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await client.getPersonList(undefined, page, pageSize);
      
      if (!result.success || !result.data) {
        console.log('[Sync] 获取人员列表失败:', result.msg);
        break;
      }

      const { count, persons } = result.data;
      total = count;

      for (const person of persons) {
        try {
          const id = person.fdId || person.fdLoginName;
          if (!id) continue;

          // 从层级路径解析所属部门ID
          const hierarchyId = person.fdHierarchyId || '';
          let deptId: string | null = null;
          if (hierarchyId) {
            const parts = hierarchyId.split('x').filter(Boolean);
            if (parts.length >= 1) {
              deptId = parts[parts.length - 1];
            }
          }

          // 检查是否已存在
          const existing = await dbManager.query(
            'SELECT fd_id FROM sys_org_person WHERE fd_id = ?',
            [id]
          );

          if (existing.rows.length > 0) {
            // 更新
            await dbManager.query(`
              UPDATE sys_org_person SET 
                fd_name = ?, fd_no = ?, fd_email = ?, fd_mobile = ?, 
                fd_dept_id = ?, fd_rtx_account = ?, fd_hierarchy_id = ?
              WHERE fd_id = ?
            `, [
              person.fdName || person.name || '',
              person.fdNo || '',
              person.fdEmail || '',
              person.fdMobile || '',
              deptId,
              person.fdRtxAccount || null,
              hierarchyId,
              id,
            ]);
          } else {
            // 生成随机密码
            const password = generateRandomPassword(12, {
              includeNumbers: true,
              includeSpecialChars: false,
              includeUppercase: true,
            });
            const hashedPassword = await hashPassword(password);

            // 插入
            await dbManager.query(`
              INSERT INTO sys_org_person (
                fd_id, fd_name, fd_no, fd_login_name, fd_email, fd_mobile, 
                fd_dept_id, fd_rtx_account, fd_hierarchy_id, fd_password, fd_is_login_enabled, fd_role
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              id,
              person.fdName || person.name || '',
              person.fdNo || '',
              person.fdLoginName || id,
              person.fdEmail || '',
              person.fdMobile || '',
              deptId,
              person.fdRtxAccount || null,
              hierarchyId,
              hashedPassword,
              1, // fd_is_login_enabled
              'user', // 默认角色
            ]);
          }
          success++;
        } catch (err) {
          console.error('[Sync] 同步人员失败:', person, err);
          failed++;
        }
      }

      // 判断是否还有更多数据
      hasMore = persons.length === pageSize && (page * pageSize) < count;
      page++;
    }

    console.log(`[Sync] 人员同步完成: 总计${total}, 成功${success}, 失败${failed}`);
  } catch (error) {
    console.error('[Sync] 同步人员失败:', error);
  }

  return { total, success, failed };
}
