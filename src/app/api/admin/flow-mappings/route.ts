import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';

// 获取所有流程映射
export async function GET() {
  try {
    // 确保数据库已连接
    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 500 }
      );
    }

    const result = await dbManager.query<Record<string, unknown>>('SELECT * FROM ekp_flow_mappings ORDER BY business_type ASC');
    
    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('获取流程映射失败:', error);
    return NextResponse.json(
      { success: false, error: '获取流程映射失败' },
      { status: 500 }
    );
  }
}

// 创建或更新流程映射
export async function POST(request: NextRequest) {
  try {
    // 确保数据库已连接
    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      id,
      businessType,
      businessName,
      formUrl,
      templateId,
      enabled = true,
    } = body;

    // 验证必填字段
    if (!businessType || !businessName || !formUrl) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 检查是否存在
    if (id) {
      // 更新
      await dbManager.query(
        `UPDATE ekp_flow_mappings 
         SET business_type = ?, business_name = ?, form_url = ?, template_id = ?, enabled = ?
         WHERE id = ?`,
        [businessType, businessName, formUrl, templateId || '', enabled ? 1 : 0, id]
      );
    } else {
      // 创建
      const newId = id || `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await dbManager.query(
        `INSERT INTO ekp_flow_mappings (id, business_type, business_name, form_url, template_id, enabled)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newId, businessType, businessName, formUrl, templateId || '', enabled ? 1 : 0]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('保存流程映射失败:', error);
    return NextResponse.json(
      { success: false, error: '保存流程映射失败' },
      { status: 500 }
    );
  }
}

// 删除流程映射
export async function DELETE(request: NextRequest) {
  try {
    // 确保数据库已连接
    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少ID参数' },
        { status: 400 }
      );
    }

    await dbManager.query('DELETE FROM ekp_flow_mappings WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除流程映射失败:', error);
    return NextResponse.json(
      { success: false, error: '删除流程映射失败' },
      { status: 500 }
    );
  }
}
