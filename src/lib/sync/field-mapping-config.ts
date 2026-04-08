/**
 * 组织架构同步字段映射配置
 * 定义 EKP 系统字段与本地数据库表字段的映射关系
 */

// ============================================
// 机构字段映射
// ============================================
export const organizationMapping = [
  { ekpField: 'id', localField: 'fd_id', description: '唯一标识符', required: true },
  { ekpField: 'lunid', localField: 'fd_id', description: '逻辑唯一ID（映射到fd_id）', required: true },
  { ekpField: 'name', localField: 'fd_name', description: '机构名称', required: true },
  { ekpField: 'type', localField: 'fd_org_type', description: '组织类型（1=机构）', required: true, transform: "type === 'org' ? 1 : 2" },
  { ekpField: 'no', localField: 'fd_no', description: '机构编号', required: false },
  { ekpField: 'order', localField: 'fd_order', description: '排序号', required: false, transform: 'parseInt(order)' },
  { ekpField: 'keyword', localField: 'fd_keyword', description: '关键字', required: false },
  { ekpField: 'memo', localField: 'fd_memo', description: '备注', required: false },
  { ekpField: 'isAvailable', localField: 'fd_is_available', description: '是否可用', required: false, transform: "支持 'true'/'false', '0'/'1', boolean 类型" },
  { ekpField: 'fd_parentorgid', localField: 'fd_parentorgid', description: '父机构ID', required: false },
  { ekpField: 'thisLeader', localField: 'fd_this_leaderid', description: '本级领导ID', required: false },
  { ekpField: 'superLeader', localField: 'fd_super_leaderid', description: '上级领导ID', required: false },
];

// ============================================
// 部门字段映射
// ============================================
export const departmentMapping = [
  { ekpField: 'id', localField: 'fd_id', description: '唯一标识符', required: true },
  { ekpField: 'lunid', localField: 'fd_id', description: '逻辑唯一ID（映射到fd_id）', required: true },
  { ekpField: 'name', localField: 'fd_name', description: '部门名称', required: true },
  { ekpField: 'type', localField: 'fd_org_type', description: '组织类型（2=部门）', required: true, transform: "type === 'dept' ? 2 : 2" },
  { ekpField: 'no', localField: 'fd_no', description: '部门编号', required: false },
  { ekpField: 'order', localField: 'fd_order', description: '排序号', required: false, transform: 'parseInt(order)' },
  { ekpField: 'keyword', localField: 'fd_keyword', description: '关键字', required: false },
  { ekpField: 'memo', localField: 'fd_memo', description: '备注', required: false },
  { ekpField: 'isAvailable', localField: 'fd_is_available', description: '是否可用', required: false, transform: "支持 'true'/'false', '0'/'1', boolean 类型" },
  { ekpField: 'fd_parentid', localField: 'fd_parentid', description: '父部门ID', required: false },
  { ekpField: 'fd_parentorgid', localField: 'fd_parentorgid', description: '父机构ID', required: false },
  { ekpField: 'thisLeader', localField: 'fd_this_leaderid', description: '本级领导ID', required: false },
  { ekpField: 'superLeader', localField: 'fd_super_leaderid', description: '上级领导ID', required: false },
];

// ============================================
// 岗位字段映射
// ============================================
export const positionMapping = [
  { ekpField: 'id', localField: 'fd_id', description: '唯一标识符', required: true },
  { ekpField: 'lunid', localField: 'fd_id', description: '逻辑唯一ID（映射到fd_id）', required: true },
  { ekpField: 'name', localField: 'fd_name', description: '岗位名称', required: true },
  { ekpField: 'type', localField: 'fd_org_type', description: '组织类型（3=岗位）', required: true, transform: "type === 'post' ? 3 : 3" },
  { ekpField: 'no', localField: 'fd_no', description: '岗位编号', required: false },
  { ekpField: 'order', localField: 'fd_order', description: '排序号', required: false, transform: 'parseInt(order)' },
  { ekpField: 'keyword', localField: 'fd_keyword', description: '关键字', required: false },
  { ekpField: 'memo', localField: 'fd_memo', description: '备注', required: false },
  { ekpField: 'isAvailable', localField: 'fd_is_available', description: '是否可用', required: false, transform: "支持 'true'/'false', '0'/'1', boolean 类型" },
  { ekpField: 'members', localField: 'fd_persons_number', description: '群组成员数量', required: false, transform: 'members?.length || 0' },
  { ekpField: 'fd_parentid', localField: 'fd_parentid', description: '上级ID（岗位专属）', required: false },
];

