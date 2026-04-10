/**
 * EKP 配置表迁移 API
 * 添加 SSO、代理、表单模板配置字段
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';

export async function POST() {
  try {
    // 检查数据库连接
    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 500 }
      );
    }

    console.log('[EKPConfig:Migrate] 开始迁移 ekp_configs 表...');

    // 添加 SSO 配置字段
    const ssoFields = [
      { name: 'sso_enabled', type: 'TINYINT(1) DEFAULT 1', comment: 'SSO是否启用' },
      { name: 'sso_service_id', type: 'VARCHAR(128) DEFAULT \'loginWebserviceService\'', comment: 'SSO服务标识' },
      { name: 'sso_webservice_path', type: 'VARCHAR(256) DEFAULT \'/sys/webserviceservice/\'', comment: 'SSO WebService地址' },
      { name: 'sso_login_path', type: 'VARCHAR(256) DEFAULT \'/sys/authentication/sso/login_auto.jsp\'', comment: 'SSO登录页面路径' },
      { name: 'sso_session_verify_path', type: 'VARCHAR(256) DEFAULT \'/sys/org/sys-inf/sysInfo.do?method=currentUser\'', comment: 'SSO Session验证路径' },
    ];

    for (const field of ssoFields) {
      try {
        // 使用 MySQL 兼容的方式检查字段是否存在
        const fieldCheck = await dbManager.query<{ count: number }>(
          `SELECT COUNT(*) as count FROM information_schema.columns 
           WHERE table_schema = DATABASE() AND table_name = 'ekp_configs' AND column_name = ?`,
          [field.name]
        );
        if ((fieldCheck.rows?.[0]?.count || 0) === 0) {
          await dbManager.query(
            `ALTER TABLE ekp_configs ADD COLUMN ${field.name} ${field.type} COMMENT '${field.comment}'`
          );
          console.log(`[EKPConfig:Migrate] 添加字段 ${field.name} 成功`);
        } else {
          console.log(`[EKPConfig:Migrate] 字段 ${field.name} 已存在`);
        }
      } catch (e) {
        console.log(`[EKPConfig:Migrate] 添加字段 ${field.name} 失败:`, e);
      }
    }

    // 添加代理配置字段
    const proxyFields = [
      { name: 'proxy_enabled', type: 'TINYINT(1) DEFAULT 1', comment: '代理是否启用' },
      { name: 'proxy_path', type: 'VARCHAR(128) DEFAULT \'/api/ekp-proxy\'', comment: '代理路径前缀' },
    ];

    for (const field of proxyFields) {
      try {
        const fieldCheck = await dbManager.query<{ count: number }>(
          `SELECT COUNT(*) as count FROM information_schema.columns 
           WHERE table_schema = DATABASE() AND table_name = 'ekp_configs' AND column_name = ?`,
          [field.name]
        );
        if ((fieldCheck.rows?.[0]?.count || 0) === 0) {
          await dbManager.query(
            `ALTER TABLE ekp_configs ADD COLUMN ${field.name} ${field.type} COMMENT '${field.comment}'`
          );
          console.log(`[EKPConfig:Migrate] 添加字段 ${field.name} 成功`);
        } else {
          console.log(`[EKPConfig:Migrate] 字段 ${field.name} 已存在`);
        }
      } catch (e) {
        console.log(`[EKPConfig:Migrate] 添加字段 ${field.name} 失败:`, e);
      }
    }

    // 添加表单模板配置字段
    const templateFields = [
      { name: 'leave_template_id', type: 'VARCHAR(128) DEFAULT \'\'', comment: '请假申请模板ID' },
      { name: 'expense_template_id', type: 'VARCHAR(128) DEFAULT \'\'', comment: '费用报销模板ID' },
      { name: 'trip_template_id', type: 'VARCHAR(128) DEFAULT \'\'', comment: '出差申请模板ID' },
      { name: 'purchase_template_id', type: 'VARCHAR(128) DEFAULT \'\'', comment: '采购申请模板ID' },
    ];

    for (const field of templateFields) {
      try {
        const fieldCheck = await dbManager.query<{ count: number }>(
          `SELECT COUNT(*) as count FROM information_schema.columns 
           WHERE table_schema = DATABASE() AND table_name = 'ekp_configs' AND column_name = ?`,
          [field.name]
        );
        if ((fieldCheck.rows?.[0]?.count || 0) === 0) {
          await dbManager.query(
            `ALTER TABLE ekp_configs ADD COLUMN ${field.name} ${field.type} COMMENT '${field.comment}'`
          );
          console.log(`[EKPConfig:Migrate] 添加字段 ${field.name} 成功`);
        } else {
          console.log(`[EKPConfig:Migrate] 字段 ${field.name} 已存在`);
        }
      } catch (e) {
        console.log(`[EKPConfig:Migrate] 添加字段 ${field.name} 失败:`, e);
      }
    }

    // 确保存在默认配置记录
    try {
      const checkResult = await dbManager.query<{ count: number }>('SELECT COUNT(*) as count FROM ekp_configs');
      const count = checkResult.rows?.[0]?.count || 0;

      if (count === 0) {
        // 插入默认配置
        await dbManager.query(
          `INSERT INTO ekp_configs (
            id, base_url, url, api_path, enabled,
            sso_enabled, sso_service_id, sso_webservice_path, sso_login_path, sso_session_verify_path,
            proxy_enabled, proxy_path,
            leave_template_id, expense_template_id, trip_template_id, purchase_template_id,
            created_at, updated_at
          ) VALUES (
            'default', '', '', '/api/sys-notify/sysNotifyTodoRestService/getTodo', 1,
            1, 'loginWebserviceService', '/sys/webserviceservice/', '/sys/authentication/sso/login_auto.jsp', '/sys/org/sys-inf/sysInfo.do?method=currentUser',
            1, '/api/ekp-proxy',
            '', '', '', '',
            NOW(), NOW()
          )`
        );
        console.log('[EKPConfig:Migrate] 创建默认配置记录成功');
      } else {
        console.log('[EKPConfig:Migrate] 配置记录已存在，跳过创建');
      }
    } catch (e) {
      console.log('[EKPConfig:Migrate] 检查/创建默认配置记录时出错:', e);
    }

    console.log('[EKPConfig:Migrate] ✅ 迁移完成');

    return NextResponse.json({
      success: true,
      message: 'EKP 配置表迁移成功',
    });
  } catch (error) {
    console.error('[EKPConfig:Migrate] 迁移失败:', error);
    return NextResponse.json(
      { success: false, error: `迁移失败: ${error}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/database/init/ekp-config
 * 获取迁移状态
 */
