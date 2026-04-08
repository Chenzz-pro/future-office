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
  parent?: string;
  thisLeader?: string;
  superLeader?: string;
  members?: string[];
  persons?: string[];
  posts?: string[];
  loginName?: string;
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
   */
  async mapToOrgElement(ekpData: EKPOrgElement): Promise<OrgElementDTO> {
    const type = this.mapOrgType(ekpData.type);

    // 正确处理 isAvailable 字段，支持字符串和布尔值
    let isAvailable = true;
    const isAvailableValue = String(ekpData.isAvailable ?? '').toLowerCase();
    if (isAvailableValue === 'false' || isAvailableValue === '0' || ekpData.isAvailable === false) {
      isAvailable = false;
    }

    return {
      fd_id: ekpData.id,
      fd_org_type: type,
      fd_name: ekpData.name,
      fd_no: ekpData.no || undefined,
      fd_order: ekpData.order ? parseInt(ekpData.order, 10) : undefined,
      fd_keyword: ekpData.keyword || undefined,
      fd_is_available: isAvailable,
      fd_memo: ekpData.memo || undefined,
      fd_parentid: ekpData.parent || undefined,
      fd_parentorgid: ekpData.parent || undefined, // 父机构ID（与父部门ID相同）
      fd_this_leaderid: ekpData.thisLeader || undefined,
      fd_super_leaderid: ekpData.superLeader || undefined,
      // 群组成员特殊处理
      fd_persons_number: type === 3 ? ekpData.members?.length || 0 : undefined
    };
  }

  /**
   * 将EKP人员映射为本系统人员
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

    return {
      fd_id: ekpData.id,
      fd_name: ekpData.name,
      fd_login_name: ekpData.loginName || ekpData.id, // 使用ID作为默认登录名
      fd_password: defaultPassword || '123456', // 使用默认密码
      fd_no: ekpData.no || undefined,
      fd_order: ekpData.order ? parseInt(ekpData.order, 10) : undefined,
      fd_keyword: ekpData.keyword || undefined,
      fd_dept_id: ekpData.parent || undefined,
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

    if (ekpData.parent !== localData.fd_parentid) {
      return true;
    }

    return false;
  }
}

// 导出单例
export const orgSyncMapper = new OrgSyncMapper();
