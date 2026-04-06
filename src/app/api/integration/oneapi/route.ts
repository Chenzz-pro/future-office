/**
 * oneAPI配置管理 API
 * 用于管理oneAPI服务的配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { oneAPIManager } from '@/lib/oneapi';

/**
 * GET /api/integration/oneapi
 * 获取oneAPI配置
 */
export async function GET(request: NextRequest) {
  try {
    // 检查数据库是否已连接
    const isConnected = await dbManager.isConnected();

    if (!isConnected) {
      return NextResponse.json({
        success: true,
        configured: false,
        data: null,
        message: '数据库未连接',
      });
    }

    // 查询oneAPI配置
    const result = await dbManager.query(
      `SELECT
        id,
        name,
        base_url as baseUrl,
        api_key as apiKey,
        model,
        enabled,
        created_at as createdAt,
        updated_at as updatedAt
       FROM database_configs
       WHERE name = 'oneapi'
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        configured: false,
        data: null,
        message: '未找到oneAPI配置',
      });
    }

    const config = result.rows[0] as {
      id: string;
      name: string;
      baseUrl: string;
      apiKey: string;
      model: string;
      enabled: boolean;
      createdAt: Date;
      updatedAt: Date;
    };

    // 隐藏API密钥
    const maskedConfig = {
      ...config,
      apiKey: config.apiKey ? '******' : '',
    };

    return NextResponse.json({
      success: true,
      configured: true,
      data: maskedConfig,
      message: '获取配置成功',
    });
  } catch (error: unknown) {
    console.error('[API:OneAPI:Get] 获取配置失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integration/oneapi
 * 保存oneAPI配置
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, baseUrl, apiKey, model, enabled } = body;

    // 参数校验
    if (!name || !baseUrl || !apiKey || !model) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数（name、baseUrl、apiKey、model）',
        },
        { status: 400 }
      );
    }

    // 检查数据库是否已连接
    const isConnected = await dbManager.isConnected();

    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: '数据库未连接，请先配置数据库连接',
        },
        { status: 400 }
      );
    }

    // 检查配置是否已存在
    const checkResult = await dbManager.query(
      `SELECT id FROM database_configs WHERE name = 'oneapi' LIMIT 1`
    );

    const now = new Date();
    let configId: string;

    if (checkResult.rows.length > 0) {
      // 更新现有配置
      configId = (checkResult.rows[0] as { id: string }).id;
      await dbManager.query(
        `UPDATE database_configs
         SET name = ?,
             type = 'mysql',
             base_url = ?,
             api_key = ?,
             model = ?,
             enabled = ?,
             updated_at = ?
         WHERE id = ?`,
        [name, baseUrl, apiKey, model, enabled, now, configId]
      );
      console.log('[API:OneAPI:Post] 更新配置成功');
    } else {
      // 创建新配置
      configId = crypto.randomUUID();
      await dbManager.query(
        `INSERT INTO database_configs (
          id,
          name,
          type,
          base_url,
          api_key,
          model,
          enabled,
          is_active,
          is_default,
          created_at,
          updated_at
        ) VALUES (?, ?, 'mysql', ?, ?, ?, ?, TRUE, FALSE, ?, ?)`,
        [configId, name, baseUrl, apiKey, model, enabled, now, now]
      );
      console.log('[API:OneAPI:Post] 创建配置成功');
    }

    // 更新oneAPI管理器配置
    oneAPIManager.initialize({
      id: configId,
      name,
      baseUrl,
      apiKey,
      model,
      enabled,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      message: '保存配置成功',
      data: {
        id: configId,
        name,
        baseUrl,
        model,
        enabled,
      },
    });
  } catch (error: unknown) {
    console.error('[API:OneAPI:Post] 保存配置失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integration/oneapi
 * 删除oneAPI配置
 */
export async function DELETE(request: NextRequest) {
  try {
    // 检查数据库是否已连接
    const isConnected = await dbManager.isConnected();

    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: '数据库未连接',
        },
        { status: 400 }
      );
    }

    // 删除配置
    await dbManager.query(`DELETE FROM database_configs WHERE name = 'oneapi'`);

    // 重置oneAPI管理器
    oneAPIManager.reset();

    console.log('[API:OneAPI:Delete] 删除配置成功');

    return NextResponse.json({
      success: true,
      message: '删除配置成功',
    });
  } catch (error: unknown) {
    console.error('[API:OneAPI:Delete] 删除配置失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
