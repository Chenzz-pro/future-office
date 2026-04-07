'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EKPConfigPanel from '../ekp-config-panel';
import EKPInterfacesPanel from './interfaces-panel';

export default function EKPConfigPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">蓝凌EKP配置</h1>
        <p className="text-gray-600 mt-1">配置蓝凌EKP系统的连接信息和接口管理</p>
      </div>

      {/* Tabs切换 */}
      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="connection">连接配置</TabsTrigger>
          <TabsTrigger value="interfaces">接口管理中心</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="mt-6">
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
        </TabsContent>

        <TabsContent value="interfaces" className="mt-6">
          <EKPInterfacesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
