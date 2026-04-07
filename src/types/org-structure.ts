// ============================================
// 组织架构相关类型定义
// ============================================

/**
 * 组织元素类型枚举
 */
export enum OrgElementType {
  ORGANIZATION = 1,  // 机构
  DEPARTMENT = 2,    // 部门
  POSITION = 3,      // 岗位
  GROUP = 4          // 群组
}

/**
 * 组织元素类型标签
 */
export const OrgElementTypeLabels: Record<OrgElementType, string> = {
  [OrgElementType.ORGANIZATION]: '机构',
  [OrgElementType.DEPARTMENT]: '部门',
  [OrgElementType.POSITION]: '岗位',
  [OrgElementType.GROUP]: '群组'
};

/**
 * 性别枚举
 */
export enum Gender {
  MALE = 1,   // 男
  FEMALE = 2  // 女
}

/**
 * 用户类型枚举
 */
export enum UserType {
  INTERNAL = 'internal',  // 内部用户
  EXTERNAL = 'external'   // 外部用户
}

// ============================================
// 组织元素（机构/部门/岗位）
// ============================================

/**
 * 组织元素接口
 */
export interface OrgElement {
  fd_id: string;
  fd_org_type: OrgElementType;
  fd_name: string;
  fd_order: number;
  fd_no?: string;
  fd_keyword?: string;
  fd_is_available: boolean;
  fd_is_business: boolean;
  fd_import_info?: string;
  fd_org_email?: string;
  fd_persons_number: number;
  fd_memo?: string;
  fd_hierarchy_id?: string;
  fd_create_time: Date;
  fd_alter_time: Date;
  fd_is_external: boolean;
  fd_this_leaderid?: string;  // 本级领导ID
  fd_this_leader_name?: string;  // 本级领导名称（关联查询）
  fd_super_leaderid?: string;  // 上级领导ID
  fd_super_leader_name?: string;  // 上级领导名称（关联查询）
  fd_parentorgid?: string;  // 父机构ID
  fd_parentorg_name?: string;  // 父机构名称（关联查询）
  fd_parentid?: string;  // 上级部门ID
  fd_parent_name?: string;  // 上级部门名称（关联查询）
  fd_name_pinyin?: string;
  fd_name_simple_pinyin?: string;
  fd_is_abandon: boolean;
  fd_flag_deleted?: string;
  fd_ldap_dn?: string;
  fd_pre_dept_id?: string;
  fd_pre_post_ids?: string;
  fd_creator_id?: string;
  fd_creator_name?: string;  // 创建者名称（关联查询）
  children?: OrgElement[];  // 子节点（树形结构）
  personCount?: number;  // 人员数量（含下级）
}

/**
 * 创建/更新组织元素DTO
 */
export interface OrgElementDTO {
  fd_id?: string;
  fd_org_type: OrgElementType;
  fd_name: string;
  fd_order?: number;
  fd_no?: string;
  fd_keyword?: string;
  fd_is_available?: boolean;
  fd_is_business?: boolean;
  fd_import_info?: string;
  fd_org_email?: string;
  fd_memo?: string;
  fd_is_external?: boolean;
  fd_this_leaderid?: string;
  fd_super_leaderid?: string;
  fd_parentorgid?: string;
  fd_parentid?: string;
  fd_creator_id?: string;
  fd_persons_number?: number; // 群组成员数量
}

// ============================================
// 人员
// ============================================

/**
 * 人员接口
 */
