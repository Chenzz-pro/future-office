/**
 * 规则引擎测试 API
 * 用于测试权限规则和业务规则的执行
 */

import { NextRequest, NextResponse } from 'next/server';
import { ruleEngine, BusinessRuleConfig } from '@/lib/rules/rule-engine';
import type { PermissionRule, UserContext } from '@/lib/types/agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, rules, userId, action, params } = body;

    if (!type || !rules || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数：type, rules, userId',
        },
        { status: 400 }
      );
    }

    console.log('[TestRuleEngine] 收到请求:', {
      type,
      userId,
      action,
    });

    // 构建用户上下文
    const userContext: UserContext = {
      userId,
      deptId: body.deptId || 'dept01',
      role: body.role || 'user',
    };

    // 执行不同类型的规则
    if (type === 'permission') {
      const result = await ruleEngine.executePermissionRules(
        rules as PermissionRule[],
        userContext,
        action || 'unknown'
      );

      return NextResponse.json({
        success: true,
        data: result,
      });
    } else if (type === 'business') {
      const result = await ruleEngine.executeBusinessRules(
        rules as BusinessRuleConfig[],
        userContext,
        action || 'unknown',
        params || {}
      );

      return NextResponse.json({
        success: true,
        data: result,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: '不支持的规则类型',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[TestRuleEngine] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