export async function GET() {
  try {
    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 500 }
      );
    }

    // 检查表是否存在
    const tableCheck = await dbManager.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name = 'ekp_configs'`
    );
    const tableExists = (tableCheck.rows?.[0]?.count || 0) > 0;

    if (!tableExists) {
      return NextResponse.json({
        success: true,
        data: {
          tableExists: false,
          fields: [],
          configExists: false,
        },
      });
    }

    // 获取字段列表
    const fieldsResult = await dbManager.query<{ Field: string }>(
      `SELECT Field FROM information_schema.columns 
       WHERE table_schema = DATABASE() AND table_name = 'ekp_configs'`
    );
    const fields = fieldsResult.rows?.map(r => r.Field) || [];

    // 检查配置是否存在
    const configCheck = await dbManager.query<{ count: number }>('SELECT COUNT(*) as count FROM ekp_configs');
    const configExists = (configCheck.rows?.[0]?.count || 0) > 0;

    // 检查必需字段
    const requiredFields = [
      'sso_enabled', 'sso_service_id', 'sso_webservice_path',
      'sso_login_path', 'sso_session_verify_path',
      'proxy_enabled', 'proxy_path',
      'leave_template_id', 'expense_template_id', 'trip_template_id', 'purchase_template_id'
    ];
    const missingFields = requiredFields.filter(f => !fields.includes(f));

    return NextResponse.json({
      success: true,
      data: {
        tableExists: true,
        fields,
        configExists,
        missingFields,
        needMigration: missingFields.length > 0,
      },
    });
  } catch (error) {
    console.error('[EKPConfig:Migrate:GET] 检查失败:', error);
    return NextResponse.json(
      { success: false, error: `检查失败: ${error}` },
      { status: 500 }
    );
  }
}
