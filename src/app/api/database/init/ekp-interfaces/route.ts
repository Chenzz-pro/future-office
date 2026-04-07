/**
 * EKP接口表初始化 API
 * 用于初始化EKP官方接口表和插入初始数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/database/init/ekp-interfaces
 * 检查EKP接口表是否已初始化
 */
export async function GET() {
  try {
    if (!dbManager.isConnected()) {
      return NextResponse.json({
        success: false,
        error: '数据库未连接',
      }, { status: 400 });
    }

    // 检查表是否存在
    const checkResult = await dbManager.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'ekp_official_interfaces'
    `);

    const tableExists = (checkResult.rows[0] as any)?.count > 0;

    // 检查是否有数据
    let dataExists = false;
    let dataCount = 0;

    if (tableExists) {
      const countResult = await dbManager.query(`
        SELECT COUNT(*) as count FROM ekp_official_interfaces
      `);
      dataCount = (countResult.rows[0] as any)?.count || 0;
      dataExists = dataCount > 0;
    }

    return NextResponse.json({
      success: true,
      initialized: dataExists,
      tableExists,
      dataCount,
      message: dataExists
        ? 'EKP接口表已初始化'
        : tableExists
        ? 'EKP接口表已存在，但没有数据'
        : 'EKP接口表未创建',
    });
  } catch (error) {
    console.error('[API:Database:Init:EKP-Interfaces] 检查初始化状态失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}

/**
 * POST /api/database/init/ekp-interfaces
 * 初始化EKP接口表
 */
export async function POST() {
  try {
    if (!dbManager.isConnected()) {
      return NextResponse.json({
        success: false,
        error: '数据库未连接，请先连接数据库',
      }, { status: 400 });
    }

    // 1. 创建表结构（先删除旧表）
    const schemaPath = path.join(process.cwd(), 'database-schema-ekp-official-interfaces.sql');
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json({
        success: false,
        error: '表结构文件不存在: database-schema-ekp-official-interfaces.sql',
      }, { status: 404 });
    }

    // 先删除旧表（如果存在）
    try {
      await dbManager.query('DROP TABLE IF EXISTS ekp_official_interfaces');
      console.log('[API:Database:Init:EKP-Interfaces] 删除旧表成功');
    } catch (err) {
      console.warn('[API:Database:Init:EKP-Interfaces] 删除旧表失败:', err);
    }

    // 创建新表
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await dbManager.query(schemaSql);
    console.log('[API:Database:Init:EKP-Interfaces] 表结构创建成功');

    // 检查表结构
    try {
      const columnsResult = await dbManager.query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ekp_official_interfaces'
        ORDER BY ORDINAL_POSITION
      `);
      console.log('[API:Database:Init:EKP-Interfaces] 表结构字段:', JSON.stringify(columnsResult.rows));
    } catch (err) {
      console.warn('[API:Database:Init:EKP-Interfaces] 检查表结构失败:', err);
    }

    // 2. 插入初始数据
    const dataPath = path.join(process.cwd(), 'database-schema-ekp-official-interfaces-data.sql');
    if (fs.existsSync(dataPath)) {
      const dataSql = fs.readFileSync(dataPath, 'utf-8');

      // 按照分号分割语句，但保留注释行
      const statements: string[] = [];
      const lines = dataSql.split('\n');
      let currentStatement = '';

      for (const line of lines) {
        currentStatement += line + '\n';

        // 如果行以分号结尾，说明语句结束
        if (line.trim().endsWith(';')) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }

      console.log('[API:Database:Init:EKP-Interfaces] 解析出', statements.length, '条INSERT语句');

      let insertedCount = 0;
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await dbManager.query(statement);
            insertedCount++;
            console.log('[API:Database:Init:EKP-Interfaces] 插入语句', insertedCount, '/', statements.length, '成功');
          } catch (error) {
            console.error('[API:Database:Init:EKP-Interfaces] 插入语句失败:', error);
            console.error('[API:Database:Init:EKP-Interfaces] 失败的语句:', statement.substring(0, 100));
          }
        }
      }

      console.log('[API:Database:Init:EKP-Interfaces] 初始数据插入成功，共插入', insertedCount, '条记录');
    } else {
      console.warn('[API:Database:Init:EKP-Interfaces] 数据文件不存在:', dataPath);
    }

    // 3. 验证数据
    const countResult = await dbManager.query(`
      SELECT COUNT(*) as count FROM ekp_official_interfaces
    `);
    const dataCount = (countResult.rows[0] as any)?.count || 0;

    return NextResponse.json({
      success: true,
      message: 'EKP接口表初始化成功',
      dataCount,
    });
  } catch (error) {
    console.error('[API:Database:Init:EKP-Interfaces] 初始化失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
