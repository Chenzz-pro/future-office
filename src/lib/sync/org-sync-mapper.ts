/**
 * 组织架构同步数据映射器
 * 负责将EKP的数据格式转换为本系统的数据格式
 */

import {
  OrgElementDTO,
  OrgPersonDTO,
  OrgElementType
} from '@/types/org-structure';
import { hashPassword } from '../password/password-utils';
import { orgSyncConfigRepository } from '../database/repositories/org-sync-config.repository';

// ============================================
// fd_hierarchy_id 层级路径解析工具
// ============================================

/**
 * 层级路径格式: x{id1}x{id2}x{id3}x...
 * - 以 'x' 开头和分隔
 * - 依次表示一级、二级、三级...
 * - 可以是机构、部门、人员的混合层级
 * 
 * 示例: x19a3e7807150a6c09ce100349a3a8933x19a0b9edcbfcf5894b4ad384d06aec30x
 * - 一级: 19a3e7807150a6c09ce100349a3a8933 (可能是机构或顶级部门)
 * - 二级: 19a0b9edcbfcf5894b4ad384d06aec30 (二级部门)
 */

/**
 * 解析 fd_hierarchy_id 获取所有层级ID
 * @param hierarchyId 层级路径字符串
 * @returns 层级ID数组，如 ['id1', 'id2', 'id3']
 */
export function parseHierarchyId(hierarchyId: string | undefined | null): string[] {
  if (!hierarchyId || typeof hierarchyId !== 'string') {
    return [];
  }
  
  // 按 'x' 分割并过滤空字符串
  const parts = hierarchyId.split('x').filter(part => part.trim() !== '');
  
  return parts;
}

/**
 * 从层级路径获取直接父级ID（最后一级的前一个）
 * @param hierarchyId 层级路径字符串
 * @param currentId 当前记录的ID
 * @returns 直接父级ID
 */
export function getParentIdFromHierarchy(hierarchyId: string | undefined | null, currentId: string): string | undefined {
  const levels = parseHierarchyId(hierarchyId);
  
  if (levels.length === 0) {
    return undefined;
  }
  
  // 如果当前ID在层级路径中，找到它的位置
  const currentIndex = levels.indexOf(currentId);
  
  if (currentIndex > 0) {
    // 返回上一级
    return levels[currentIndex - 1];
  } else if (currentIndex === -1 && levels.length > 0) {
    // 当前ID不在路径中（可能是根节点或路径不完整），返回最后一级作为父级
    return levels[levels.length - 1];
  }
  
  return undefined;
}

/**
 * 从层级路径获取顶级父级ID（第一级）
 * @param hierarchyId 层级路径字符串
 * @returns 顶级父级ID
 */
export function getTopParentIdFromHierarchy(hierarchyId: string | undefined | null): string | undefined {
  const levels = parseHierarchyId(hierarchyId);
  return levels.length > 0 ? levels[0] : undefined;
}

/**
 * 获取层级深度（从1开始）
 * @param hierarchyId 层级路径字符串
 * @returns 层级深度
 */
export function getHierarchyDepth(hierarchyId: string | undefined | null): number {
  return parseHierarchyId(hierarchyId).length;
}

/**
 * 从层级路径提取所有父级ID（不包含当前节点）
 * @param hierarchyId 层级路径字符串
 * @param currentId 当前记录的ID
 * @returns 所有父级ID数组
 */
export function getAllParentIdsFromHierarchy(hierarchyId: string | undefined | null, currentId: string): string[] {
  const levels = parseHierarchyId(hierarchyId);
  const currentIndex = levels.indexOf(currentId);
  
  if (currentIndex > 0) {
    return levels.slice(0, currentIndex);
  } else if (currentIndex === -1 && levels.length > 0) {
    // 当前ID不在路径中，返回全部作为父级
    return levels;
  }
  
  return [];
}

/**
 * 判断两个节点是否在同一层级路径下
 * @param hierarchyId1 第一个节点的层级路径
 * @param hierarchyId2 第二个节点的层级路径
 * @returns 是否有共同的父级
 */
