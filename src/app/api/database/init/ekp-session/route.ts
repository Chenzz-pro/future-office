/**
 * 数据库表初始化 API
 * 
 * 用于初始化 EKP Session 相关的表
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';

// ============================================
// 初始化 EKP Session 相关表
// ============================================

const INIT_TABLES_SQL = `
-- EKP Session 存储表
CREATE TABLE IF NOT EXISTS \`ekp_sessions\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` VARCHAR(64) NOT NULL COMMENT '我们系统的用户ID',
  \`ekp_username\` VARCHAR(128) NOT NULL COMMENT 'EKP 用户名',
  \`ekp_session_id\` VARCHAR(256) DEFAULT NULL COMMENT 'EKP Session ID',
  \`ekp_cookie\` TEXT COMMENT '加密后的 EKP Cookie',
  \`ekp_token\` VARCHAR(512) DEFAULT NULL COMMENT 'EKP Token (如果有)',
  \`login_time\` DATETIME NOT NULL COMMENT '登录时间',
  \`expire_time\` DATETIME NOT NULL COMMENT '过期时间',
  \`is_valid\` TINYINT(1) DEFAULT 1 COMMENT '是否有效',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY \`uk_user_id\` (\`user_id\`),
  KEY \`idx_ekp_username\` (\`ekp_username\`),
  KEY \`idx_expire_time\` (\`expire_time\`),
  KEY \`idx_is_valid\` (\`is_valid\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP Session 存储表';

-- EKP 用户绑定表
CREATE TABLE IF NOT EXISTS \`ekp_user_bindings\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` VARCHAR(64) NOT NULL COMMENT '我们系统的用户ID',
  \`ekp_username\` VARCHAR(128) NOT NULL COMMENT 'EKP 用户名',
  \`ekp_password_encrypted\` TEXT COMMENT '加密后的 EKP 密码',
  \`ekp_account_id\` VARCHAR(128) DEFAULT NULL COMMENT 'EKP 账号ID',
  \`bind_time\` DATETIME NOT NULL COMMENT '绑定时间',
  \`last_used_time\` DATETIME DEFAULT NULL COMMENT '最后使用时间',
  \`is_active\` TINYINT(1) DEFAULT 1 COMMENT '是否激活',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY \`uk_user_id\` (\`user_id\`),
  KEY \`idx_ekp_username\` (\`ekp_username\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP 用户绑定表';
`;

export async function POST(request: NextRequest) {
  try {
    // 检查数据库连接
    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 500 }
      );
    }

    // 执行初始化 SQL
    const statements = INIT_TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await dbManager.query(statement);
    }

    return NextResponse.json({
      success: true,
      message: 'EKP Session 相关表初始化成功',
      tables: ['ekp_sessions', 'ekp_user_bindings'],
    });
  } catch (error) {
    console.error('初始化 EKP Session 表失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '初始化失败' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 检查表是否存在
    const tables = ['ekp_sessions', 'ekp_user_bindings'];
    const results: Record<string, boolean> = {};

    for (const table of tables) {
      try {
        const result = await dbManager.query(
          `SELECT COUNT(*) as count FROM \`${table}\` LIMIT 1`
        );
        results[table] = true;
      } catch {
        results[table] = false;
      }
    }

    return NextResponse.json({
      success: true,
      tables: results,
    });
  } catch (error) {
    console.error('检查 EKP Session 表失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '检查失败' 
      },
      { status: 500 }
    );
  }
}
