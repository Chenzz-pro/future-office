/**
 * 用户绑定配置 API
 * 管理EKP用户与本系统用户的绑定关系
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { RowDataPacket } from 'mysql2';

// 用户绑定配置类型
interface UserBinding {
  id: string;
  local_user_id: string | null;
  local_username: string | null;
  ekp_user_id: string | null;
  ekp_username: string | null;
  ekp_login_name: string | null;
  binding_type: 'manual' | 'auto' | 'role';
  binding_reason: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// 角色映射类型
interface RoleMapping {
  id: string;
  local_role_id: string | null;
  local_role_name: string | null;
  ekp_role_id: string | null;
  ekp_role_name: string | null;
  ekp_role_code: string | null;
  priority: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// 绑定结果类型
interface BindingResult {
  localUserId: string | null;
  localUsername: string | null;
  bound: boolean;
  bindingType?: 'manual' | 'auto' | 'role';
}

/**
 * GET /api/user-bindings
 * 获取用户绑定配置列表
 * Query params:
 *   - type: 'bindings' | 'roles' | 'all' (default: 'all')
 *   - active: 'true' | 'false' (default: all)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';
    const active = searchParams.get('active');

    let bindings: UserBinding[] = [];
    let roleMappings: RoleMapping[] = [];

    // 获取用户绑定配置
    if (type === 'bindings' || type === 'all') {
      let bindingSql = `
        SELECT * FROM user_bindings WHERE 1=1
      `;
      if (active !== null) {
        bindingSql += ` AND is_active = ${active === 'true' ? 'TRUE' : 'FALSE'}`;
      }
      bindingSql += ' ORDER BY created_at DESC';

      const bindingResult = await dbManager.query<UserBinding>(bindingSql);
      bindings = bindingResult.rows;
    }

    // 获取角色映射配置
    if (type === 'roles' || type === 'all') {
      let roleSql = `
        SELECT * FROM role_mappings WHERE 1=1
      `;
      if (active !== null) {
        roleSql += ` AND is_active = ${active === 'true' ? 'TRUE' : 'FALSE'}`;
      }
      roleSql += ' ORDER BY priority DESC';

      const roleResult = await dbManager.query<RoleMapping>(roleSql);
      roleMappings = roleResult.rows;
    }

    // 获取本系统用户列表（用于绑定选择）
    let localUsers: any[] = [];
    const usersResult = await dbManager.query(`
      SELECT fd_id, fd_login_name, fd_name 
      FROM sys_org_person 
      WHERE fd_is_login_enabled = 1
      ORDER BY fd_login_name
    `);
    localUsers = usersResult.rows;

    // 获取本系统角色列表
    let localRoles: any[] = [];
    const rolesResult = await dbManager.query(`
      SELECT fd_id, fd_name, fd_code 
      FROM sys_role 
      WHERE fd_is_available = 1
      ORDER BY fd_order
    `);
    localRoles = rolesResult.rows;

    return NextResponse.json({
      success: true,
      data: {
        bindings,
        roleMappings,
        localUsers,
        localRoles,
      },
    });
  } catch (error) {
    console.error('[API:UserBindings] 获取绑定配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取绑定配置失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-bindings
 * 创建或更新用户绑定配置
 * Body:
 *   - action: 'create' | 'update' | 'delete' | 'createRoleMapping' | 'updateRoleMapping' | 'deleteRoleMapping'
 *   - data: 绑定配置数据
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create': {
        // 创建用户绑定
        const id = crypto.randomUUID();
        const sql = `
          INSERT INTO user_bindings (
            id, local_user_id, local_username, ekp_user_id, ekp_username, ekp_login_name,
            binding_type, binding_reason, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        await dbManager.query(sql, [
          id,
          data.local_user_id || null,
          data.local_username || null,
          data.ekp_user_id || null,
          data.ekp_username || null,
          data.ekp_login_name || null,
          data.binding_type || 'manual',
          data.binding_reason || null,
          data.is_active !== false,
        ]);
        return NextResponse.json({ success: true, message: '绑定创建成功', data: { id } });
      }

      case 'update': {
        // 更新用户绑定
        const sql = `
          UPDATE user_bindings SET
            local_user_id = ?,
            local_username = ?,
            ekp_user_id = ?,
            ekp_username = ?,
            ekp_login_name = ?,
            binding_type = ?,
            binding_reason = ?,
            is_active = ?,
            updated_at = NOW()
          WHERE id = ?
        `;
        await dbManager.query(sql, [
          data.local_user_id || null,
          data.local_username || null,
          data.ekp_user_id || null,
          data.ekp_username || null,
          data.ekp_login_name || null,
          data.binding_type || 'manual',
          data.binding_reason || null,
          data.is_active !== false,
          data.id,
        ]);
        return NextResponse.json({ success: true, message: '绑定更新成功' });
      }

      case 'delete': {
        // 删除用户绑定
        await dbManager.query('DELETE FROM user_bindings WHERE id = ?', [data.id]);
        return NextResponse.json({ success: true, message: '绑定删除成功' });
      }

      case 'createRoleMapping': {
        // 创建角色映射
        const id = crypto.randomUUID();
        const sql = `
          INSERT INTO role_mappings (
            id, local_role_id, local_role_name, ekp_role_id, ekp_role_name, ekp_role_code,
            priority, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        await dbManager.query(sql, [
          id,
          data.local_role_id || null,
          data.local_role_name || null,
          data.ekp_role_id || null,
          data.ekp_role_name || null,
          data.ekp_role_code || null,
          data.priority || 0,
          data.is_active !== false,
        ]);
        return NextResponse.json({ success: true, message: '角色映射创建成功', data: { id } });
      }

      case 'updateRoleMapping': {
        // 更新角色映射
        const sql = `
          UPDATE role_mappings SET
            local_role_id = ?,
            local_role_name = ?,
            ekp_role_id = ?,
            ekp_role_name = ?,
            ekp_role_code = ?,
            priority = ?,
            is_active = ?,
            updated_at = NOW()
          WHERE id = ?
        `;
        await dbManager.query(sql, [
          data.local_role_id || null,
          data.local_role_name || null,
          data.ekp_role_id || null,
          data.ekp_role_name || null,
          data.ekp_role_code || null,
          data.priority || 0,
          data.is_active !== false,
          data.id,
        ]);
        return NextResponse.json({ success: true, message: '角色映射更新成功' });
      }

      case 'deleteRoleMapping': {
        // 删除角色映射
        await dbManager.query('DELETE FROM role_mappings WHERE id = ?', [data.id]);
        return NextResponse.json({ success: true, message: '角色映射删除成功' });
      }

      case 'initTables': {
        // 初始化表结构
        await initTables();
        return NextResponse.json({ success: true, message: '表初始化成功' });
      }

      default:
        return NextResponse.json(
          { success: false, error: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API:UserBindings] 操作失败:', error);
    return NextResponse.json(
      { success: false, error: '操作失败: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-bindings/lookup
 * 根据EKP用户信息查询绑定结果
 * Body:
 *   - ekp_user_id?: EKP用户ID
 *   - ekp_login_name?: EKP登录名
 *   - ekp_role_id?: EKP角色ID
 *   - ekp_role_code?: EKP角色代码
 */
