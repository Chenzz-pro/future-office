/**
 * oneAPI配置管理 API
 * 用于管理oneAPI服务的配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOneAPIConfigRepository, dbManager } from '@/lib/database/manager';
import { oneAPIManager } from '@/lib/oneapi';
import * as fs from 'fs';

// 配置文件路径
const CONFIG_FILE_PATH = '/workspace/projects/.db-config.json';

/**
 * 从配置文件读取数据库配置
 */
function loadConfigFromFile() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const config = JSON.parse(data) as import('@/lib/database').DatabaseConfig;
      // 确保日期字段是 Date 对象
      if (config.createdAt) config.createdAt = new Date(config.createdAt);
      if (config.updatedAt) config.updatedAt = new Date(config.updatedAt);
      return config;
    }
  } catch (err) {
    console.error('[API:OneAPI] ❌ 读取配置文件失败:', err);
  }
  return null;
}

/**
 * GET /api/integration/oneapi
 * 获取oneAPI配置列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // 确保数据库已连接
    if (!dbManager.isConnected()) {
      console.log('[API:OneAPI:Get] 数据库未连接，尝试自动重新连接');

      // 尝试从配置文件读取并自动重新连接
      const fileConfig = loadConfigFromFile();

      if (fileConfig) {
        try {
          console.log('[API:OneAPI:Get] 使用配置文件自动重新连接...');
          await dbManager.connect(fileConfig);
          console.log('[API:OneAPI:Get] ✅ 数据库重新连接成功');
        } catch (connectError) {
          console.error('[API:OneAPI:Get] 配置文件自动重新连接失败:', connectError);
          return NextResponse.json({
            success: false,
            error: '数据库未连接，请先配置数据库连接',
          });
        }
      } else {
        return NextResponse.json({
          success: false,
          error: '数据库未连接，请先配置数据库连接',
        });
      }
    }

    // 检查数据库是否已连接
    const repository = getOneAPIConfigRepository();

    if (!repository) {
      return NextResponse.json({
        success: false,
        error: '数据库未连接，请先配置数据库连接',
      });
    }

    // 检查表是否存在
    const tableExists = await repository.tableExists();

    if (!tableExists) {
      return NextResponse.json({
        success: true,
        configured: false,
        data: null,
        message: 'oneAPI配置表不存在',
      });
    }

    // 如果action=list，返回所有配置
    if (action === 'list') {
      const configs = await repository.findAll();

      // 隐藏API密钥并转换为驼峰命名
      const maskedConfigs = configs.map((config) => ({
        id: config.id,
        name: config.name,
        description: config.description,
        baseUrl: config.base_url,
        apiKey: config.api_key ? '******' : '',
        model: config.model,
        enabled: config.enabled,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      }));

      return NextResponse.json({
        success: true,
        data: maskedConfigs,
        message: '获取配置列表成功',
      });
    }

    // 默认返回第一个启用的配置
    const configs = await repository.findEnabled();

    if (configs.length === 0) {
      return NextResponse.json({
        success: true,
        configured: false,
        data: null,
        message: '未找到启用的oneAPI配置',
      });
    }

    const config = configs[0];

    // 隐藏API密钥并转换为驼峰命名
    const maskedConfig = {
      id: config.id,
      name: config.name,
      description: config.description,
      baseUrl: config.base_url,
      apiKey: config.api_key ? '******' : '',
      model: config.model,
      enabled: config.enabled,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
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
    const { action, id, name, description, baseUrl, apiKey, model, enabled } = body;

    // 检查数据库是否已连接
    const repository = getOneAPIConfigRepository();

    if (!repository) {
      return NextResponse.json(
        {
          success: false,
          error: '数据库未连接，请先配置数据库连接',
        },
        { status: 400 }
      );
    }

    // 检查表是否存在，不存在则创建
    const tableExists = await repository.tableExists();

    if (!tableExists) {
      await repository.createTable();
      console.log('[API:OneAPI:Post] oneAPI配置表创建成功');
    }

    // 删除配置
    if (action === 'delete') {
      if (!id) {
        return NextResponse.json(
          {
            success: false,
            error: '缺少配置ID',
          },
          { status: 400 }
        );
      }

      await repository.delete(id);
      console.log('[API:OneAPI:Post] 删除配置成功');

      return NextResponse.json({
        success: true,
        message: '删除配置成功',
      });
    }

    // 切换启用状态
    if (action === 'toggle') {
      if (!id) {
        return NextResponse.json(
          {
            success: false,
            error: '缺少配置ID',
          },
          { status: 400 }
        );
      }

      await repository.toggleEnabled(id);
      console.log('[API:OneAPI:Post] 切换启用状态成功');

      return NextResponse.json({
        success: true,
        message: '切换启用状态成功',
      });
    }

    let configId: string;

    if (id) {
      // 更新现有配置
      // 只有当 apiKey 不为空且不是掩码时，才更新 api_key 字段
      const updateParams: any = {
        name,
        description,
        base_url: baseUrl,
        model,
        enabled,
      };

      // 如果 apiKey 不为空且不是掩码，则更新 api_key
      if (apiKey && apiKey !== '******' && apiKey.trim() !== '') {
        updateParams.api_key = apiKey;
      }

      await repository.update(id, updateParams);
      configId = id;
      console.log('[API:OneAPI:Post] 更新配置成功');
    } else {
      // 检查名称是否已存在
      const existingConfig = await repository.findByName(name);
      if (existingConfig) {
        console.log('[API:OneAPI:Post] 检测到同名配置，自动更新');
        // 自动更新现有配置
        const updateParams: any = {
          name,
          description,
          base_url: baseUrl,
          model,
          enabled,
        };

        // 如果 apiKey 不为空且不是掩码，则更新 api_key
        if (apiKey && apiKey !== '******' && apiKey.trim() !== '') {
          updateParams.api_key = apiKey;
        }

        await repository.update(existingConfig.id, updateParams);
        configId = existingConfig.id;
        console.log('[API:OneAPI:Post] 更新同名配置成功');
      } else {
        // 创建新配置，apiKey 必须存在
        if (!apiKey || apiKey.trim() === '') {
          return NextResponse.json(
            {
              success: false,
              error: '创建配置时 API 密钥不能为空',
            },
            { status: 400 }
          );
        }

        configId = await repository.create({
          name,
          description,
          base_url: baseUrl,
          api_key: apiKey,
          model,
          enabled,
        });
        console.log('[API:OneAPI:Post] 创建新配置成功');
      }
    }

    // 更新oneAPI管理器配置
    const config = await repository.findById(configId);

    if (config) {
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
    }

    return NextResponse.json({
      success: true,
      message: id ? '更新配置成功' : '保存配置成功',
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

    // 处理唯一键冲突错误
    if (error instanceof Error && error.message.includes('Duplicate entry') && error.message.includes('uk_name')) {
      return NextResponse.json(
        {
          success: false,
          error: '配置名称已存在，请使用其他名称或更新现有配置',
          errorCode: 'DUPLICATE_NAME',
        },
        { status: 409 }
      );
    }

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
 * 删除oneAPI配置（已废弃，请使用POST action=delete）
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // 检查数据库是否已连接
    const repository = getOneAPIConfigRepository();

    if (!repository) {
      return NextResponse.json(
        {
          success: false,
          error: '数据库未连接',
        },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少配置ID',
        },
        { status: 400 }
      );
    }

    // 删除配置
    await repository.delete(id);

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
