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

export interface EKPFlowMapping {
  id: string;
  businessType: string;
  businessName: string;
  formUrl: string;
  templateId: string;
  enabled: boolean;
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

class EKPConfigManager {
  private config: EKPConfig | null = null;
  private flowMappings: EKPFlowMapping[] = [];
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
      const result = await dbManager.query<Record<string, unknown>>('SELECT * FROM ekp_configs LIMIT 1');
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        this.config = {
          baseUrl: (row.base_url as string) || (row.url as string) || '',
          username: (row.username as string) || '',
          password: (row.password as string) || '',
          apiPath: (row.api_path as string) || '/api/sys-notify/sysNotifyTodoRestService/getTodo',
          enabled: (row.enabled as number) === 1 || row.enabled === true,
          ssoEnabled: (row.sso_enabled as number) === 1 || row.sso_enabled === true || (row.sso_enabled as string) === 'true',
          ssoServiceId: (row.sso_service_id as string) || 'loginWebserviceService',
          ssoWebservicePath: (row.sso_webservice_path as string) || '/sys/webserviceservice/',
          ssoLoginPath: (row.sso_login_path as string) || '/sys/authentication/sso/login_auto.jsp',
          ssoSessionVerifyPath: (row.sso_session_verify_path as string) || '/sys/org/sys-inf/sysInfo.do?method=currentUser',
          proxyEnabled: (row.proxy_enabled as number) === 1 || row.proxy_enabled === true || (row.proxy_enabled as string) === 'true',
          proxyPath: (row.proxy_path as string) || '/api/ekp-proxy',
          leaveTemplateId: (row.leave_template_id as string) || '',
          expenseTemplateId: (row.expense_template_id as string) || '',
          tripTemplateId: (row.trip_template_id as string) || '',
          purchaseTemplateId: (row.purchase_template_id as string) || '',
        };
      } else {
        // 默认配置
        this.config = this.getDefaultConfig();
      }

      // 加载流程映射
      try {
        const mappingResult = await dbManager.query<Record<string, unknown>>('SELECT * FROM ekp_flow_mappings ORDER BY business_type ASC');
        this.flowMappings = mappingResult.rows ? mappingResult.rows.map(row => ({
          id: row.id as string,
          businessType: row.business_type as string,
          businessName: row.business_name as string,
          formUrl: row.form_url as string,
          templateId: row.template_id as string,
          enabled: (row.enabled as number) === 1 || row.enabled === true,
        })) : [];
      } catch (e) {
        // 表可能不存在
        this.flowMappings = [];
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
   * 获取流程映射列表
   */
  getFlowMappings(): EKPFlowMapping[] {
    return this.flowMappings;
  }

  /**
   * 根据业务类型获取流程映射
   */
  getFlowMappingByType(businessType: string): EKPFlowMapping | undefined {
    return this.flowMappings.find(m => m.businessType === businessType && m.enabled);
  }

  /**
   * 保存完整配置
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

      if (exists) {
        // 更新
        await dbManager.query(
          `UPDATE ekp_configs SET
           base_url = ?,
           url = ?,
           username = ?,
           password = ?,
           api_path = ?,
           enabled = ?,
           sso_enabled = ?,
           sso_service_id = ?,
           sso_webservice_path = ?,
           sso_login_path = ?,
           sso_session_verify_path = ?,
           proxy_enabled = ?,
           proxy_path = ?,
           leave_template_id = ?,
           expense_template_id = ?,
           trip_template_id = ?,
           purchase_template_id = ?,
           updated_at = NOW()
           WHERE id = (SELECT id FROM ekp_configs LIMIT 1)`,
          [
            newConfig.baseUrl,
            newConfig.baseUrl,
            newConfig.username,
            newConfig.password,
            newConfig.apiPath,
            newConfig.enabled ? 1 : 0,
            newConfig.ssoEnabled ? 1 : 0,
            newConfig.ssoServiceId,
            newConfig.ssoWebservicePath,
            newConfig.ssoLoginPath,
            newConfig.ssoSessionVerifyPath,
            newConfig.proxyEnabled ? 1 : 0,
            newConfig.proxyPath,
            newConfig.leaveTemplateId,
            newConfig.expenseTemplateId,
            newConfig.tripTemplateId,
            newConfig.purchaseTemplateId,
          ]
        );
      } else {
        // 创建
        await dbManager.query(
          `INSERT INTO ekp_configs (
           id, base_url, url, username, password, api_path, enabled,
           sso_enabled, sso_service_id, sso_webservice_path, sso_login_path, sso_session_verify_path,
           proxy_enabled, proxy_path, leave_template_id, expense_template_id, trip_template_id, purchase_template_id,
           created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            'default',
            newConfig.baseUrl,
            newConfig.baseUrl,
            newConfig.username,
            newConfig.password,
            newConfig.apiPath,
            newConfig.enabled ? 1 : 0,
            newConfig.ssoEnabled ? 1 : 0,
            newConfig.ssoServiceId,
            newConfig.ssoWebservicePath,
            newConfig.ssoLoginPath,
            newConfig.ssoSessionVerifyPath,
            newConfig.proxyEnabled ? 1 : 0,
            newConfig.proxyPath,
            newConfig.leaveTemplateId,
            newConfig.expenseTemplateId,
            newConfig.tripTemplateId,
            newConfig.purchaseTemplateId,
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