export async function lookupBinding(request: NextRequest) {
  try {
    const body = await request.json();
    const { ekp_user_id, ekp_login_name, ekp_role_id, ekp_role_code } = body;

    const result: BindingResult = {
      localUserId: null,
      localUsername: null,
      bound: false,
    };

    // 1. 优先查找精确匹配的绑定配置
    if (ekp_login_name) {
      const bindingResult = await dbManager.query<UserBinding>(`
        SELECT * FROM user_bindings 
        WHERE (ekp_login_name = ? OR ekp_user_id = ?) 
        AND is_active = TRUE
        ORDER BY binding_type = 'manual' DESC, binding_type = 'auto' DESC, binding_type = 'role' DESC
        LIMIT 1
      `, [ekp_login_name, ekp_user_id]);

      if (bindingResult.rows.length > 0) {
        const binding = bindingResult.rows[0];
        result.localUserId = binding.local_user_id;
        result.localUsername = binding.local_username;
        result.bound = true;
        result.bindingType = binding.binding_type;

        return NextResponse.json({ success: true, data: result });
      }
    }

    // 2. 根据角色映射查找绑定
    if (ekp_role_id || ekp_role_code) {
      const roleResult = await dbManager.query<RoleMapping>(`
        SELECT * FROM role_mappings 
        WHERE (ekp_role_id = ? OR ekp_role_code = ?) 
        AND is_active = TRUE
        ORDER BY priority DESC
        LIMIT 1
      `, [ekp_role_id, ekp_role_code]);

      if (roleResult.rows.length > 0) {
        const mapping = roleResult.rows[0];
        result.localUserId = mapping.local_role_id;
        result.localUsername = mapping.local_role_name;
        result.bound = true;
        result.bindingType = 'role';

        return NextResponse.json({ success: true, data: result });
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API:UserBindings] 查找绑定失败:', error);
    return NextResponse.json(
      { success: false, error: '查找绑定失败' },
      { status: 500 }
    );
  }
}

/**
 * 初始化表结构
 */
async function initTables(): Promise<void> {
  // 创建用户绑定配置表
  await dbManager.query(`
    CREATE TABLE IF NOT EXISTS user_bindings (
      id VARCHAR(36) PRIMARY KEY COMMENT '绑定ID',
      local_user_id VARCHAR(36) COMMENT '本系统用户ID',
      local_username VARCHAR(100) COMMENT '本系统用户名',
      ekp_user_id VARCHAR(100) COMMENT 'EKP用户ID',
      ekp_username VARCHAR(100) COMMENT 'EKP用户名',
      ekp_login_name VARCHAR(100) COMMENT 'EKP登录名',
      binding_type ENUM('manual', 'auto', 'role') NOT NULL DEFAULT 'manual' COMMENT '绑定类型',
      binding_reason VARCHAR(500) COMMENT '绑定原因',
      is_active BOOLEAN DEFAULT TRUE COMMENT '是否生效',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      created_by VARCHAR(36) COMMENT '创建人',
      INDEX idx_local_user (local_user_id),
      INDEX idx_ekp_user (ekp_user_id),
      INDEX idx_ekp_login (ekp_login_name),
      INDEX idx_binding_type (binding_type),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户绑定配置表'
  `);

  // 创建角色映射规则表
  await dbManager.query(`
    CREATE TABLE IF NOT EXISTS role_mappings (
      id VARCHAR(36) PRIMARY KEY COMMENT '映射ID',
      local_role_id VARCHAR(36) COMMENT '本系统角色ID',
      local_role_name VARCHAR(100) COMMENT '本系统角色名称',
      ekp_role_id VARCHAR(100) COMMENT 'EKP角色ID',
      ekp_role_name VARCHAR(100) COMMENT 'EKP角色名称',
      ekp_role_code VARCHAR(100) COMMENT 'EKP角色代码',
      priority INT DEFAULT 0 COMMENT '优先级',
      is_active BOOLEAN DEFAULT TRUE COMMENT '是否生效',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      INDEX idx_local_role (local_role_id),
      INDEX idx_ekp_role (ekp_role_id),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色映射规则表'
  `);

  // 初始化默认角色映射规则
  await initDefaultRoleMappings();
}

/**
 * 初始化默认角色映射
 */
async function initDefaultRoleMappings(): Promise<void> {
  // 超级管理员映射
  await dbManager.query(`
    INSERT IGNORE INTO role_mappings (id, local_role_id, local_role_name, ekp_role_id, ekp_role_name, ekp_role_code, priority, is_active)
    VALUES ('550e8400-e29b-41d4-a716-446655440001', '00000000-0000-0000-0000-000000000001', '超级管理员', 'SUPER_ADMIN', '系统管理员', 'sys_admin', 100, TRUE)
  `);

  // 管理员映射
  await dbManager.query(`
    INSERT IGNORE INTO role_mappings (id, local_role_id, local_role_name, ekp_role_id, ekp_role_name, ekp_role_code, priority, is_active)
    VALUES ('550e8400-e29b-41d4-a716-446655440002', '00000000-0000-0000-0000-000000000002', '管理员', 'ADMIN', '管理员', 'admin', 90, TRUE)
  `);

  // 普通用户映射
  await dbManager.query(`
    INSERT IGNORE INTO role_mappings (id, local_role_id, local_role_name, ekp_role_id, ekp_role_name, ekp_role_code, priority, is_active)
    VALUES ('550e8400-e29b-41d4-a716-446655440003', '00000000-0000-0000-0000-000000000003', '普通用户', 'USER', '普通用户', 'user', 10, TRUE)
  `);

  // 初始化admin账户的默认绑定规则
  await dbManager.query(`
    INSERT IGNORE INTO user_bindings (id, local_user_id, local_username, ekp_login_name, binding_type, binding_reason, is_active)
    VALUES ('660e8400-e29b-41d4-a716-446655440001', NULL, 'admin', 'admin', 'auto', '自动绑定：EKP管理员账号与本系统admin账号名相同', TRUE)
  `);
}
