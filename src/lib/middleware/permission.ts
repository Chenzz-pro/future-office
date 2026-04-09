/**
 * 统一权限校验中间件
 * 用于所有业务接口的权限校验
 */

import { NextRequest } from 'next/server';

export interface UserContext {
  userId: string;
  role: string;
  deptId?: string;
}

export interface PermissionCheckOptions {
  // 是否需要登录
  requireLogin?: boolean;

  // 允许的角色（空数组表示所有角色）
  allowedRoles?: string[];

  // 权限检查函数（自定义权限逻辑）
  customCheck?: (userContext: UserContext, params: any) => boolean | Promise<boolean>;
}

export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
}

/**
 * 检查权限
 * @param options 权限配置选项
 * @param request NextRequest对象
 * @returns 权限检查结果
 */
export async function checkPermission(
  options: PermissionCheckOptions,
  request: NextRequest
): Promise<PermissionCheckResult> {
  // 1. 提取用户信息
  const userId = request.headers.get('X-User-ID');
  const role = request.headers.get('X-User-Role');
  const deptId = request.headers.get('X-Dept-ID');

  const userContext: UserContext = {
    userId: userId || '',
    role: role || 'user',
    deptId: deptId || undefined,
  };

  // 2. 检查是否需要登录
  if (options.requireLogin && !userId) {
    return { granted: false, reason: '请先登录' };
  }

  // 3. 检查角色权限
  if (options.allowedRoles && options.allowedRoles.length > 0) {
    if (!role || !options.allowedRoles.includes(role)) {
      return {
        granted: false,
        reason: `您没有权限执行此操作，需要以下角色之一: ${options.allowedRoles.join(', ')}`,
      };
    }
  }

  // 4. 自定义权限检查
  if (options.customCheck) {
    try {
      const granted = await options.customCheck(userContext, {});
      if (!granted) {
        return { granted: false, reason: '权限检查失败' };
      }
    } catch (error) {
      console.error('[PermissionCheck] 自定义权限检查失败:', error);
      return { granted: false, reason: '权限检查异常' };
    }
  }

  return { granted: true };
}

/**
 * 提取用户上下文
 * @param request NextRequest对象
 * @returns 用户上下文
 */
export function extractUserContext(request: NextRequest): UserContext {
  return {
    userId: request.headers.get('X-User-ID') || '',
    role: request.headers.get('X-User-Role') || 'user',
    deptId: request.headers.get('X-Dept-ID') || undefined,
  };
}

/**
 * 预定义的权限检查规则
 */
export const PermissionRules = {
  // 需要登录
  requireLogin: {
    requireLogin: true,
  } as PermissionCheckOptions,

  // 管理员权限
  adminOnly: {
    requireLogin: true,
    allowedRoles: ['admin'],
  } as PermissionCheckOptions,

  // 管理员和经理权限
  adminAndManager: {
    requireLogin: true,
    allowedRoles: ['admin', 'manager'],
  } as PermissionCheckOptions,

  // 所有登录用户
  allLoggedIn: {
    requireLogin: true,
  } as PermissionCheckOptions,

  // 无需权限（公开接口）
  public: {} as PermissionCheckOptions,
};
