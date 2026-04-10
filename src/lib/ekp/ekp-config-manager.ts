/**
 * EKP 统一配置管理器
 * 集中管理所有 EKP 相关配置，包括连接、SSO、代理、流程映射等
 */

import { dbManager } from '@/lib/database';

export interface EKPSSOConfig {
  enabled: boolean;
  serviceId: string;
  webservicePath: string;
  loginPath: string;
  sessionVerifyPath: string;
}

export interface EKPProxyConfig {
  enabled: boolean;
  path: string;
}

export interface EKPFormTemplateConfig {
  leaveTemplateId: string;
  expenseTemplateId: string;
  tripTemplateId: string;
  purchaseTemplateId: string;
}

export interface EKPBaseConfig {
  baseUrl: string;
  username: string;
  password: string;
  apiPath: string;
  enabled: boolean;
}

// 扩展配置接口，存储在 config JSON 字段中
export interface EKPExtraConfig {
  ssoEnabled?: boolean;
  ssoServiceId?: string;
  ssoWebservicePath?: string;
  ssoLoginPath?: string;
  ssoSessionVerifyPath?: string;
  proxyEnabled?: boolean;
  proxyPath?: string;
  leaveTemplateId?: string;
  expenseTemplateId?: string;
  tripTemplateId?: string;
  purchaseTemplateId?: string;
  apiPath?: string;
  enabled?: boolean;
}

export interface EKPConfig extends EKPBaseConfig {
  // SSO 配置
  ssoEnabled: boolean;
  ssoServiceId: string;
  ssoWebservicePath: string;
  ssoLoginPath: string;
  ssoSessionVerifyPath: string;

  // 代理配置
  proxyEnabled: boolean;
  proxyPath: string;

  // 表单模板配置
  leaveTemplateId: string;
  expenseTemplateId: string;
  tripTemplateId: string;
  purchaseTemplateId: string;
}

// 数据库行类型
interface EkpConfigRow {
  id: string;
  user_id: string;
  ekp_address: string;
  username: string;
  password: string;
  auth_type: string;
  config: string | null;
  created_at: Date;
  updated_at: Date;
}

class EKPConfigManager {
  private config: EKPConfig | null = null;
  private loaded = false;

