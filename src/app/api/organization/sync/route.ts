/**
 * 组织架构同步 API
 * 
 * 使用蓝凌EKP标准同步接口 getUpdatedElements 获取组织架构数据
 * 接口路径：/api/sys-organization/sysSynchroGetOrg/getUpdatedElements
 * 
 * 根据接口文档，该接口支持：
 * 1. 按组织类型过滤（org/dept/post/person等）
 * 2. 分批次获取大量数据
 * 3. 按时间戳增量同步
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { EKPRestClient, SyncedElement, SyncedElementsResult } from '@/lib/ekp-rest-client';
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

    // 确定要同步的组织类型
    const orgTypes: string[] = [];
    if (scope.includes('organizations')) {
      orgTypes.push('org');
    }
    if (scope.includes('departments')) {
      orgTypes.push('dept');
    }
    // 群组和岗位暂不支持
    // if (scope.includes('posts')) {
    //   orgTypes.push('post');
    // }
    if (scope.includes('persons')) {
      orgTypes.push('person');
    }

    console.log('[API:Organization/Sync] 同步类型:', orgTypes);

    // 使用 getUpdatedElements 同步所有数据
    const syncResult = await syncAllElements(client, orgTypes);

    if (!syncResult.success) {
      return NextResponse.json({
        success: false,
        error: syncResult.error || '同步失败',
      }, { status: 500 });
    }

    // 统计结果
    for (const element of syncResult.elements || []) {
      stats.total++;
      
      if (element.type === 'org' && scope.includes('organizations')) {
        stats.organizations.total++;
        if (await saveOrganization(element)) {
          stats.organizations.success++;
          stats.success++;
        } else {
          stats.organizations.failed++;
          stats.failed++;
        }
      } else if (element.type === 'dept' && scope.includes('departments')) {
        stats.departments.total++;
        if (await saveDepartment(element)) {
          stats.departments.success++;
          stats.success++;
        } else {
          stats.departments.failed++;
          stats.failed++;
        }
      } else if (element.type === 'person' && scope.includes('persons')) {
        stats.persons.total++;
        if (await savePerson(element)) {
          stats.persons.success++;
          stats.success++;
        } else {
          stats.persons.failed++;
          stats.failed++;
        }
      }
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
 * 同步所有组织架构元素
 * 使用 getUpdatedElements 接口，支持分批次获取
 */
async function syncAllElements(
  client: EKPRestClient, 
  orgTypes: string[]
): Promise<{ success: boolean; elements: SyncedElement[]; error?: string }> {
  const allElements: SyncedElement[] = [];
  let timeStamp = '';
  const batchSize = 500; // 每批获取500条
  let hasMore = true;
  let batchCount = 0;

  console.log('[Sync] 开始分批获取组织架构数据...');

  while (hasMore) {
    batchCount++;
    console.log(`[Sync] 获取第 ${batchCount} 批数据...`);

    // 调用 getUpdatedElements 接口
    const result = await client.getUpdatedElements({
      returnOrgType: orgTypes.length > 0 ? orgTypes : undefined,
      count: batchSize,
      beginTimeStamp: timeStamp || undefined,
    });

    if (!result.success || !result.data) {
      console.error(`[Sync] 获取第 ${batchCount} 批数据失败:`, result.msg);
      return { success: false, elements: allElements, error: result.msg };
    }

    const { elements, timeStamp: newTimeStamp, hasMore: more } = result.data;
    
    console.log(`[Sync] 第 ${batchCount} 批获取到 ${elements.length} 条数据`);
    allElements.push(...elements);
    
    hasMore = more;
    timeStamp = newTimeStamp;

    // 安全限制，防止无限循环
    if (batchCount > 100) {
      console.warn('[Sync] 达到最大批次限制，停止获取');
      break;
    }
  }

  console.log(`[Sync] 数据获取完成，共 ${batchCount} 批，${allElements.length} 条记录`);
  
  // 按类型统计
  const typeStats: Record<string, number> = {};
  for (const elem of allElements) {
    typeStats[elem.type] = (typeStats[elem.type] || 0) + 1;
  }
  console.log('[Sync] 各类型数量:', typeStats);

  return { success: true, elements: allElements };
}

