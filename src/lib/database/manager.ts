// 数据库连接管理器

import mysql from 'mysql2/promise';
import type { DatabaseConfig, DatabaseConnectionOptions, QueryResult } from './types';
import { oneAPIManager } from '@/lib/oneapi';
import { OneAPIConfigRepository } from './repositories/oneapi-config.repository';
import { FlowMappingRepository } from './repositories/flow-mapping.repository';

// 使用全局变量确保单例在所有模块中共享
// @ts-ignore
declare global {
  // eslint-disable-next-line no-var
  var __dbManagerInstance__: DatabaseManager | undefined;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: mysql.Pool | null = null;
  private config: DatabaseConfig | null = null;
  private keepAliveTimer: NodeJS.Timeout | null = null;

  // OneAPI配置Repository
  public oneAPIConfigRepository: OneAPIConfigRepository | null = null;

  // 流程映射Repository
  public flowMappingRepository: FlowMappingRepository | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // 使用全局变量确保单例在所有模块中共享
  public static getGlobalInstance(): DatabaseManager {
    if (typeof globalThis.__dbManagerInstance__ === 'undefined') {
      globalThis.__dbManagerInstance__ = DatabaseManager.getInstance();
    }
    return globalThis.__dbManagerInstance__;
  }

  /**
   * 初始化数据库连接
   */
  public async connect(config: DatabaseConfig): Promise<void> {
    try {
      // 如果已有连接，先关闭
      if (this.pool) {
        await this.disconnect();
      }

      const options: DatabaseConnectionOptions = {
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.databaseName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 10, // 允许排队，避免直接报错
      };

      this.pool = mysql.createPool(options);
      this.config = config;

      // 测试连接
      await this.pool.getConnection();
      console.log('✅ 数据库连接成功:', config.name);

      // 自动迁移：修复旧的 system user ID
      await this.migrateSystemUserId();

      // 自动初始化组织架构表
      await this.autoInitTables();

      // 加载oneAPI配置
      await this.loadOneAPIConfig();

      // 启动心跳保活机制（每5分钟检查一次）
      this.startKeepAlive();
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      throw new Error(`数据库连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 断开数据库连接
   */
  public async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.config = null;
      console.log('✅ 数据库连接已断开');
    }

    // 停止心跳保活
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  /**
   * 心跳保活机制
   */
  private startKeepAlive(): void {
    // 清除旧的定时器
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
    }

    // 每3分钟检查一次连接（原来是5分钟）
    this.keepAliveTimer = setInterval(async () => {
      try {
        if (this.pool) {
          // 执行一个简单的查询来保持连接活跃
          await this.query('SELECT 1');
          console.log('[KeepAlive] 数据库连接保活成功');
        }
      } catch (error) {
        console.error('[KeepAlive] 数据库连接保活失败，尝试重新连接:', error);

        // 如果保活失败，尝试重新连接
        if (this.config) {
          try {
            await this.connect(this.config);
          } catch (reconnectError) {
            console.error('[KeepAlive] 重新连接失败:', reconnectError);
          }
        }
      }
    }, 3 * 60 * 1000); // 3分钟
  }

  /**
   * 执行查询
   */
  public async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('数据库未连接');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [results] = await this.pool.execute(sql, params as any);
       
      return {
         
        rows: results as T[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        affectedRows: (results as any).affectedRows,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        insertId: (results as any).insertId,
      };
    } catch (error: unknown) {
      // 检查是否是连接丢失错误
      const mysqlError = error as { code?: string };
      if (mysqlError.code === 'PROTOCOL_CONNECTION_LOST' || 
          mysqlError.code === 'ECONNRESET' ||
          mysqlError.code === 'ER_SERVER_LOST' ||
          mysqlError.code === 'ETIMEDOUT') {
        console.error('[Query] 数据库连接丢失，尝试重新连接:', mysqlError.code);
        
        // 尝试重新连接
        if (this.config) {
          try {
            await this.connect(this.config);
            console.log('[Query] 数据库重新连接成功，重新执行查询');
            
            // 重新执行查询
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [results] = await this.pool!.execute(sql, params as any);
            return {
              rows: results as T[],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              affectedRows: (results as any).affectedRows,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              insertId: (results as any).insertId,
            };
          } catch (reconnectError) {
            console.error('[Query] 数据库重新连接失败:', reconnectError);
            throw reconnectError;
          }
        }
      }
      
      console.error('查询失败:', error);
      throw error;
    }
  }

  /**
   * 执行事务
   */
  public async transaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('数据库未连接');
    }

    try {
      const connection = await this.pool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error: unknown) {
      // 检查是否是连接丢失错误
      const mysqlError = error as { code?: string };
      if (mysqlError.code === 'PROTOCOL_CONNECTION_LOST' || 
          mysqlError.code === 'ECONNRESET' ||
          mysqlError.code === 'ER_SERVER_LOST' ||
          mysqlError.code === 'ETIMEDOUT') {
        console.error('[Transaction] 数据库连接丢失，尝试重新连接:', mysqlError.code);
        
        // 尝试重新连接
        if (this.config) {
          await this.connect(this.config);
          console.log('[Transaction] 数据库重新连接成功');
        }
      }
      throw error;
    }
  }

  /**
   * 获取当前配置
   */
  public getConfig(): DatabaseConfig | null {
    return this.config;
  }

  /**
   * 检查连接状态
   */
  public isConnected(): boolean {
    const connected = this.pool !== null;
    console.log(`[isConnected] pool=${!!this.pool}, connected=${connected}`);
    return connected;
  }

  /**
   * 测试数据库连接（使用临时连接池）
   * 用于在正式连接前验证配置是否正确
   */
  public async testConnection(config: DatabaseConfig): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
  }> {
    console.log('[DBManager:testConnection] 开始测试连接...', {
      host: config.host,
      port: config.port,
      databaseName: config.databaseName,
      username: config.username,
    });

    const testPool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.databaseName,
      waitForConnections: true,
      connectionLimit: 1,
    });

    try {
      await testPool.getConnection();
      console.log('[DBManager:testConnection] ✅ 连接测试成功');
      return { success: true };
    } catch (error: unknown) {
      console.error('[DBManager:testConnection] ❌ 连接测试失败:', error);
      const err = error as { code?: string; message?: string };
      return {
        success: false,
        error: err.message || 'Unknown error',
        errorCode: err.code,
      };
    } finally {
      await testPool.end();
      console.log('[DBManager:testConnection] 临时连接池已关闭');
    }
  }

  /**
   * 自动迁移：修复旧的 system user ID
   * 将所有 user_id = 'system' 的记录更新为正确的 UUID
   */
  private async migrateSystemUserId(): Promise<void> {
    try {
      const OLD_USER_ID = 'system';
      const NEW_USER_ID = '00000000-0000-0000-0000-000000000000';

      // 检查 api_keys 表是否存在
      const tableCheckResult = await this.query(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
        ['api_keys']
      );
      const apiKeysExists = (tableCheckResult.rows[0] as { count: number })?.count > 0;

      if (!apiKeysExists) {
        console.log('[Migration] api_keys 表不存在，跳过迁移');
        return;
      }

      // 检查是否需要迁移
      const checkResult = await this.query(
        `SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?`,
        [OLD_USER_ID]
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const count = (checkResult.rows[0] as any).count;

      if (count > 0) {
        console.log(`[Migration] 发现 ${count} 条旧数据需要迁移...`);

        // 更新 api_keys 表
        await this.query(
          `UPDATE api_keys SET user_id = ? WHERE user_id = ?`,
          [NEW_USER_ID, OLD_USER_ID]
        );
        console.log('[Migration] api_keys 表迁移完成');

        // 更新 ekp_configs 表
        try {
          await this.query(
            `UPDATE ekp_configs SET user_id = ? WHERE user_id = ?`,
            [NEW_USER_ID, OLD_USER_ID]
          );
          console.log('[Migration] ekp_configs 表迁移完成');
        } catch (error) {
          console.log('[Migration] ekp_configs 表不存在或迁移失败，跳过');
        }

        // 更新其他表（如果有）
        try {
          await this.query(
            `UPDATE chat_sessions SET user_id = ? WHERE user_id = ?`,
            [NEW_USER_ID, OLD_USER_ID]
          );
          console.log('[Migration] chat_sessions 表迁移完成');
        } catch (error) {
          // 表可能不存在，忽略错误
        }

        try {
          await this.query(
            `UPDATE custom_skills SET user_id = ? WHERE user_id = ?`,
            [NEW_USER_ID, OLD_USER_ID]
          );
          console.log('[Migration] custom_skills 表迁移完成');
        } catch (error) {
          // 表可能不存在，忽略错误
        }

        console.log('[Migration] ✅ 所有数据迁移完成');
      }
    } catch (error) {
      // 迁移失败不影响正常使用，只记录日志
      console.error('[Migration] 数据迁移失败:', error);
    }
  }

  /**
   * 自动初始化组织架构表
   */
  private async autoInitTables(): Promise<void> {
    try {
      // 检查组织架构表是否已存在
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checkResult = await this.query<any>(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?, ?)',
        ['sys_org_element', 'sys_org_person']
      );

      const count = checkResult.rows[0]?.count || 0;

      if (count >= 2) {
        console.log('[AutoInit] 组织架构表已存在，跳过初始化');
      } else {
        console.log('[AutoInit] 开始初始化组织架构表...');

        // 创建组织元素表
        await this.query(`
          CREATE TABLE IF NOT EXISTS sys_org_element (
            fd_id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
            fd_org_type INT NOT NULL COMMENT '类型：1=机构，2=部门，3=岗位',
            fd_name VARCHAR(200) NOT NULL COMMENT '名称',
            fd_order INT DEFAULT 0 COMMENT '排序号',
            fd_no VARCHAR(100) COMMENT '编号',
            fd_keyword VARCHAR(100) COMMENT '关键字',
            fd_is_available TINYINT(1) DEFAULT 1 COMMENT '是否有效',
            fd_is_business TINYINT(1) DEFAULT 0 COMMENT '是否业务相关',
            fd_import_info VARCHAR(200) COMMENT '导入的数据的对应键值',
            fd_org_email VARCHAR(450) COMMENT '邮件地址',
            fd_persons_number INT DEFAULT 0 COMMENT '人员总数',
            fd_memo TEXT COMMENT '备注',
            fd_hierarchy_id VARCHAR(450) COMMENT '层级ID',
            fd_create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            fd_alter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
            fd_is_external TINYINT(1) DEFAULT 0 COMMENT '是否外部组织',
            fd_this_leaderid VARCHAR(36) COMMENT '本级领导',
            fd_super_leaderid VARCHAR(36) COMMENT '上级领导',
            fd_parentorgid VARCHAR(36) COMMENT '父机构ID',
            fd_parentid VARCHAR(36) COMMENT '上级部门ID',
            fd_name_pinyin VARCHAR(400) COMMENT '拼音名称',
            fd_name_simple_pinyin VARCHAR(100) COMMENT '名称简拼',
            fd_is_abandon TINYINT(1) DEFAULT 0 COMMENT '是否废弃',
            fd_flag_deleted VARCHAR(200) COMMENT 'OMS导入字段',
            fd_ldap_dn VARCHAR(450) COMMENT 'OMS导入字段',
            fd_pre_dept_id VARCHAR(36) COMMENT '上一个部门ID',
            fd_pre_post_ids VARCHAR(2000) COMMENT '上一个岗位ID',
            fd_creator_id VARCHAR(36) COMMENT '创建者ID',
            INDEX idx_org_type (fd_org_type),
            INDEX idx_parentid (fd_parentid),
            INDEX idx_parentorgid (fd_parentorgid),
            INDEX idx_hierarchy_id (fd_hierarchy_id),
            INDEX fd_name_pinyin (fd_name_pinyin),
            INDEX fd_name_simple_pinyin (fd_name_simple_pinyin)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('[AutoInit] sys_org_element 表创建成功');

        // 创建人员表
        await this.query(`
          CREATE TABLE IF NOT EXISTS sys_org_person (
            fd_id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
            fd_name VARCHAR(100) NOT NULL COMMENT '姓名',
            fd_nickname VARCHAR(100) COMMENT '昵称',
            fd_no VARCHAR(50) COMMENT '编号',
            fd_dept_id VARCHAR(36) COMMENT '所在部门ID',
            fd_email VARCHAR(200) COMMENT '邮件地址',
            fd_mobile VARCHAR(50) COMMENT '手机号码',
            fd_office_phone VARCHAR(50) COMMENT '办公电话',
            fd_login_name VARCHAR(100) NOT NULL UNIQUE COMMENT '登录名',
            fd_password VARCHAR(255) COMMENT '密码',
            fd_default_language VARCHAR(50) DEFAULT 'zh-CN' COMMENT '默认语言',
            fd_keyword VARCHAR(200) COMMENT '关键字',
            fd_order INT DEFAULT 0 COMMENT '排序号',
            fd_position VARCHAR(100) COMMENT '职务',
            fd_post_id VARCHAR(36) COMMENT '所属岗位ID',
            fd_rtx_account VARCHAR(100) COMMENT 'RTX帐号',
            fd_dynamic_password VARCHAR(100) COMMENT '动态密码卡',
            fd_gender TINYINT(1) DEFAULT 1 COMMENT '性别：1=男，2=女',
            fd_wechat VARCHAR(100) COMMENT '微信号',
            fd_short_no VARCHAR(50) COMMENT '短号',
            fd_double_validation TINYINT(1) DEFAULT 0 COMMENT '双因子验证',
            fd_is_business_related TINYINT(1) DEFAULT 1 COMMENT '是否业务相关',
            fd_is_login_enabled TINYINT(1) DEFAULT 1 COMMENT '是否登录系统',
            fd_role ENUM('admin', 'user') DEFAULT 'user' COMMENT '用户角色：admin=管理员，user=普通用户',
            fd_memo TEXT COMMENT '备注',
            fd_create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            fd_alter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
            fd_creator_id VARCHAR(36) COMMENT '创建者ID',
            fd_lock_time TIMESTAMP NULL COMMENT '上锁时间',
            fd_staffing_level_id VARCHAR(36) COMMENT '员工级别ID',
            fd_user_type VARCHAR(50) DEFAULT 'internal' COMMENT '用户类型',
            fd_person_to_more_dept INT DEFAULT 0 COMMENT '是否是一人多部门',
            INDEX idx_dept_id (fd_dept_id),
            INDEX idx_post_id (fd_post_id),
            INDEX idx_login_name (fd_login_name),
            INDEX idx_role (fd_role),
            INDEX fd_name (fd_name)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('[AutoInit] sys_org_person 表创建成功');

        // 插入初始化数据
        // 插入根机构
        const orgId = crypto.randomUUID();
        await this.query(
          `
          INSERT IGNORE INTO sys_org_element (fd_id, fd_org_type, fd_name, fd_order, fd_no, fd_is_available, fd_is_business, fd_memo)
          VALUES (?, 1, ?, 0, ?, 1, 1, ?)
          `,
          [orgId, '未来办公集团', 'ORG001', '根机构']
        );

        // 插入默认管理员账号
        await this.query(
          `
          INSERT IGNORE INTO sys_org_person (
            fd_id, fd_name, fd_login_name, fd_password, fd_email, fd_role,
            fd_is_login_enabled, fd_is_business_related, fd_user_type
          )
          VALUES (?, ?, ?, ?, ?, ?, 1, 1, 'internal')
          `,
          [
            crypto.randomUUID(),
            '系统管理员',
            'admin',
            '$2b$10$DId8bUro45mx1.fpSIJJV.MXHImaJM4kdb9V34feSKiU7dmRxeOTq', // admin123
            'admin@example.com',
            'admin'
          ]
        );
        console.log('[AutoInit] 初始化数据成功');

        console.log('[AutoInit] ✅ 组织架构表初始化完成');
      }

      // 检查并确保 admin 用户存在（即使表已存在）
      try {
        console.log('[AutoInit] 检查 admin 用户是否存在...');
        const adminCheckResult = await this.query<{ count: number }>(
          'SELECT COUNT(*) as count FROM sys_org_person WHERE fd_login_name = ?',
          ['admin']
        );
        const adminExists = (adminCheckResult.rows[0]?.count || 0) > 0;

        if (!adminExists) {
          console.log('[AutoInit] admin 用户不存在，创建中...');

          // 检查 fd_role 字段是否存在
          const roleCheckResult = await this.query<{ count: number }>(
            'SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
            ['sys_org_person', 'fd_role']
          );
          const hasRoleField = (roleCheckResult.rows[0]?.count || 0) > 0;

          if (hasRoleField) {
            // 如果有 fd_role 字段，使用完整的插入语句
            await this.query(
              `
              INSERT INTO sys_org_person (
                fd_id, fd_name, fd_login_name, fd_password, fd_email, fd_role,
                fd_is_login_enabled, fd_is_business_related, fd_user_type
              )
              VALUES (?, ?, ?, ?, ?, ?, 1, 1, 'internal')
              `,
              [
                crypto.randomUUID(),
                '系统管理员',
                'admin',
                '$2b$10$DId8bUro45mx1.fpSIJJV.MXHImaJM4kdb9V34feSKiU7dmRxeOTq', // admin123
                'admin@example.com',
                'admin'
              ]
            );
          } else {
            // 如果没有 fd_role 字段，使用不包含 fd_role 的插入语句
            await this.query(
              `
              INSERT INTO sys_org_person (
                fd_id, fd_name, fd_login_name, fd_password, fd_email,
                fd_is_login_enabled, fd_is_business_related, fd_user_type
              )
              VALUES (?, ?, ?, ?, ?, 1, 1, 'internal')
              `,
              [
                crypto.randomUUID(),
                '系统管理员',
                'admin',
                '$2b$10$DId8bUro45mx1.fpSIJJV.MXHImaJM4kdb9V34feSKiU7dmRxeOTq', // admin123
                'admin@example.com'
              ]
            );
          }

          console.log('[AutoInit] ✅ admin 用户创建成功');
        } else {
          console.log('[AutoInit] admin 用户已存在');
        }
      } catch (error) {
        console.error('[AutoInit] 检查或创建 admin 用户失败:', error);
      }

      // 初始化系统核心表
      await this.initSystemTables();

      // 初始化Agent和技能数据
      await this.initAgentAndSkillData();

      // 修复组织架构数据：将子部门的 fd_parentid 迁移到 fd_parentorgid
      await this.fixOrgElementParentId();

      // 初始化OneAPI Repository
      if (this.pool) {
        this.oneAPIConfigRepository = new OneAPIConfigRepository(this.pool);
      }

      // 初始化流程映射Repository
      if (this.pool) {
        this.flowMappingRepository = new FlowMappingRepository(this.pool);
      }

      // 初始化预置流程映射数据
      await this.initFlowMappingData();
    } catch (error) {
      console.error('[AutoInit] 组织架构表初始化失败:', error);
      // 不抛出错误，避免影响应用启动
    }
  }

  /**
   * 初始化预置流程映射数据
   */
  private async initFlowMappingData(): Promise<void> {
    try {
      console.log('[FlowMapping:Init] 开始初始化预置流程映射数据...');

      // 检查预置数据是否已存在
      const checkResult = await this.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM ekp_flow_mappings WHERE is_system = 1'
      );

      const count = checkResult.rows[0]?.count || 0;

      if (count > 0) {
        console.log('[FlowMapping:Init] 预置流程映射数据已存在，跳过初始化');
        return;
      }

      console.log('[FlowMapping:Init] 插入预置流程映射数据...');

      // 预置请假流程映射
      const leaveMappingId = crypto.randomUUID();
      await this.query(
        `INSERT IGNORE INTO ekp_flow_mappings (
          id, business_type, business_name, keywords, flow_template_id,
          flow_template_name, form_template_id, field_mappings, enabled, is_system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
        [
          leaveMappingId,
          'leave',
          '请假申请',
          '请假,休息,度假,年假,病假,事假,申请请假',
          'leave_template_001',
          '标准请假流程',
          'leave_form_001',
          JSON.stringify({
            fields: [
              { ekpField: 'fd_leave_type', localField: 'leaveType', label: '请假类型' },
              { ekpField: 'fd_start_time', localField: 'startTime', label: '开始时间' },
              { ekpField: 'fd_end_time', localField: 'endTime', label: '结束时间' },
              { ekpField: 'fd_reason', localField: 'reason', label: '请假事由' },
              { ekpField: 'fd_approver', localField: 'approver', label: '审批人' }
            ]
          })
        ]
      );
      console.log('[FlowMapping:Init] 请假流程映射创建成功');

      // 预置报销流程映射
      const expenseMappingId = crypto.randomUUID();
      await this.query(
        `INSERT IGNORE INTO ekp_flow_mappings (
          id, business_type, business_name, keywords, flow_template_id,
          flow_template_name, form_template_id, field_mappings, enabled, is_system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
        [
          expenseMappingId,
          'expense',
          '费用报销',
          '报销,费用,差旅费,交通费,餐费,发票,报销单',
          'expense_template_001',
          '标准报销流程',
          'expense_form_001',
          JSON.stringify({
            fields: [
              { ekpField: 'fd_expense_type', localField: 'expenseType', label: '费用类型' },
              { ekpField: 'fd_amount', localField: 'amount', label: '报销金额' },
              { ekpField: 'fd_invoice_count', localField: 'invoiceCount', label: '发票数量' },
              { ekpField: 'fd_description', localField: 'description', label: '费用说明' },
              { ekpField: 'fd_approver', localField: 'approver', label: '审批人' }
            ]
          })
        ]
      );
      console.log('[FlowMapping:Init] 报销流程映射创建成功');

      // 预置出差流程映射
      const tripMappingId = crypto.randomUUID();
      await this.query(
        `INSERT IGNORE INTO ekp_flow_mappings (
          id, business_type, business_name, keywords, flow_template_id,
          flow_template_name, form_template_id, field_mappings, enabled, is_system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
        [
          tripMappingId,
          'trip',
          '出差申请',
          '出差,外出,公干,差旅',
          'trip_template_001',
          '标准出差流程',
          'trip_form_001',
          JSON.stringify({
            fields: [
              { ekpField: 'fd_destination', localField: 'destination', label: '出差地点' },
              { ekpField: 'fd_start_time', localField: 'startTime', label: '开始时间' },
              { ekpField: 'fd_end_time', localField: 'endTime', label: '结束时间' },
              { ekpField: 'fd_purpose', localField: 'purpose', label: '出差目的' },
              { ekpField: 'fd_approver', localField: 'approver', label: '审批人' }
            ]
          })
        ]
      );
      console.log('[FlowMapping:Init] 出差流程映射创建成功');

      console.log('[FlowMapping:Init] ✅ 预置流程映射数据初始化完成');
    } catch (error) {
      console.error('[FlowMapping:Init] 预置流程映射数据初始化失败:', error);
      // 不抛出错误，避免影响应用启动
    }
  }

  /**
   * 初始化系统核心表
   */
  private async initSystemTables(): Promise<void> {
    try {
      console.log('[AutoInit] 开始初始化系统核心表...');

      // 1. 创建数据库配置表
      await this.query(`
        CREATE TABLE IF NOT EXISTS database_configs (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(100) NOT NULL COMMENT '配置名称',
          type ENUM('mysql', 'postgresql') NOT NULL DEFAULT 'mysql',
          host VARCHAR(255) NOT NULL COMMENT '数据库主机',
          port INT NOT NULL DEFAULT 3306 COMMENT '数据库端口',
          database_name VARCHAR(100) NOT NULL COMMENT '数据库名',
          username VARCHAR(100) NOT NULL COMMENT '用户名',
          password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
          is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
          is_default BOOLEAN DEFAULT FALSE COMMENT '是否为默认配置',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_active (is_active),
          INDEX idx_default (is_default)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库配置表'
      `);
      console.log('[AutoInit] database_configs 表创建成功');

      // 2. 创建 API Keys 配置表
      await this.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL COMMENT '用户ID（sys_org_person.fd_id）',
          name VARCHAR(100) NOT NULL COMMENT '配置名称',
          provider ENUM('openai', 'claude', 'deepseek', 'doubao', 'custom') NOT NULL COMMENT '提供商',
          api_key VARCHAR(500) NOT NULL COMMENT 'API Key（加密）',
          base_url VARCHAR(500) COMMENT '自定义基础URL',
          is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_provider (provider),
          INDEX idx_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API Keys配置表'
      `);
      console.log('[AutoInit] api_keys 表创建成功');

      // 3. 创建对话会话表
      await this.query(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL COMMENT '用户ID（sys_org_person.fd_id）',
          title VARCHAR(500) NOT NULL COMMENT '会话标题',
          agent_id VARCHAR(36) COMMENT '使用的智能体ID',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_created_at (created_at),
          INDEX idx_updated_at (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对话会话表'
      `);
      console.log('[AutoInit] chat_sessions 表创建成功');

      // 4. 创建对话消息表
      await this.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id VARCHAR(36) PRIMARY KEY,
          session_id VARCHAR(36) NOT NULL COMMENT '会话ID',
          role ENUM('user', 'assistant', 'system') NOT NULL COMMENT '角色',
          content TEXT NOT NULL COMMENT '消息内容',
          metadata JSON COMMENT '元数据（如技能调用、token使用等）',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
          INDEX idx_session_id (session_id),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对话消息表'
      `);
      console.log('[AutoInit] chat_messages 表创建成功');

      // 5. 创建自定义技能表
      await this.query(`
        CREATE TABLE IF NOT EXISTS custom_skills (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL COMMENT '创建用户ID（sys_org_person.fd_id）',
          name VARCHAR(100) NOT NULL COMMENT '技能名称',
          description TEXT COMMENT '技能描述',
          icon VARCHAR(50) COMMENT '图标名称',
          category VARCHAR(50) COMMENT '分类',
          enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
          api_config JSON NOT NULL COMMENT 'API配置',
          auth_config JSON COMMENT '认证配置',
          request_params JSON COMMENT '请求参数配置',
          body_template JSON COMMENT '请求体模板',
          response_parsing JSON COMMENT '响应解析规则',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_category (category),
          INDEX idx_enabled (enabled)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自定义技能表'
      `);
      console.log('[AutoInit] custom_skills 表创建成功');

      // 6. 创建 EKP 配置表
      await this.query(`
        CREATE TABLE IF NOT EXISTS ekp_configs (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL COMMENT '用户ID（sys_org_person.fd_id）',
          ekp_address VARCHAR(500) NOT NULL COMMENT 'EKP地址',
          username VARCHAR(100) COMMENT '用户名',
          password VARCHAR(255) COMMENT '密码（加密）',
          auth_type ENUM('basic', 'oauth', 'none') DEFAULT 'basic' COMMENT '认证类型',
          config JSON COMMENT '额外配置',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP配置表'
      `);
      console.log('[AutoInit] ekp_configs 表创建成功');

      // 7. 创建组织架构表（为管理后台预留）
      await this.query(`
        CREATE TABLE IF NOT EXISTS organizations (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(100) NOT NULL COMMENT '组织名称',
          parent_id VARCHAR(36) COMMENT '父组织ID',
          description TEXT COMMENT '描述',
          manager_id VARCHAR(36) COMMENT '负责人ID（sys_org_person.fd_id）',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_parent_id (parent_id),
          INDEX idx_manager_id (manager_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织架构表'
      `);
      console.log('[AutoInit] organizations 表创建成功');

      // 8. 创建Agent配置表
      await this.query(`
        CREATE TABLE IF NOT EXISTS agents (
          id VARCHAR(36) PRIMARY KEY COMMENT 'Agent ID',
          type VARCHAR(50) NOT NULL UNIQUE COMMENT 'Agent类型（root、approval、meeting、data、assistant）',
          name VARCHAR(100) NOT NULL COMMENT 'Agent名称',
          description TEXT COMMENT 'Agent描述',
          avatar VARCHAR(100) DEFAULT '🤖' COMMENT 'Agent头像',
          system_prompt TEXT COMMENT '系统提示词（角色）',
          enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          INDEX idx_type (type),
          INDEX idx_enabled (enabled)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent配置表'
      `);
      console.log('[AutoInit] agents 表创建成功');

      // 9. 创建Agent技能关联表
      await this.query(`
        CREATE TABLE IF NOT EXISTS agents_skills (
          id VARCHAR(36) PRIMARY KEY COMMENT '关联ID',
          agent_type VARCHAR(50) NOT NULL COMMENT 'Agent类型',
          skill_id VARCHAR(100) NOT NULL COMMENT '技能ID（关联skills.code）',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          UNIQUE KEY uk_agent_skill (agent_type, skill_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent技能关联表'
      `);
      console.log('[AutoInit] agents_skills 表创建成功');

      // 10. 创建Agent子Bot关联表
      await this.query(`
        CREATE TABLE IF NOT EXISTS agents_bots (
          id VARCHAR(36) PRIMARY KEY COMMENT '关联ID',
          agent_type VARCHAR(50) NOT NULL COMMENT 'Agent类型',
          bot_id VARCHAR(100) NOT NULL COMMENT '子Bot ID',
          bot_name VARCHAR(100) NOT NULL COMMENT '子Bot名称',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          UNIQUE KEY uk_agent_bot (agent_type, bot_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent子Bot关联表'
      `);
      console.log('[AutoInit] agents_bots 表创建成功');

      // 11. 创建技能配置表
      await this.query(`
        CREATE TABLE IF NOT EXISTS skills (
          id VARCHAR(36) PRIMARY KEY COMMENT '技能ID',
          code VARCHAR(100) NOT NULL UNIQUE COMMENT '技能代码（如todo.list）',
          name VARCHAR(100) NOT NULL COMMENT '技能名称',
          description TEXT COMMENT '技能描述',
          category VARCHAR(50) DEFAULT 'custom' COMMENT '技能分类（custom、ekp、meeting、data）',
          api_config JSON COMMENT 'API配置',
          enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          INDEX idx_code (code),
          INDEX idx_category (category),
          INDEX idx_enabled (enabled)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技能配置表'
      `);
      console.log('[AutoInit] skills 表创建成功');

      // 12. 创建oneAPI配置表
      await this.query(`
        CREATE TABLE IF NOT EXISTS oneapi_configs (
          id VARCHAR(36) PRIMARY KEY COMMENT '配置ID（UUID）',
          name VARCHAR(100) NOT NULL COMMENT '配置名称',
          description VARCHAR(500) COMMENT '配置描述',
          base_url VARCHAR(500) NOT NULL COMMENT 'oneAPI服务地址',
          api_key VARCHAR(500) NOT NULL COMMENT 'API密钥',
          model VARCHAR(100) NOT NULL COMMENT '模型名称',
          enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          UNIQUE KEY uk_name (name),
          KEY idx_enabled (enabled),
          KEY idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='oneAPI配置表'
      `);
      console.log('[AutoInit] oneapi_configs 表创建成功');

      // 13. 创建EKP配置表
      await this.query(`
        CREATE TABLE IF NOT EXISTS ekp_configs (
          id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
          user_id VARCHAR(36) DEFAULT 'system' COMMENT '用户ID',
          ekp_address VARCHAR(500) NOT NULL COMMENT 'EKP系统地址',
          api_path VARCHAR(500) DEFAULT '/api/sys-notify/sysNotifyTodoRestService/getTodo' COMMENT 'API路径',
          username VARCHAR(100) COMMENT '用户名',
          password VARCHAR(255) COMMENT '密码',
          auth_type ENUM('basic', 'oauth', 'none') DEFAULT 'basic' COMMENT '认证类型',
          config JSON COMMENT '其他配置',
          is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP配置表'
      `);
      console.log('[AutoInit] ekp_configs 表创建成功');

      // 14. 创建流程映射表（EKP业务类型到流程模板的映射）
      await this.query(`
        CREATE TABLE IF NOT EXISTS ekp_flow_mappings (
          id VARCHAR(36) PRIMARY KEY COMMENT '映射ID',
          business_type VARCHAR(100) NOT NULL COMMENT '业务类型（如leave、expense、trip）',
          business_name VARCHAR(200) NOT NULL COMMENT '业务名称（如请假、报销、出差）',
          keywords TEXT COMMENT '关键词（逗号分隔，用于自动识别业务类型）',
          flow_template_id VARCHAR(100) COMMENT 'EKP流程模板ID',
          flow_template_name VARCHAR(200) COMMENT 'EKP流程模板名称',
          form_template_id VARCHAR(100) COMMENT 'EKP表单模板ID',
          form_template_url VARCHAR(500) COMMENT 'EKP表单URL',
          field_mappings JSON COMMENT '字段映射配置（JSON格式）',
          enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
          is_system TINYINT(1) DEFAULT 0 COMMENT '是否系统预置',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          INDEX idx_business_type (business_type),
          INDEX idx_enabled (enabled),
          INDEX idx_is_system (is_system)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP流程映射表'
      `);
      console.log('[AutoInit] ekp_flow_mappings 表创建成功');

      console.log('[AutoInit] ✅ 系统核心表初始化完成');
    } catch (error) {
      console.error('[AutoInit] 系统核心表初始化失败:', error);
      // 不抛出错误，避免影响应用启动
    }
  }

  /**
   * 修复组织架构数据
   * 将子部门的 fd_parentid 字段迁移到 fd_parentorgid 字段
   */
  private async fixOrgElementParentId(): Promise<void> {
    try {
      console.log('[FixOrgData] 检查组织架构数据是否需要修复...');

      // 查询所有使用了 fd_parentid 字段的部门
      const result = await this.query(
        `SELECT fd_id, fd_org_type, fd_name, fd_parentid, fd_parentorgid
         FROM sys_org_element
         WHERE fd_org_type = 2
           AND fd_parentid IS NOT NULL
           AND fd_parentid != ''`
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = result.rows as Array<{
        fd_id: string;
        fd_org_type: number;
        fd_name: string;
        fd_parentid: string | null;
        fd_parentorgid: string | null;
      }>;

      if (rows.length === 0) {
        console.log('[FixOrgData] 没有需要修复的数据');
        return;
      }

      console.log(`[FixOrgData] 找到 ${rows.length} 个需要修复的部门`);

      // 修复数据：将 fd_parentid 迁移到 fd_parentorgid
      let fixedCount = 0;
      for (const row of rows) {
        if (row.fd_parentid) {
          await this.query(
            `UPDATE sys_org_element
             SET fd_parentorgid = ?
             WHERE fd_id = ?`,
            [row.fd_parentid, row.fd_id]
          );

          console.log(`[FixOrgData] 修复部门: ${row.fd_name}，将 fd_parentid (${row.fd_parentid}) 迁移到 fd_parentorgid`);
          fixedCount++;
        }
      }

      console.log(`[FixOrgData] ✅ 数据修复完成，共修复 ${fixedCount} 个部门`);
    } catch (error) {
      // 修复失败不影响正常使用，只记录日志
      console.error('[FixOrgData] 数据修复失败:', error);
    }
  }

  /**
   * 加载oneAPI配置
   * 从oneapi_configs表中加载配置并初始化oneAPI管理器
   */
  private async loadOneAPIConfig(): Promise<void> {
    try {
      console.log('[OneAPI:Init] 开始加载oneAPI配置...');

      if (!this.oneAPIConfigRepository) {
        console.log('[OneAPI:Init] OneAPI Repository未初始化，尝试初始化');
        if (this.pool) {
          this.oneAPIConfigRepository = new OneAPIConfigRepository(this.pool);
          console.log('[OneAPI:Init] OneAPI Repository初始化成功');
        } else {
          console.log('[OneAPI:Init] 数据库连接池未初始化');
          return;
        }
      }

      // 检查表是否存在
      const tableExists = await this.oneAPIConfigRepository.tableExists();
      if (!tableExists) {
        console.log('[OneAPI:Init] oneAPI配置表不存在，跳过加载');
        return;
      }

      // 查询启用的oneAPI配置
      console.log('[OneAPI:Init] 查询启用的oneAPI配置...');
      const configs = await this.oneAPIConfigRepository.findEnabled();

      if (configs.length === 0) {
        console.log('[OneAPI:Init] 未找到启用的oneAPI配置，将使用规则引擎');
        return;
      }

      // 使用第一个启用的配置
      const config = configs[0];
      console.log('[OneAPI:Init] 找到oneAPI配置:', {
        id: config.id,
        name: config.name,
        baseUrl: config.base_url,
        model: config.model,
        enabled: config.enabled,
      });

      // 初始化oneAPI管理器
      oneAPIManager.initialize({
        id: config.id,
        name: config.name,
        baseUrl: config.base_url,
        apiKey: config.api_key,
        model: config.model,
        enabled: config.enabled,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      });

      console.log('[OneAPI:Init] oneAPI配置加载成功:', {
        name: config.name,
        baseUrl: config.base_url,
        model: config.model,
      });
    } catch (error) {
      console.error('[OneAPI:Init] 加载oneAPI配置失败:', error);
    }
  }

  /**
   * 初始化Agent和技能数据
   */
  private async initAgentAndSkillData(): Promise<void> {
    try {
      console.log('[AutoInit] 开始初始化Agent和技能数据...');

      // 1. 检查Agent表是否已有数据
      const agentCheckResult = await this.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM agents'
      );
      const agentCount = agentCheckResult.rows[0]?.count || 0;

      if (agentCount > 0) {
        console.log('[AutoInit] Agent数据已存在，跳过初始化');
        return;
      }

      // 2. 插入默认Agent数据
      const agents = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          type: 'root',
          name: '统筹智能体',
          description: '负责意图识别、任务分发、结果汇总',
          avatar: '🎯',
          system_prompt: '你是企业OA系统的统筹智能体，负责：\n1. 识别用户意图（审批/会议/数据/个人助理）\n2. 分发任务给对应业务Agent\n3. 汇总结果返回用户\n\n重要规则：\n- 只能处理当前用户自己的数据\n- 禁止查询他人待办、他人会议、他人流程\n- 禁止越权操作\n- 所有操作必须带上userId、deptId、role\n- 遇到无权限请求，直接拒绝并说明原因'
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          type: 'approval',
          name: '审批智能体',
          description: '负责待办审批、流程发起、审批查询',
          avatar: '✅',
          system_prompt: '你是企业OA系统的审批智能体，负责：\n1. 查询待办事项\n2. 处理审批操作（同意/拒绝）\n3. 发起新的审批流程\n\n权限规则：\n- 只能查询当前用户的待办\n- 只能处理当前用户有权限的审批\n- 所有操作必须带上userId'
        },
        {
          id: '00000000-0000-0000-0000-000000000003',
          type: 'meeting',
          name: '会议智能体',
          description: '负责会议查询、会议预定、会议通知',
          avatar: '📅',
          system_prompt: '你是企业OA系统的会议智能体，负责：\n1. 查询会议列表\n2. 预定新会议\n3. 更新会议信息\n4. 取消会议\n\n权限规则：\n- 只能查询当前用户的会议\n- 只能操作当前用户有权限的会议\n- 会议预定必须检查资源占用'
        },
        {
          id: '00000000-0000-0000-0000-000000000004',
          type: 'data',
          name: '数据智能体',
          description: '负责表单查询、统计分析、报表生成',
          avatar: '📊',
          system_prompt: '你是企业OA系统的数据智能体，负责：\n1. 查询表单数据\n2. 生成统计报表\n3. 提供数据分析\n\n权限规则：\n- 只能查询当前用户有权限的数据\n- 根据用户角色过滤数据范围'
        },
        {
          id: '00000000-0000-0000-0000-000000000005',
          type: 'assistant',
          name: '个人助理智能体',
          description: '负责日程管理、提醒通知、个人事务',
          avatar: '🤝',
          system_prompt: '你是企业OA系统的个人助理智能体，负责：\n1. 日程管理\n2. 提醒通知\n3. 个人事务处理\n\n权限规则：\n- 只能管理当前用户的日程和提醒\n- 所有操作必须带上userId'
        }
      ];

      for (const agent of agents) {
        await this.query(
          `INSERT INTO agents (id, type, name, description, avatar, system_prompt, enabled)
           VALUES (?, ?, ?, ?, ?, ?, TRUE)
           ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           description = VALUES(description),
           avatar = VALUES(avatar),
           system_prompt = VALUES(system_prompt)`,
          [agent.id, agent.type, agent.name, agent.description, agent.avatar, agent.system_prompt]
        );
      }
      console.log('[AutoInit] Agent数据插入成功');

      // 3. 插入默认技能数据
      const skills = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          code: 'todo.list',
          name: '待办查询',
          description: '查询当前用户的待办事项',
          category: 'approval',
          api_config: JSON.stringify({
            method: 'GET',
            endpoint: '/api/ekp?action=getTodoCount',
            params: ['todoType']
          })
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          code: 'todo.approve',
          name: '审批同意',
          description: '同意待办事项',
          category: 'approval',
          api_config: JSON.stringify({
            method: 'POST',
            endpoint: '/api/workflow/approve',
            params: ['todoId', 'comment']
          })
        },
        {
          id: '00000000-0000-0000-0000-000000000003',
          code: 'todo.reject',
          name: '审批拒绝',
          description: '拒绝待办事项',
          category: 'approval',
          api_config: JSON.stringify({
            method: 'POST',
            endpoint: '/api/workflow/reject',
            params: ['todoId', 'comment']
          })
        },
        {
          id: '00000000-0000-0000-0000-000000000004',
          code: 'meeting.list',
          name: '会议列表',
          description: '查询会议列表',
          category: 'meeting',
          api_config: JSON.stringify({
            method: 'GET',
            endpoint: '/api/meeting/list',
            params: ['startDate', 'endDate']
          })
        },
        {
          id: '00000000-0000-0000-0000-000000000005',
          code: 'meeting.create',
          name: '创建会议',
          description: '预定新会议',
          category: 'meeting',
          api_config: JSON.stringify({
            method: 'POST',
            endpoint: '/api/meeting/create',
            params: ['title', 'startTime', 'endTime', 'participants']
          })
        },
        {
          id: '00000000-0000-0000-0000-000000000006',
          code: 'data.query',
          name: '数据查询',
          description: '查询表单数据',
          category: 'data',
          api_config: JSON.stringify({
            method: 'GET',
            endpoint: '/api/data/query',
            params: ['formId', 'filters']
          })
        },
        {
          id: '00000000-0000-0000-0000-000000000007',
          code: 'report.generate',
          name: '报表生成',
          description: '生成统计报表',
          category: 'data',
          api_config: JSON.stringify({
            method: 'POST',
            endpoint: '/api/report/generate',
            params: ['reportType', 'dateRange']
          })
        },
        {
          id: '00000000-0000-0000-0000-000000000008',
          code: 'schedule.list',
          name: '日程列表',
          description: '查询日程安排',
          category: 'assistant',
          api_config: JSON.stringify({
            method: 'GET',
            endpoint: '/api/schedule/list',
            params: ['date']
          })
        },
        {
          id: '00000000-0000-0000-0000-000000000009',
          code: 'schedule.create',
          name: '创建日程',
          description: '创建新的日程',
          category: 'assistant',
          api_config: JSON.stringify({
            method: 'POST',
            endpoint: '/api/schedule/create',
            params: ['title', 'startTime', 'endTime', 'location']
          })
        }
      ];

      for (const skill of skills) {
        await this.query(
          `INSERT INTO skills (id, code, name, description, category, api_config, enabled)
           VALUES (?, ?, ?, ?, ?, ?, TRUE)
           ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           description = VALUES(description),
           category = VALUES(category),
           api_config = VALUES(api_config)`,
          [skill.id, skill.code, skill.name, skill.description, skill.category, skill.api_config]
        );
      }
      console.log('[AutoInit] 技能数据插入成功');

      // 4. 为各Agent配置技能
      const agentSkills = [
        // ApprovalAgent的技能
        { agentType: 'approval', skillId: 'todo.list' },
        { agentType: 'approval', skillId: 'todo.approve' },
        { agentType: 'approval', skillId: 'todo.reject' },
        // MeetingAgent的技能
        { agentType: 'meeting', skillId: 'meeting.list' },
        { agentType: 'meeting', skillId: 'meeting.create' },
        // DataAgent的技能
        { agentType: 'data', skillId: 'data.query' },
        { agentType: 'data', skillId: 'report.generate' },
        // AssistantAgent的技能
        { agentType: 'assistant', skillId: 'schedule.list' },
        { agentType: 'assistant', skillId: 'schedule.create' }
      ];

      for (const as of agentSkills) {
        await this.query(
          `INSERT INTO agents_skills (id, agent_type, skill_id)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id)`,
          [crypto.randomUUID(), as.agentType, as.skillId]
        );
      }
      console.log('[AutoInit] Agent技能关联数据插入成功');

      console.log('[AutoInit] ✅ Agent和技能数据初始化完成');
    } catch (error) {
      console.error('[AutoInit] Agent和技能数据初始化失败:', error);
      // 不抛出错误，避免影响应用启动
    }
  }
}

// 导出单例（使用全局实例确保跨模块共享）
export const dbManager = DatabaseManager.getGlobalInstance();

// 导出OneAPI配置Repository访问方法
export function getOneAPIConfigRepository(): OneAPIConfigRepository | null {
  // 使用全局实例而不是导出的 dbManager，确保跨模块共享
  const globalDbManager = DatabaseManager.getGlobalInstance();
  console.log('[getOneAPIConfigRepository] 开始获取 repository', {
    'oneAPIConfigRepository': !!globalDbManager['oneAPIConfigRepository'],
    'pool': !!globalDbManager['pool'],
  });
  // 如果 repository 未初始化且数据库已连接，自动初始化
  if (!globalDbManager['oneAPIConfigRepository'] && globalDbManager['pool']) {
    console.log('[getOneAPIConfigRepository] 动态初始化 OneAPI Repository');
    globalDbManager['oneAPIConfigRepository'] = new OneAPIConfigRepository(globalDbManager['pool']);
  }
  console.log('[getOneAPIConfigRepository] repository', {
    'exists': !!globalDbManager['oneAPIConfigRepository'],
  });
  return globalDbManager['oneAPIConfigRepository'];
}

// 导出流程映射Repository访问方法
export function getFlowMappingRepository(): FlowMappingRepository | null {
  // 使用全局实例
  const globalDbManager = DatabaseManager.getGlobalInstance();
  console.log('[getFlowMappingRepository] 开始获取 repository', {
    'flowMappingRepository': !!globalDbManager['flowMappingRepository'],
    'pool': !!globalDbManager['pool'],
  });
  // 如果 repository 未初始化且数据库已连接，自动初始化
  if (!globalDbManager['flowMappingRepository'] && globalDbManager['pool']) {
    console.log('[getFlowMappingRepository] 动态初始化 FlowMapping Repository');
    globalDbManager['flowMappingRepository'] = new FlowMappingRepository(globalDbManager['pool']);
  }
  console.log('[getFlowMappingRepository] repository', {
    'exists': !!globalDbManager['flowMappingRepository'],
  });
  return globalDbManager['flowMappingRepository'];
}
