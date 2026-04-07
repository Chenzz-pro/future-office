/**
 * EKP接口注册中心
 * 统一访问官方接口和二开接口
 */

import { EKPOfficialInterfaceRepository, EKPOfficialInterface } from './database/repositories/ekp-official-interface.repository';
import { EKPCustomInterfaceLoader, EKPCustomInterface } from './ekp-custom-interface-loader';

export interface EKPInterface {
  id?: string;
  code: string;
  name: string;
  category: string;
  path: string;
  serviceId: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  enabled: boolean;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  description?: string;
  version?: string;
  source: 'official' | 'custom';
  isSystem?: boolean;
}

export interface EKPInterfaceStats {
  total: number;
  official: number;
  custom: number;
  byCategory: Record<string, { official: number; custom: number }>;
}

export class EKPInterfaceRegistry {
  private officialRepo: EKPOfficialInterfaceRepository;
  private customLoader: EKPCustomInterfaceLoader;

  constructor() {
    this.officialRepo = new EKPOfficialInterfaceRepository();
    this.customLoader = new EKPCustomInterfaceLoader();
  }

  // 获取接口配置（自动查找官方和二开）
  async get(code: string): Promise<EKPInterface | null> {
    // 先查官方接口
    const official = await this.officialRepo.findByCode(code);
    if (official) {
      return this.convertToInterface(official, 'official');
    }

    // 再查二开接口
    const custom = this.customLoader.get(code);
    if (custom) {
      return this.convertToInterface(custom, 'custom');
    }

    return null;
  }

  // 批量获取接口
  async getBatch(codes: string[]): Promise<Map<string, EKPInterface>> {
    const result = new Map<string, EKPInterface>();

    // 批量查询官方接口
    const officialMap = await this.officialRepo.findByCodes(codes);
    officialMap.forEach((value, key) => {
      result.set(key, this.convertToInterface(value, 'official'));
    });

    // 查询二开接口
    codes.forEach(code => {
      if (!result.has(code)) {
        const custom = this.customLoader.get(code);
        if (custom) {
          result.set(code, this.convertToInterface(custom, 'custom'));
        }
      }
    });

    return result;
  }

  // 获取所有接口
  async getAll(): Promise<EKPInterface[]> {
    const official = await this.officialRepo.findAllIncludeDisabled();
    const custom = this.customLoader.getAll();

    return [
      ...official.map(i => this.convertToInterface(i, 'official')),
      ...custom.map(i => this.convertToInterface(i, 'custom')),
    ].sort((a, b) => a.code.localeCompare(b.code));
  }

  // 获取所有启用的接口
  async getAllEnabled(): Promise<EKPInterface[]> {
    const official = await this.officialRepo.findAll();
    const custom = this.customLoader.getAll().filter(item => item.enabled);

    return [
      ...official.map(i => this.convertToInterface(i, 'official')),
      ...custom.map(i => this.convertToInterface(i, 'custom')),
    ].sort((a, b) => a.code.localeCompare(b.code));
  }

  // 按分类获取接口
  async getByCategory(category: string): Promise<EKPInterface[]> {
    const official = await this.officialRepo.findByCategory(category);
    const custom = this.customLoader.getByCategory(category);

    return [
      ...official.map(i => this.convertToInterface(i, 'official')),
      ...custom.map(i => this.convertToInterface(i, 'custom')),
    ];
  }

  // 按来源获取接口
  async getBySource(source: 'official' | 'custom'): Promise<EKPInterface[]> {
    if (source === 'official') {
      const official = await this.officialRepo.findAllIncludeDisabled();
      return official.map(i => this.convertToInterface(i, 'official'));
    } else {
      const custom = this.customLoader.getAll();
      return custom.map(i => this.convertToInterface(i, 'custom'));
    }
  }

  // 搜索接口
  async search(keyword: string): Promise<EKPInterface[]> {
    const official = await this.officialRepo.search(keyword);
    const custom = this.customLoader.search(keyword);

    return [
      ...official.map(i => this.convertToInterface(i, 'official')),
      ...custom.map(i => this.convertToInterface(i, 'custom')),
    ];
  }

  // 重载二开接口配置
  reloadCustom(): void {
    this.customLoader.reload();
  }

  // 获取分类列表
  async getCategories(): Promise<string[]> {
    const officialCategories = await this.officialRepo.getCategories();
    const customCategories = this.customLoader.getCategories();

    const allCategories = new Set([...officialCategories, ...customCategories]);
    return Array.from(allCategories).sort();
  }

  // 获取统计信息
  async getStats(): Promise<EKPInterfaceStats> {
    const official = await this.officialRepo.findAllIncludeDisabled();
    const custom = this.customLoader.getAll();

    const byCategory: Record<string, { official: number; custom: number }> = {};

    official.forEach(item => {
      if (!byCategory[item.interfaceCategory]) {
        byCategory[item.interfaceCategory] = { official: 0, custom: 0 };
      }
      byCategory[item.interfaceCategory].official++;
    });

    custom.forEach(item => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = { official: 0, custom: 0 };
      }
      byCategory[item.category].custom++;
    });

    return {
      total: official.length + custom.length,
      official: official.length,
      custom: custom.length,
      byCategory,
    };
  }

  // 创建官方接口
  async createOfficial(data: Omit<EKPOfficialInterface, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return await this.officialRepo.create(data);
  }

  // 更新官方接口
  async updateOfficial(id: string, data: Partial<EKPOfficialInterface>): Promise<boolean> {
    return await this.officialRepo.update(id, data);
  }

  // 删除官方接口
  async deleteOfficial(id: string): Promise<boolean> {
    return await this.officialRepo.delete(id);
  }

  // 创建二开接口
  createCustom(data: EKPCustomInterface): boolean {
    return this.customLoader.add(data);
  }

  // 更新二开接口
  updateCustom(code: string, data: Partial<EKPCustomInterface>): boolean {
    return this.customLoader.update(code, data);
  }

  // 删除二开接口
  deleteCustom(code: string): boolean {
    return this.customLoader.delete(code);
  }

  private convertToInterface(
    data: EKPOfficialInterface | EKPCustomInterface,
    source: 'official' | 'custom'
  ): EKPInterface {
    if (source === 'official') {
      const official = data as EKPOfficialInterface;
      return {
        id: official.id,
        code: official.interfaceCode,
        name: official.interfaceName,
        category: official.interfaceCategory,
        path: official.apiPath,
        serviceId: official.serviceId,
        method: official.httpMethod,
        enabled: official.enabled,
        request: official.requestTemplate,
        response: official.responseParser,
        description: official.description,
        version: official.version,
        source,
        isSystem: official.isSystem,
      };
    } else {
      const custom = data as EKPCustomInterface;
      return {
        code: custom.code,
        name: custom.name,
        category: custom.category,
        path: custom.path,
        serviceId: custom.serviceId,
        method: custom.method,
        enabled: custom.enabled,
        request: custom.request,
        response: custom.response,
        description: custom.description,
        version: custom.version,
        source,
      };
    }
  }
}

// 单例实例
export const ekpInterfaceRegistry = new EKPInterfaceRegistry();
