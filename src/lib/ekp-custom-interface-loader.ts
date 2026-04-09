/**
 * EKP二开接口加载器
 * 从YAML配置文件加载二开接口配置
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

export interface EKPCustomInterface {
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
}

export class EKPCustomInterfaceLoader {
  private config: Map<string, EKPCustomInterface>;
  private configPath: string;
  private lastModified: number;

  constructor(configPath: string = 'config/ekp-custom-interfaces.yaml') {
    this.configPath = path.join(process.cwd(), configPath);
    this.config = new Map();
    this.lastModified = 0;
    this.load();
  }

  // 加载配置文件
  private load() {
    try {
      if (!fs.existsSync(this.configPath)) {
        console.warn(`[EKPCustomInterfaceLoader] 配置文件不存在: ${this.configPath}`);
        return;
      }

      const stats = fs.statSync(this.configPath);

      // 如果文件未修改，跳过加载
      if (stats.mtimeMs === this.lastModified) {
        return;
      }

      this.lastModified = stats.mtimeMs;

      const content = fs.readFileSync(this.configPath, 'utf-8');
      const yamlConfig = yaml.load(content) as any;

      this.config.clear();

      // 加载二开接口
      if (yamlConfig.custom && Array.isArray(yamlConfig.custom)) {
        yamlConfig.custom.forEach((item: any) => {
          this.config.set(item.code, item);
        });
      }

      console.log(`[EKPCustomInterfaceLoader] 加载了 ${this.config.size} 个二开接口配置`);
    } catch (error) {
      console.error('[EKPCustomInterfaceLoader] 加载配置失败:', error);
    }
  }

  // 热重载
  reload() {
    this.config.clear();
    this.lastModified = 0;
    this.load();
  }

  // 获取接口配置
  get(code: string): EKPCustomInterface | undefined {
    this.load(); // 检查文件是否更新
    return this.config.get(code);
  }

  // 获取所有接口
  getAll(): EKPCustomInterface[] {
    this.load(); // 检查文件是否更新
    return Array.from(this.config.values());
  }

  // 按分类获取接口
  getByCategory(category: string): EKPCustomInterface[] {
    this.load(); // 检查文件是否更新
    return this.getAll().filter(item => item.category === category);
  }

  // 搜索接口
  search(keyword: string): EKPCustomInterface[] {
    this.load(); // 检查文件是否更新
    return this.getAll().filter(item =>
      item.code.toLowerCase().includes(keyword.toLowerCase()) ||
      item.name.toLowerCase().includes(keyword.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(keyword.toLowerCase()))
    );
  }

  // 保存配置
  save(): boolean {
    try {
      const yamlConfig = {
        custom: this.getAll(),
      };

      const yamlContent = yaml.dump(yamlConfig, {
        indent: 2,
        lineWidth: -1,
      });

      fs.writeFileSync(this.configPath, yamlContent, 'utf-8');
      this.lastModified = Date.now();

      console.log(`[EKPCustomInterfaceLoader] 保存了 ${this.config.size} 个二开接口配置`);
      return true;
    } catch (error) {
      console.error('[EKPCustomInterfaceLoader] 保存配置失败:', error);
      return false;
    }
  }

  // 添加接口
  add(interfaceConfig: EKPCustomInterface): boolean {
    this.config.set(interfaceConfig.code, interfaceConfig);
    return this.save();
  }

  // 更新接口
  update(code: string, interfaceConfig: Partial<EKPCustomInterface>): boolean {
    const existing = this.config.get(code);
    if (!existing) return false;

    this.config.set(code, { ...existing, ...interfaceConfig });
    return this.save();
  }

  // 删除接口
  delete(code: string): boolean {
    const deleted = this.config.delete(code);
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  // 获取分类列表
  getCategories(): string[] {
    this.load();
    const categories = new Set<string>();
    this.config.forEach(item => categories.add(item.category));
    return Array.from(categories).sort();
  }

  // 获取统计信息
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    byCategory: Record<string, number>;
  } {
    this.load();

    const total = this.config.size;
    let enabled = 0;
    let disabled = 0;
    const byCategory: Record<string, number> = {};

    this.config.forEach(item => {
      if (item.enabled) {
        enabled++;
      } else {
        disabled++;
      }

      if (!byCategory[item.category]) {
        byCategory[item.category] = 0;
      }
      byCategory[item.category]++;
    });

    return {
      total,
      enabled,
      disabled,
      byCategory,
    };
  }

  // 批量获取接口
  getByCodes(codes: string[]): Map<string, EKPCustomInterface> {
    this.load();
    const result = new Map<string, EKPCustomInterface>();

    codes.forEach(code => {
      const item = this.config.get(code);
      if (item) {
        result.set(code, item);
      }
    });

    return result;
  }
}
