/**
 * 用户绑定查找 API
 * 根据EKP用户信息查找绑定结果
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';

// 绑定结果类型
interface BindingResult {
  localUserId: string | null;
  localUsername: string | null;
  bound: boolean;
  bindingType?: 'manual' | 'auto' | 'role';
  bindingId?: string;
  bindingReason?: string;
}

/**
 * POST /api/user-bindings/lookup
 * 根据EKP用户信息查找绑定结果
 * Body:
 *   - ekp_user_id?: EKP用户ID
 *   - ekp_login_name?: EKP登录名
 *   - ekp_role_id?: EKP角色ID
 *   - ekp_role_code?: EKP角色代码
 *   - ekp_roles?: EKP用户的所有角色列表
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ekp_user_id, ekp_login_name, ekp_role_id, ekp_role_code, ekp_roles } = body;

    const result: BindingResult = {
      localUserId: null,
      localUsername: null,
      bound: false,
    };

    // 1. 优先查找精确匹配的绑定配置（按优先级排序）
    if (ekp_login_name || ekp_user_id) {
      const bindingResult = await dbManager.query<{
        id: string;
        local_user_id: string;
        local_username: string;
        binding_type: string;
        binding_reason: string;
      }>(`
        SELECT * FROM user_bindings 
        WHERE (ekp_login_name = ? OR ekp_user_id = ?) 
        AND is_active = TRUE
        ORDER BY 
          CASE binding_type 
            WHEN 'manual' THEN 1 
            WHEN 'auto' THEN 2 
            WHEN 'role' THEN 3 
          END
        LIMIT 1
      `, [ekp_login_name || '', ekp_user_id || '']);

      if (bindingResult.rows.length > 0) {
        const binding = bindingResult.rows[0];
        result.localUserId = binding.local_user_id;
        result.localUsername = binding.local_username;
        result.bound = true;
        result.bindingType = binding.binding_type as 'manual' | 'auto' | 'role';
        result.bindingId = binding.id;
        result.bindingReason = binding.binding_reason;

        return NextResponse.json({ success: true, data: result });
      }
    }

    // 2. 如果有角色信息，查找角色映射
    if (ekp_role_id || ekp_role_code || (ekp_roles && ekp_roles.length > 0)) {
      // 构建角色查询条件
      const roleConditions: string[] = [];
      const roleParams: (string | null)[] = [];

      if (ekp_role_code) {
        roleConditions.push('ekp_role_code = ?');
        roleParams.push(ekp_role_code);
      }
      if (ekp_role_id) {
        roleConditions.push('ekp_role_id = ?');
        roleParams.push(ekp_role_id);
      }
      if (ekp_roles && ekp_roles.length > 0) {
        const placeholders = ekp_roles.map(() => '?').join(', ');
        roleConditions.push(`(ekp_role_id IN (${placeholders}) OR ekp_role_code IN (${placeholders}))`);
        roleParams.push(...ekp_roles, ...ekp_roles);
      }

      if (roleConditions.length > 0) {
        const roleSql = `
          SELECT * FROM role_mappings 
          WHERE (${roleConditions.join(' OR ')})
          AND is_active = TRUE
          ORDER BY priority DESC
          LIMIT 1
        `;

        const roleResult = await dbManager.query<{
          id: string;
          local_role_id: string;
          local_role_name: string;
        }>(roleSql, roleParams);

        if (roleResult.rows.length > 0) {
          const mapping = roleResult.rows[0];
          result.localUserId = mapping.local_role_id;
          result.localUsername = mapping.local_role_name;
          result.bound = true;
          result.bindingType = 'role';
          result.bindingId = mapping.id;

          return NextResponse.json({ success: true, data: result });
        }
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API:UserBindings:Lookup] 查找绑定失败:', error);
    return NextResponse.json(
      { success: false, error: '查找绑定失败' },
      { status: 500 }
    );
  }
}