export function isInSameHierarchy(hierarchyId1: string | undefined | null, hierarchyId2: string | undefined | null): boolean {
  const levels1 = parseHierarchyId(hierarchyId1);
  const levels2 = parseHierarchyId(hierarchyId2);
  
  if (levels1.length === 0 || levels2.length === 0) {
    return false;
  }
  
  // 检查是否有共同的ID
  return levels1.some(id => levels2.includes(id));
}

export interface EKPOrgElement {
  id: string;
  lunid: string;
  name: string;
  type: 'org' | 'dept' | 'group' | 'post' | 'person';
  no?: string;
  order?: string;
  keyword?: string;
  memo?: string;
  isAvailable?: boolean;
  fd_parentid?: string;      // 直接父级ID（部分EKP数据可能有）
  fd_parentorgid?: string;   // 父机构ID
  fd_hierarchy_id?: string;  // 层级路径：x{id1}x{id2}x{id3}x...
  thisLeader?: string;
  superLeader?: string;
  members?: string[];
  persons?: string[];
  posts?: string[];
  fd_login_name?: string; // EKP系统的登录名字段（优先使用）
  loginName?: string; // 兼容旧字段名
  password?: string;
  mobileNo?: string;
  email?: string;
  attendanceCardNumber?: string;
  workPhone?: string;
  rtx?: string;
  wechat?: string;
  sex?: string;
  shortNo?: string;
  staffingLevelName?: string;
  staffingLevelValue?: string;
  customProps?: Record<string, string>;
}

export class OrgSyncMapper {
  /**
   * 将EKP组织元素映射为本系统组织元素
   * 
   * 父级关系确定逻辑：
   * 1. 首先尝试使用 fd_parentid（直接父级）
   * 2. 如果没有，尝试从 fd_hierarchy_id 解析（层级路径）
   * 3. 对于机构类型，优先使用 fd_parentorgid
   */
  async mapToOrgElement(ekpData: EKPOrgElement): Promise<OrgElementDTO> {
    const type = this.mapOrgType(ekpData.type);

    // 正确处理 isAvailable 字段，支持字符串和布尔值
    let isAvailable = true;
    const isAvailableValue = String(ekpData.isAvailable ?? '').toLowerCase();
    if (isAvailableValue === 'false' || isAvailableValue === '0' || ekpData.isAvailable === false) {
      isAvailable = false;
    }

    // 确定父级ID
    let parentId = ekpData.fd_parentid;
    let parentOrgId = ekpData.fd_parentorgid;

    // 如果没有直接的父级ID，从层级路径解析
    if (!parentId && ekpData.fd_hierarchy_id) {
      // 从层级路径获取直接父级
      const parentFromHierarchy = getParentIdFromHierarchy(ekpData.fd_hierarchy_id, ekpData.id);
      if (parentFromHierarchy && parentFromHierarchy !== ekpData.id) {
        parentId = parentFromHierarchy;
        console.log(`[mapToOrgElement] 从层级路径解析父级ID: ${parentId}, 层级路径: ${ekpData.fd_hierarchy_id}`);
      }
    }

    // 如果是机构类型，设置父机构ID
    if (type === 1 && !parentOrgId) {
      // 从层级路径获取顶级父级
      const topParent = getTopParentIdFromHierarchy(ekpData.fd_hierarchy_id);
      if (topParent && topParent !== ekpData.id) {
        parentOrgId = topParent;
      }
    }

    // 解析层级深度
    const hierarchyDepth = getHierarchyDepth(ekpData.fd_hierarchy_id);

    console.log('[mapToOrgElement] 组织元素映射:', {
      id: ekpData.id,
      name: ekpData.name,
      type: ekpData.type,
      fd_org_type: type,
      fd_parentid: parentId,
      fd_parentorgid: parentOrgId,
      fd_hierarchy_id: ekpData.fd_hierarchy_id,
      hierarchyDepth: hierarchyDepth,
      isAvailable: isAvailable
    });

    return {
      fd_id: ekpData.id,
      fd_org_type: type,
      fd_name: ekpData.name,
      fd_no: ekpData.no || undefined,
      fd_order: ekpData.order ? parseInt(ekpData.order, 10) : undefined,
      fd_keyword: ekpData.keyword || undefined,
      fd_is_available: isAvailable,
      fd_memo: ekpData.memo || undefined,
      fd_parentid: parentId,
      fd_parentorgid: parentOrgId,
      fd_this_leaderid: ekpData.thisLeader || undefined,
      fd_super_leaderid: ekpData.superLeader || undefined,
      // 群组成员特殊处理
      fd_persons_number: type === 3 ? ekpData.members?.length || 0 : undefined
    };
  }

