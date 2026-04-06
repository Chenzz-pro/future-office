// 数据库连接管理器

import mysql from 'mysql2/promise';
import type { DatabaseConfig, DatabaseConnectionOptions, QueryResult } from './types';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: mysql.Pool | null = null;
  private config: DatabaseConfig | null = null;
  private keepAliveTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
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
        queueLimit: 0,
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

    // 每5分钟检查一次连接
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
    }, 5 * 60 * 1000); // 5分钟
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
    } catch (error) {
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
    } catch (error) {
      console.error('[AutoInit] 组织架构表初始化失败:', error);
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

      console.log('[AutoInit] ✅ 系统核心表初始化完成');
    } catch (error) {
      console.error('[AutoInit] 系统核心表初始化失败:', error);
      // 不抛出错误，避免影响应用启动
    }
  }
}

// 导出单例
export const dbManager = DatabaseManager.getInstance();