// ============================================
// 人员字段映射
// ============================================
export const personMapping = [
  { ekpField: 'id', localField: 'fd_id', description: '唯一标识符', required: true },
  { ekpField: 'lunid', localField: 'fd_id', description: '逻辑唯一ID（映射到fd_id）', required: true },
  { ekpField: 'name', localField: 'fd_name', description: '人员姓名', required: true },
  { ekpField: 'fd_login_name', localField: 'fd_login_name', description: '登录名（优先使用）', required: true, transform: "fd_login_name || loginName || id" },
  { ekpField: 'loginName', localField: 'fd_login_name', description: '登录名（兼容字段）', required: false, transform: "fd_login_name || loginName || id" },
  { ekpField: 'no', localField: 'fd_no', description: '人员编号/工号', required: false },
  { ekpField: 'order', localField: 'fd_order', description: '排序号', required: false, transform: 'parseInt(order)' },
  { ekpField: 'keyword', localField: 'fd_keyword', description: '关键字', required: false },
  { ekpField: 'isAvailable', localField: 'fd_is_login_enabled', description: '是否允许登录', required: false, transform: "支持 'true'/'false', '0'/'1', boolean 类型" },
  { ekpField: 'fd_parentid', localField: 'fd_dept_id', description: '所属部门ID', required: false, transform: "fd_parentid 作为部门ID" },
  { ekpField: 'posts', localField: 'fd_post_id', description: '岗位ID列表（第一个岗位）', required: false, transform: 'posts[0]' },
  { ekpField: 'posts', localField: 'fd_post_ids', description: '所有岗位ID列表', required: false, transform: 'posts' },
  { ekpField: 'email', localField: 'fd_email', description: '邮箱', required: false },
  { ekpField: 'mobileNo', localField: 'fd_mobile', description: '手机号码', required: false },
  { ekpField: 'workPhone', localField: 'fd_office_phone', description: '办公电话', required: false },
  { ekpField: 'rtx', localField: 'fd_rtx_account', description: 'RTX账号', required: false },
  { ekpField: 'wechat', localField: 'fd_wechat', description: '微信', required: false },
  { ekpField: 'sex', localField: 'fd_gender', description: '性别', required: false, transform: "M/男=1, F/女=2" },
  { ekpField: 'shortNo', localField: 'fd_short_no', description: '短号', required: false },
  { ekpField: 'memo', localField: 'fd_memo', description: '备注', required: false },
  { ekpField: 'staffingLevelName', localField: 'fd_staffing_level_name', description: '职务级别名称', required: false },
  { ekpField: 'staffingLevelValue', localField: 'fd_staffing_level_id', description: '职务级别值', required: false },
];

// ============================================
// 导出统一接口
// ============================================
export interface FieldMapping {
  ekpField: string;
  localField: string;
  description: string;
  required: boolean;
  transform?: string;
}

export interface MappingCategory {
  name: string;
  label: string;
  icon: string;
  color: string;
  fields: FieldMapping[];
}

export const fieldMappings: MappingCategory[] = [
  {
    name: 'organization',
    label: '机构',
    icon: 'Building2',
    color: 'blue',
    fields: organizationMapping,
  },
  {
    name: 'department',
    label: '部门',
    icon: 'Briefcase',
    color: 'green',
    fields: departmentMapping,
  },
  {
    name: 'position',
    label: '岗位',
    icon: 'Users',
    color: 'purple',
    fields: positionMapping,
  },
  {
    name: 'person',
    label: '人员',
    icon: 'User',
    color: 'orange',
    fields: personMapping,
  },
];

// 获取映射表
export function getMappingByCategory(categoryName: string): MappingCategory | undefined {
  return fieldMappings.find(m => m.name === categoryName);
}

// 获取所有映射表
export function getAllMappings(): MappingCategory[] {
  return fieldMappings;
}