/**
 * 保存机构数据
 */
async function saveOrganization(element: SyncedElement): Promise<boolean> {
  try {
    const id = element.id || element.lunid;
    if (!id) return false;

    // 解析层级路径获取顶级父级
    let parentOrgId: string | null = null;

    // 检查是否已存在
    const existing = await dbManager.query(
      'SELECT fd_id FROM sys_org_element WHERE fd_id = ?',
      [id]
    );

    if (existing.rows.length > 0) {
      // 更新
      await dbManager.query(`
        UPDATE sys_org_element SET 
          fd_name = ?, fd_no = ?, fd_order = ?, fd_hierarchy_id = ?, fd_is_available = ?
        WHERE fd_id = ?
      `, [
        element.name || '',
        element.no || '',
        element.order || '',
        '', // 机构没有层级路径
        element.isAvailable !== false ? 1 : 0,
        id,
      ]);
    } else {
      // 插入
      await dbManager.query(`
        INSERT INTO sys_org_element (fd_id, fd_org_type, fd_name, fd_no, fd_order, fd_parentorgid, fd_hierarchy_id, fd_is_available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        1, // 机构类型
        element.name || '',
        element.no || '',
        element.order || '',
        parentOrgId,
        '', // 机构没有层级路径
        element.isAvailable !== false ? 1 : 0,
      ]);
    }

    return true;
  } catch (err) {
    console.error('[Sync] 保存机构失败:', element, err);
    return false;
  }
}

/**
 * 保存部门数据
 */
async function saveDepartment(element: SyncedElement): Promise<boolean> {
  try {
    const id = element.id || element.lunid;
    if (!id) return false;

    // parent 字段表示父部门ID
    const parentId = element.parent || null;

    // 检查是否已存在
    const existing = await dbManager.query(
      'SELECT fd_id FROM sys_org_element WHERE fd_id = ?',
      [id]
    );

    if (existing.rows.length > 0) {
      // 更新
      await dbManager.query(`
        UPDATE sys_org_element SET 
          fd_name = ?, fd_no = ?, fd_order = ?, fd_parentorgid = ?, fd_is_available = ?
        WHERE fd_id = ?
      `, [
        element.name || '',
        element.no || '',
        element.order || '',
        parentId,
        element.isAvailable !== false ? 1 : 0,
        id,
      ]);
    } else {
      // 插入
      await dbManager.query(`
        INSERT INTO sys_org_element (fd_id, fd_org_type, fd_name, fd_no, fd_order, fd_parentorgid, fd_is_available)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        2, // 部门类型
        element.name || '',
        element.no || '',
        element.order || '',
        parentId,
        element.isAvailable !== false ? 1 : 0,
      ]);
    }

    return true;
  } catch (err) {
    console.error('[Sync] 保存部门失败:', element, err);
    return false;
  }
}

/**
 * 保存人员数据
 */
async function savePerson(element: SyncedElement): Promise<boolean> {
  try {
    // 人员的ID使用lunid（唯一标识）
    const id = element.id || element.lunid;
    if (!id) return false;

    // parent 字段表示所属部门
    const deptId = element.parent || null;

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
          fd_dept_id = ?, fd_rtx_account = ?, fd_hierarchy_id = ?,
          fd_is_login_enabled = ?
        WHERE fd_id = ?
      `, [
        element.name || '',
        element.no || '',
        element.email || '',
        element.mobileNo || '',
        deptId,
        element.rtx || null,
        '', // 人员没有单独的层级路径
        element.isAvailable !== false ? 1 : 0,
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
          fd_dept_id, fd_rtx_account, fd_password, fd_is_login_enabled, fd_role,
          fd_is_available
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        element.name || '',
        element.no || '',
        element.loginName || id,
        element.email || '',
        element.mobileNo || '',
        deptId,
        element.rtx || null,
        hashedPassword,
        1, // fd_is_login_enabled
        'user', // 默认角色
        element.isAvailable !== false ? 1 : 0,
      ]);
    }

    return true;
  } catch (err) {
    console.error('[Sync] 保存人员失败:', element, err);
    return false;
  }
}