  /**
   * 将EKP人员映射为本系统人员
   * 
   * 部门ID确定逻辑：
   * 1. 首先尝试使用 fd_parentid（直接父级ID）
   * 2. 如果没有，尝试从 fd_hierarchy_id 解析（层级路径）
   * 3. 人员通常在部门/岗位下，所以取层级路径的最后一级作为部门
   */
  async mapToOrgPerson(ekpData: EKPOrgElement): Promise<OrgPersonDTO> {
    // 获取默认密码
    const defaultPassword = await orgSyncConfigRepository.getString('sync.default_password', '123456');

    // 正确处理 isAvailable 字段，支持字符串和布尔值
    let isAvailable = true;
    const isAvailableValue = String(ekpData.isAvailable ?? '').toLowerCase();
    if (isAvailableValue === 'false' || isAvailableValue === '0' || ekpData.isAvailable === false) {
      isAvailable = false;
    }

    // 登录名：优先使用EKP的fd_login_name，其次使用loginName，最后使用ID
    const loginName = ekpData.fd_login_name || ekpData.loginName || ekpData.id;

    // 部门ID确定逻辑
    let deptId = ekpData.fd_parentid;
    
    // 如果没有直接的部门ID，从层级路径解析
    if (!deptId && ekpData.fd_hierarchy_id) {
      const levels = parseHierarchyId(ekpData.fd_hierarchy_id);
      
      if (levels.length > 0) {
        // 获取层级路径的最后一级（通常是人员所属的部门/岗位）
        const lastLevel = levels[levels.length - 1];
        
        // 如果最后一级不是当前人员ID，则作为部门ID
        if (lastLevel !== ekpData.id) {
          deptId = lastLevel;
          console.log(`[mapToOrgPerson] 从层级路径解析部门ID: ${deptId}, 层级路径: ${ekpData.fd_hierarchy_id}`);
        } else if (levels.length > 1) {
          // 如果最后一级是当前人员ID，取倒数第二级
          deptId = levels[levels.length - 2];
          console.log(`[mapToOrgPerson] 从层级路径解析部门ID（倒数第二级）: ${deptId}, 层级路径: ${ekpData.fd_hierarchy_id}`);
        }
      }
    }

    // 解析层级深度
    const hierarchyDepth = getHierarchyDepth(ekpData.fd_hierarchy_id);

    console.log('[mapToOrgPerson] 人员映射:', {
      id: ekpData.id,
      name: ekpData.name,
      fd_login_name: ekpData.fd_login_name,
      loginName: ekpData.loginName,
      finalLoginName: loginName,
      fd_parentid: ekpData.fd_parentid,
      fd_hierarchy_id: ekpData.fd_hierarchy_id,
      deptId: deptId,
      hierarchyDepth: hierarchyDepth,
      posts: ekpData.posts
    });

    return {
      fd_id: ekpData.id,
      fd_name: ekpData.name,
      fd_login_name: loginName, // 优先使用EKP的fd_login_name
      fd_password: defaultPassword || '123456', // 使用默认密码
      fd_no: ekpData.no || undefined,
      fd_order: ekpData.order ? parseInt(ekpData.order, 10) : undefined,
      fd_keyword: ekpData.keyword || undefined,
      fd_dept_id: deptId, // 使用fd_parentid或层级路径解析的部门ID
      fd_post_id: ekpData.posts && ekpData.posts.length > 0 ? ekpData.posts[0] : undefined,
      fd_post_ids: ekpData.posts || [],
      fd_email: ekpData.email || undefined,
      fd_mobile: ekpData.mobileNo || undefined,
      fd_office_phone: ekpData.workPhone || undefined,
      fd_rtx_account: ekpData.rtx || undefined,
      fd_gender: this.mapGender(ekpData.sex),
      fd_wechat: ekpData.wechat || undefined,
      fd_short_no: ekpData.shortNo || undefined,
      fd_is_login_enabled: isAvailable, // 使用处理后的可用性状态
      fd_memo: ekpData.memo || undefined
    };
  }