export interface OrgPerson {
  fd_id: string;
  fd_name: string;
  fd_nickname?: string;
  fd_no?: string;
  fd_dept_id?: string;
  fd_dept_name?: string;  // 部门名称（关联查询）
  fd_email?: string;
  fd_mobile?: string;
  fd_office_phone?: string;
  fd_login_name: string;
  fd_password?: string;
  fd_default_language: string;
  fd_keyword?: string;
  fd_order: number;
  fd_position?: string;
  fd_post_id?: string;
  fd_post_name?: string;  // 岗位名称（关联查询）
  fd_rtx_account?: string;
  fd_dynamic_password?: string;
  fd_gender: Gender;
  fd_wechat?: string;
  fd_short_no?: string;
  fd_double_validation: boolean;
  fd_is_business_related: boolean;
  fd_is_login_enabled: boolean;
  fd_memo?: string;
  fd_create_time: Date;
  fd_alter_time: Date;
  fd_creator_id?: string;
  fd_creator_name?: string;
  fd_lock_time?: Date;
  fd_staffing_level_id?: string;
  fd_staffing_level_name?: string;  // 职务级别名称（关联查询）
  fd_user_type: UserType;
  fd_person_to_more_dept: number;
  post_ids?: string[];  // 所有岗位ID列表（一人多岗）
  post_names?: string[];  // 所有岗位名称列表
}

/**
 * 创建/更新人员DTO
 */
export interface OrgPersonDTO {
  fd_id?: string;
  fd_name: string;
  fd_nickname?: string;
  fd_no?: string;
  fd_dept_id?: string;
  fd_email?: string;
  fd_mobile?: string;
  fd_office_phone?: string;
  fd_login_name: string;
  fd_password?: string;
  fd_default_language?: string;
  fd_keyword?: string;
  fd_order?: number;
  fd_position?: string;
  fd_post_id?: string;
  fd_post_ids?: string[];  // 岗位ID列表（支持一人多岗）
  fd_rtx_account?: string;
  fd_dynamic_password?: string;
  fd_gender?: Gender;
  fd_wechat?: string;
  fd_short_no?: string;
  fd_double_validation?: boolean;
  fd_is_business_related?: boolean;
  fd_is_login_enabled?: boolean;
  fd_memo?: string;
  fd_creator_id?: string;
  fd_staffing_level_id?: string;
  fd_user_type?: UserType;
  fd_person_to_more_dept?: number;
}

// ============================================
// 岗位人员关联
// ============================================

/**
 * 岗位人员关联接口
 */
export interface PostPersonRelation {
  fd_id: string;
  fd_post_id: string;
  fd_post_name?: string;  // 岗位名称（关联查询）
  fd_person_id: string;
  fd_person_name?: string;  // 人员名称（关联查询）
  fd_create_time: Date;
  fd_creator_id?: string;
}

// ============================================
// 职务级别
// ============================================

/**
 * 职务级别接口
 */
export interface StaffingLevel {
  fd_id: string;
  fd_name: string;
  fd_level: number;
  fd_description?: string;
  fd_is_default: boolean;
  fd_is_available: boolean;
  doc_create_time: Date;
  doc_alter_time: Date;
  doc_creator_id?: string;
  fd_import_info?: string;
}

/**
 * 创建/更新职务级别DTO
 */
export interface StaffingLevelDTO {
  fd_id?: string;
  fd_name: string;
  fd_level: number;
  fd_description?: string;
  fd_is_default?: boolean;
  fd_is_available?: boolean;
  fd_creator_id?: string;
  fd_import_info?: string;
}

// ============================================
// 组织架构树节点
// ============================================

/**
 * 组织架构树节点接口（只包含机构和部门）
 */
export interface OrgTreeNode {
  id: string;
  name: string;
  type: OrgElementType;  // 1=机构, 2=部门
  parentId?: string;
  children?: OrgTreeNode[];
  personCount?: number;  // 人员数量（含下级）
}

// ============================================
// 查询条件
// ============================================

/**
 * 组织元素查询条件
 */
export interface OrgElementQuery {
  fd_org_type?: OrgElementType;
  fd_parentid?: string;
  fd_parentorgid?: string;
  fd_is_available?: boolean;
  fd_is_business?: boolean;
  keyword?: string;
  includeChildren?: boolean;
}

/**
 * 人员查询条件
 */
export interface PersonQuery {
  fd_dept_id?: string;
  fd_post_id?: string;
  fd_is_login_enabled?: boolean;
  fd_is_business_related?: boolean;
  keyword?: string;
  fd_user_type?: UserType;
  page?: number;
  pageSize?: number;
}

/**
 * 分页结果
 */
export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
