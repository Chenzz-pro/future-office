/**
 * 角色常量定义
 * 用于统一管理系统角色ID和角色代码
 */

// 角色ID常量
export const ROLE_IDS = {
  SUPER_ADMIN: '00000000-0000-0000-0000-000000000001', // 超级管理员
  ADMIN: '00000000-0000-0000-0000-000000000002',        // 管理员
  USER: '00000000-0000-0000-0000-000000000003',         // 普通用户
} as const;

// 角色代码常量
export const ROLE_CODES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
} as const;

// 角色名称常量
export const ROLE_NAMES = {
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  USER: '普通用户',
} as const;

// 向后兼容的角色常量（用于迁移）
export const LEGACY_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  ADMINISTRATOR: 'administrator',
} as const;

/**
 * 判断是否为管理员角色
 * @param roleId - 角色ID
 * @returns 是否为管理员角色
 */
export function isAdminRole(roleId: string): boolean {
  return roleId === ROLE_IDS.SUPER_ADMIN || roleId === ROLE_IDS.ADMIN;
}

/**
 * 判断是否为超级管理员角色
 * @param roleId - 角色ID
 * @returns 是否为超级管理员角色
 */
export function isSuperAdminRole(roleId: string): boolean {
  return roleId === ROLE_IDS.SUPER_ADMIN;
}

/**
 * 判断是否为普通用户角色
 * @param roleId - 角色ID
 * @returns 是否为普通用户角色
 */
export function isUserRole(roleId: string): boolean {
  return roleId === ROLE_IDS.USER;
}

/**
 * 获取角色名称
 * @param roleId - 角色ID
 * @returns 角色名称
 */
export function getRoleName(roleId: string): string {
  switch (roleId) {
    case ROLE_IDS.SUPER_ADMIN:
      return ROLE_NAMES.SUPER_ADMIN;
    case ROLE_IDS.ADMIN:
      return ROLE_NAMES.ADMIN;
    case ROLE_IDS.USER:
      return ROLE_NAMES.USER;
    default:
      return '未知角色';
  }
}

/**
 * 获取角色代码
 * @param roleId - 角色ID
 * @returns 角色代码
 */
export function getRoleCode(roleId: string): string {
  switch (roleId) {
    case ROLE_IDS.SUPER_ADMIN:
      return ROLE_CODES.SUPER_ADMIN;
    case ROLE_IDS.ADMIN:
      return ROLE_CODES.ADMIN;
    case ROLE_IDS.USER:
      return ROLE_CODES.USER;
    default:
      return 'unknown';
  }
}

/**
 * 角色类型
 */
export type RoleId = typeof ROLE_IDS[keyof typeof ROLE_IDS];
