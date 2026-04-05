'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import EKPConfigPanel from '../ekp-config-panel';

export default function EKPConfigPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">蓝凌EKP配置</h1>
        <p className="text-gray-600 mt-1">配置蓝凌 EKP 系统的连接信息</p>
      </div>

      {/* 配置内容 */}
      <Card>
        <CardHeader>
          <CardTitle>蓝凌 EKP 集成配置</CardTitle>
          <CardDescription>
            支持待办查询、请假申请等功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EKPConfigPanel />
        </CardContent>
      </Card>
    </div>
  );
}