  /**
   * 加载配置
   */
  async load(): Promise<void> {
    if (!dbManager.isConnected()) {
      console.warn('EKPConfigManager: 数据库未连接，跳过加载');
      return;
    }

    try {
      // 加载基础配置
      const result = await dbManager.query<EkpConfigRow>('SELECT * FROM ekp_configs LIMIT 1');
      
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        
        // 解析 JSON 配置
        let extraConfig: EKPExtraConfig = {};
        if (row.config) {
          try {
            extraConfig = JSON.parse(row.config);
          } catch (e) {
            console.warn('解析 config JSON 失败:', e);
          }
        }

        this.config = {
          baseUrl: row.ekp_address || extraConfig.apiPath || '',
          username: row.username || '',
          password: row.password || '',
          apiPath: extraConfig.apiPath || '/api/sys-notify/sysNotifyTodoRestService/getTodo',
          enabled: extraConfig.enabled ?? true,
          ssoEnabled: extraConfig.ssoEnabled ?? true,
          ssoServiceId: extraConfig.ssoServiceId || 'loginWebserviceService',
          ssoWebservicePath: extraConfig.ssoWebservicePath || '/sys/webserviceservice/',
          ssoLoginPath: extraConfig.ssoLoginPath || '/sys/authentication/sso/login_auto.jsp',
          ssoSessionVerifyPath: extraConfig.ssoSessionVerifyPath || '/sys/org/sys-inf/sysInfo.do?method=currentUser',
          proxyEnabled: extraConfig.proxyEnabled ?? true,
          proxyPath: extraConfig.proxyPath || '/api/ekp-proxy',
          leaveTemplateId: extraConfig.leaveTemplateId || '',
          expenseTemplateId: extraConfig.expenseTemplateId || '',
          tripTemplateId: extraConfig.tripTemplateId || '',
          purchaseTemplateId: extraConfig.purchaseTemplateId || '',
        };
      } else {
        // 默认配置
        this.config = this.getDefaultConfig();
      }

      this.loaded = true;
    } catch (error) {
      console.error('EKPConfigManager: 加载配置失败', error);
    }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): EKPConfig {
    return {
      baseUrl: '',
      username: '',
      password: '',
      apiPath: '/api/sys-notify/sysNotifyTodoRestService/getTodo',
      enabled: true,
      ssoEnabled: true,
      ssoServiceId: 'loginWebserviceService',
      ssoWebservicePath: '/sys/webserviceservice/',
      ssoLoginPath: '/sys/authentication/sso/login_auto.jsp',
      ssoSessionVerifyPath: '/sys/org/sys-inf/sysInfo.do?method=currentUser',
      proxyEnabled: true,
      proxyPath: '/api/ekp-proxy',
      leaveTemplateId: '',
      expenseTemplateId: '',
      tripTemplateId: '',
      purchaseTemplateId: '',
    };
  }

  /**
   * 获取完整配置
   */
  getConfig(): EKPConfig {
    return this.config || this.getDefaultConfig();
  }

  /**
   * 获取基础配置
   */
  getBaseConfig(): EKPBaseConfig {
    const cfg = this.getConfig();
    return {
      baseUrl: cfg.baseUrl,
      username: cfg.username,
      password: cfg.password,
      apiPath: cfg.apiPath,
      enabled: cfg.enabled,
    };
  }

  /**
   * 获取 SSO 配置
   */
  getSSOConfig(): EKPSSOConfig {
    const cfg = this.getConfig();
    return {
      enabled: cfg.ssoEnabled,
      serviceId: cfg.ssoServiceId,
      webservicePath: cfg.ssoWebservicePath,
      loginPath: cfg.ssoLoginPath,
      sessionVerifyPath: cfg.ssoSessionVerifyPath,
    };
  }

  /**
   * 获取代理配置
   */
  getProxyConfig(): EKPProxyConfig {
    const cfg = this.getConfig();
    return {
      enabled: cfg.proxyEnabled,
      path: cfg.proxyPath,
    };
  }

  /**
   * 获取表单模板配置
   */
  getFormTemplateConfig(): EKPFormTemplateConfig {
    const cfg = this.getConfig();
    return {
      leaveTemplateId: cfg.leaveTemplateId,
      expenseTemplateId: cfg.expenseTemplateId,
      tripTemplateId: cfg.tripTemplateId,
      purchaseTemplateId: cfg.purchaseTemplateId,
    };
  }

  /**
   * 保存完整配置
   * 注意：使用 config JSON 字段存储扩展配置
   */
  async save(config: Partial<EKPConfig>): Promise<boolean> {
    if (!dbManager.isConnected()) {
      console.error('EKPConfigManager: 数据库未连接，无法保存');
      return false;
    }

    try {
      // 合并配置
      const newConfig = { ...this.getConfig(), ...config };

      // 检查是否存在记录
      const checkResult = await dbManager.query<{ count: number }>('SELECT COUNT(*) as count FROM ekp_configs');
      const exists = checkResult.rows && checkResult.rows.length > 0 && (checkResult.rows[0].count || 0) > 0;

      // 构建 config JSON
      const extraConfig: EKPExtraConfig = {
        ssoEnabled: newConfig.ssoEnabled,
        ssoServiceId: newConfig.ssoServiceId,
        ssoWebservicePath: newConfig.ssoWebservicePath,
        ssoLoginPath: newConfig.ssoLoginPath,
        ssoSessionVerifyPath: newConfig.ssoSessionVerifyPath,
        proxyEnabled: newConfig.proxyEnabled,
        proxyPath: newConfig.proxyPath,
        leaveTemplateId: newConfig.leaveTemplateId,
        expenseTemplateId: newConfig.expenseTemplateId,
        tripTemplateId: newConfig.tripTemplateId,
        purchaseTemplateId: newConfig.purchaseTemplateId,
        apiPath: newConfig.apiPath,
        enabled: newConfig.enabled,
      };

      if (exists) {
        // 更新 - 直接更新记录
        await dbManager.query(
          `UPDATE ekp_configs SET
           ekp_address = ?,
           username = ?,
           password = ?,
           config = ?,
           updated_at = NOW()
           WHERE id = (SELECT id FROM ekp_configs LIMIT 1)`,
          [
            newConfig.baseUrl,
            newConfig.username,
            newConfig.password,
            JSON.stringify(extraConfig),
          ]
        );
      } else {
        // 创建新记录
        await dbManager.query(
          `INSERT INTO ekp_configs (id, user_id, ekp_address, username, password, auth_type, config, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            'default',
            '00000000-0000-0000-0000-000000000000', // system user
            newConfig.baseUrl,
            newConfig.username,
            newConfig.password,
            'basic',
            JSON.stringify(extraConfig),
          ]
        );
      }

      // 更新内存中的配置
      this.config = newConfig;
      this.loaded = true;
      return true;
    } catch (error) {
      console.error('EKPConfigManager: 保存配置失败', error);
      return false;
    }
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<void> {
    this.loaded = false;
    await this.load();
  }

  /**
   * 检查是否已加载
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * 获取 EKP 基础地址
   */
  getBaseUrl(): string {
    return this.getConfig().baseUrl;
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.getConfig().enabled;
  }

  /**
   * 检查 SSO 是否启用
   */
  isSSOEnabled(): boolean {
    return this.getConfig().ssoEnabled;
  }

  /**
   * 检查代理是否启用
   */
  isProxyEnabled(): boolean {
    return this.getConfig().proxyEnabled;
  }

  /**
   * 获取代理路径
   */
  getProxyPath(): string {
    return this.getConfig().proxyPath;
  }
}

// 单例
export const ekpConfigManager = new EKPConfigManager();
