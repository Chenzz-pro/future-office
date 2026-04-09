import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';

// OneAPI配置表初始化SQL
const INIT_SQL = `
CREATE TABLE IF NOT EXISTS oneapi_configs (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '配置名称',
  base_url VARCHAR(500) NOT NULL COMMENT 'OneAPI地址',
  api_key VARCHAR(500) NOT NULL COMMENT 'API Key',
  channel_name VARCHAR(100) COMMENT '渠道名称',
  is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  auto_load_balance TINYINT(1) DEFAULT 0 COMMENT '自动负载均衡',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36) COMMENT '创建人'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OneAPI配置表';
`;

// 初始化表
async function initTable() {
  try {
    // 先尝试创建表
    await dbManager.query(INIT_SQL);
    
    // 检查是否需要添加缺失的列
    try {
      await dbManager.query(`
        ALTER TABLE oneapi_configs 
        ADD COLUMN IF NOT EXISTS channel_name VARCHAR(100) COMMENT '渠道名称'
      `);
    } catch (alterError) {
      // 如果列已存在或不支持IF NOT EXISTS，忽略错误
      console.log('[OneAPI] 列已存在或添加失败，忽略:', alterError);
    }
    
    console.log('[OneAPI] 配置表初始化完成');
  } catch (error) {
    console.error('[OneAPI] 配置表初始化失败:', error);
  }
}

// GET - 获取OneAPI配置列表
export async function GET(request: NextRequest) {
  try {
    await initTable();
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'channels') {
      // 获取渠道列表（需要调用OneAPI获取）
      const configs = await dbManager.query<Record<string, unknown>>(
        'SELECT * FROM oneapi_configs WHERE is_active = TRUE ORDER BY created_at DESC'
      );
      
      // 模拟渠道数据
      const channels = configs.rows.map((row) => ({
        id: row.id as string,
        name: (row.channel_name as string) || '默认渠道',
        type: 'openai',
        baseURL: row.base_url as string,
        status: row.is_active ? 'active' : 'disabled',
      }));

      return NextResponse.json({ success: true, data: [], channels });
    }

    const result = await dbManager.query<Record<string, unknown>>(
      'SELECT id, name, base_url as baseUrl, api_key as apiKey, channel_name as channelName, is_active as isActive, auto_load_balance as autoLoadBalance, created_at as createdAt FROM oneapi_configs ORDER BY created_at DESC'
    );

    // 脱敏处理 - 只返回掩码的API Key
    const data = result.rows.map((row) => ({
      ...row,
      apiKey: '****' + ((row.apiKey as string)?.slice(-4) || ''),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API:OneAPI] 获取配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

// POST - 创建或更新OneAPI配置
export async function POST(request: NextRequest) {
  try {
    await initTable();

    const body = await request.json();
    const { id, name, baseUrl, apiKey, channelName, isActive, autoLoadBalance } = body;

    // 获取当前用户ID（从请求头）
    const userId = request.headers.get('X-User-ID') || 'system';

    if (id) {
      // 更新
      await dbManager.query(
        `UPDATE oneapi_configs SET 
          name = ?, base_url = ?, api_key = ?, channel_name = ?,
          is_active = ?, auto_load_balance = ?, updated_at = NOW()
        WHERE id = ?`,
        [name, baseUrl, apiKey, channelName, isActive ?? true, autoLoadBalance ?? false, id]
      );
      return NextResponse.json({ success: true, message: '配置更新成功' });
    } else {
      // 创建
      const newId = crypto.randomUUID();
      await dbManager.query(
        `INSERT INTO oneapi_configs 
          (id, name, base_url, api_key, channel_name, is_active, auto_load_balance, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, name, baseUrl, apiKey, channelName, isActive ?? true, autoLoadBalance ?? false, userId]
      );
      return NextResponse.json({ success: true, message: '配置创建成功', id: newId });
    }
  } catch (error) {
    console.error('[API:OneAPI] 保存配置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存配置失败' },
      { status: 500 }
    );
  }
}