  /**
   * 映射组织类型
   */
  private mapOrgType(ekpType: string): OrgElementType {
    const typeMap: Record<string, OrgElementType> = {
      'org': 1,      // 机构
      'dept': 2,    // 部门
      'group': 4,   // 群组
      'post': 3     // 岗位
    };
    return typeMap[ekpType] || 2; // 默认为部门
  }

  /**
   * 映射性别
   */
  private mapGender(sex?: string): 1 | 2 {
    if (sex === 'M' || sex === '男') {
      return 1; // 男
    } else if (sex === 'F' || sex === '女') {
      return 2; // 女
    }
    return 1; // 默认为男
  }

  /**
   * 数据清洗
   * 过滤无效数据、离职人员等
   */
  async filterData(ekpData: EKPOrgElement[]): Promise<EKPOrgElement[]> {
    const filterInactive = await orgSyncConfigRepository.getBoolean('sync.filter_inactive_users', true);
    const requireLoginName = await orgSyncConfigRepository.getBoolean('sync.require_person_login_name', false); // 默认不需要登录名

    return ekpData.filter((item) => {
      // 如果启用过滤无效数据，则过滤掉 isAvailable 为 false 的数据
      if (filterInactive && item.isAvailable === false) {
        return false;
      }

      // 过滤无效的数据
      if (!item.id || !item.name || !item.type) {
        return false;
      }

      // 过滤人员类型中缺少登录名的数据（如果需要登录）
      if (item.type === 'person' && requireLoginName && !item.loginName) {
        console.warn(`[数据清洗] 过滤掉没有登录名的人员: ${item.name} (${item.id})`);
        return false;
      }

      return true;
    });
  }

  /**
   * 检查数据是否有效
   */
  isValidData(ekpData: EKPOrgElement): boolean {
    return !!(ekpData.id && ekpData.name && ekpData.type);
  }

  /**
   * 提取组织类型统计
   */
  getStatsByType(ekpData: EKPOrgElement[]): Record<string, number> {
    const stats: Record<string, number> = {
      org: 0,
      dept: 0,
      group: 0,
      post: 0,
      person: 0
    };

    for (const item of ekpData) {
      if (stats[item.type] !== undefined) {
        stats[item.type]++;
      }
    }

    return stats;
  }

  /**
   * 批量映射组织元素
   */
  async batchMapOrgElements(ekpData: EKPOrgElement[]): Promise<OrgElementDTO[]> {
    const results: OrgElementDTO[] = [];

    for (const item of ekpData) {
      if (item.type === 'person') {
        continue; // 人员单独处理
      }

      const mapped = await this.mapToOrgElement(item);
      results.push(mapped);
    }

    return results;
  }

  /**
   * 批量映射人员
   */
  async batchMapOrgPersons(ekpData: EKPOrgElement[]): Promise<OrgPersonDTO[]> {
    const results: OrgPersonDTO[] = [];

    for (const item of ekpData) {
      if (item.type !== 'person') {
        continue; // 只处理人员
      }

      const mapped = await this.mapToOrgPerson(item);
      results.push(mapped);
    }

    return results;
  }

  /**
   * 比较数据是否需要更新
   */
  needUpdate(ekpData: EKPOrgElement, localData: Record<string, unknown>): boolean {
    // 比较关键字段
    if (ekpData.name !== localData.fd_name) {
      return true;
    }

    if (ekpData.no !== localData.fd_no) {
      return true;
    }

    if (ekpData.order && localData.fd_order !== parseInt(ekpData.order, 10)) {
      return true;
    }

    if (ekpData.isAvailable !== undefined && localData.fd_is_available !== ekpData.isAvailable) {
      return true;
    }

    if (ekpData.fd_parentid !== localData.fd_parentid) {
      return true;
    }

    return false;
  }
}

// 导出单例
export const orgSyncMapper = new OrgSyncMapper();
