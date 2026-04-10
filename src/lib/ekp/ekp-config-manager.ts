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
          baseUrl: (row.ekp_address as string) || (row.base_url as string) || (row.url as string) || '',
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
   * 确保数据库表有所有需要的字段
   */
  private async ensureColumnsExist(): Promise<void> {
    try {
      // 获取当前表的字段列表
      const columnsResult = await dbManager.query<{ Field: string }>(
        `SELECT COLUMN_NAME as Field FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ekp_configs'`
      );
      const existingColumns = new Set(
        columnsResult.rows?.map(row => row.Field.toLowerCase()) || []
      );
      
      // 需要确保存在的字段
      const requiredColumns = [
        { name: 'enabled', definition: 'TINYINT(1) DEFAULT 0' },
        { name: 'api_path', definition: 'VARCHAR(256) DEFAULT "/api/sys-notify/sysNotifyTodoRestService/getTodo"' },
        { name: 'sso_enabled', definition: 'TINYINT(1) DEFAULT 1' },
        { name: 'sso_service_id', definition: 'VARCHAR(128) DEFAULT "loginWebserviceService"' },
        { name: 'sso_webservice_path', definition: 'VARCHAR(256) DEFAULT "/sys/webserviceservice/"' },
        { name: 'sso_login_path', definition: 'VARCHAR(256) DEFAULT "/sys/authentication/sso/login_auto.jsp"' },
        { name: 'sso_session_verify_path', definition: 'VARCHAR(256) DEFAULT "/sys/org/sys-inf/sysInfo.do?method=currentUser"' },
        { name: 'proxy_enabled', definition: 'TINYINT(1) DEFAULT 1' },
        { name: 'proxy_path', definition: 'VARCHAR(128) DEFAULT "/api/ekp-proxy"' },
        { name: 'leave_template_id', definition: 'VARCHAR(128) DEFAULT ""' },
        { name: 'expense_template_id', definition: 'VARCHAR(128) DEFAULT ""' },
        { name: 'trip_template_id', definition: 'VARCHAR(128) DEFAULT ""' },
        { name: 'purchase_template_id', definition: 'VARCHAR(128) DEFAULT ""' },
      ];
      
      for (const col of requiredColumns) {
        if (!existingColumns.has(col.name.toLowerCase())) {
          console.log(`[EKPConfigManager] 添加缺失字段: ${col.name}`);
          try {
            await dbManager.query(
              `ALTER TABLE ekp_configs ADD COLUMN ${col.name} ${col.definition}`
            );
          } catch (alterError) {
            // 忽略字段已存在的错误
            const mysqlError = alterError as { code?: string };
            if (mysqlError.code !== 'ER_DUP_FIELDNAME') {
              console.error(`[EKPConfigManager] 添加字段 ${col.name} 失败:`, alterError);
            }
          }
        }
      }
    } catch (error) {
      console.error('[EKPConfigManager] 检查字段失败:', error);
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
      console.log('[EKPConfigManager:save] 开始保存配置...');
      
      // 首先确保 ekp_configs 表存在记录
      const checkResult = await dbManager.query<{ id: string }>('SELECT id FROM ekp_configs LIMIT 1');
      let recordExists = checkResult.rows && checkResult.rows.length > 0;
      
      if (!recordExists) {
        // 插入默认记录
        console.log('[EKPConfigManager:save] 表中无记录，插入默认记录...');
        await dbManager.query(
          `INSERT INTO ekp_configs (id, ekp_address, username, auth_type) VALUES ('default', '', '', 'basic')`
        );
        recordExists = true;
      }
      
      // 确保所有需要的字段存在
      await this.ensureColumnsExist();
      
      // 直接使用传入的配置
      const newConfig = { ...config };
      
      // 构建动态 UPDATE SQL，只更新提供的字段
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];

      if (config.baseUrl !== undefined) {
        updateFields.push('ekp_address = ?');
        updateValues.push(config.baseUrl);
      }
      if (config.username !== undefined) {
        updateFields.push('username = ?');
        updateValues.push(config.username);
      }
      if (config.password !== undefined) {
        updateFields.push('password = ?');
        updateValues.push(config.password);
      }
      if (config.apiPath !== undefined) {
        updateFields.push('api_path = ?');
        updateValues.push(config.apiPath);
      }
      if (config.enabled !== undefined) {
        updateFields.push('enabled = ?');
        updateValues.push(config.enabled ? 1 : 0);
      }
      if (config.ssoEnabled !== undefined) {
        updateFields.push('sso_enabled = ?');
        updateValues.push(config.ssoEnabled ? 1 : 0);
      }
      if (config.ssoServiceId !== undefined) {
        updateFields.push('sso_service_id = ?');
        updateValues.push(config.ssoServiceId);
      }
      if (config.ssoWebservicePath !== undefined) {
        updateFields.push('sso_webservice_path = ?');
        updateValues.push(config.ssoWebservicePath);
      }
      if (config.ssoLoginPath !== undefined) {
        updateFields.push('sso_login_path = ?');
        updateValues.push(config.ssoLoginPath);
      }
      if (config.ssoSessionVerifyPath !== undefined) {
        updateFields.push('sso_session_verify_path = ?');
        updateValues.push(config.ssoSessionVerifyPath);
      }
      if (config.proxyEnabled !== undefined) {
        updateFields.push('proxy_enabled = ?');
        updateValues.push(config.proxyEnabled ? 1 : 0);
      }
      if (config.proxyPath !== undefined) {
        updateFields.push('proxy_path = ?');
        updateValues.push(config.proxyPath);
      }
      if (config.leaveTemplateId !== undefined) {
        updateFields.push('leave_template_id = ?');
        updateValues.push(config.leaveTemplateId);
      }
      if (config.expenseTemplateId !== undefined) {
        updateFields.push('expense_template_id = ?');
        updateValues.push(config.expenseTemplateId);
      }
      if (config.tripTemplateId !== undefined) {
        updateFields.push('trip_template_id = ?');
        updateValues.push(config.tripTemplateId);
      }
      if (config.purchaseTemplateId !== undefined) {
        updateFields.push('purchase_template_id = ?');
        updateValues.push(config.purchaseTemplateId);
      }

      if (updateFields.length === 0) {
        console.log('[EKPConfigManager:save] 没有字段需要更新');
        return true;
      }

      updateFields.push('updated_at = NOW()');

      // 直接执行 UPDATE
      const updateSql = `UPDATE ekp_configs SET ${updateFields.join(', ')} LIMIT 1`;
      console.log('[EKPConfigManager:save] 执行更新 SQL...');
      
      const result = await dbManager.query(updateSql, updateValues);
      console.log('[EKPConfigManager:save] 更新结果:', result);

      // 检查是否影响行
      if (result.affectedRows === 0) {
        // 如果没有更新任何行，尝试插入新记录
        console.log('[EKPConfigManager:save] 没有更新任何行，尝试插入...');
        const insertFields = ['id', ...updateFields.slice(0, -1)]; // 移除 updated_at
        const insertPlaceholders = ['?', ...Array(insertFields.length - 1).fill('?')];
        
        const insertSql = `INSERT INTO ekp_configs (${insertFields.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`;
        await dbManager.query(insertSql, ['default', ...updateValues.slice(0, -1)]);
      }

      // 更新内存中的配置
      this.config = { ...this.config, ...newConfig } as EKPConfig;
      this.loaded = true;
      console.log('[EKPConfigManager:save] 配置保存成功');
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
