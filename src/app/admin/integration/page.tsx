'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings, Key } from 'lucide-react';
import LLMConfigPanel from './llm-config-panel';
import EKPConfigPanel from './ekp-config-panel';

export default function IntegrationCenter() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState('llm');

  // 根据URL参数设置初始页签
  useEffect(() => {
    if (tabParam === 'llm' || tabParam === 'ekp') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">集成中心</h1>
        <p className="text-gray-600 mt-1">管理第三方系统集成和 API 配置</p>
      </div>

      {/* 页签切换 */}
      <Tabs defaultValue="llm" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="llm" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            大模型配置
          </TabsTrigger>
          <TabsTrigger value="ekp" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            蓝凌EKP配置
          </TabsTrigger>
        </TabsList>

        {/* 大模型配置 */}
        <TabsContent value="llm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>大模型 API 配置</CardTitle>
              <CardDescription>
                配置和管理大语言模型的 API 密钥，支持 OpenAI、豆包、DeepSeek、Claude 等多个提供商
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LLMConfigPanel />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 蓝凌EKP配置 */}
        <TabsContent value="ekp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>蓝凌 EKP 集成配置</CardTitle>
              <CardDescription>
                配置蓝凌 EKP 系统的连接信息，支持待办查询、请假申请等功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EKPConfigPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
