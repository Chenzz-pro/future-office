'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Key, Network } from 'lucide-react';
import LLMConfigPanel from '../llm-config-panel';
import OneAPIConfigPanel from '../oneapi-config-panel';

export default function LLMConfigPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">AI服务配置</h1>
        <p className="text-muted-foreground mt-1">配置和管理大语言模型的 API 密钥及代理服务</p>
      </div>

      {/* 配置内容 */}
      <Tabs defaultValue="direct" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="direct" className="gap-2">
            <Key className="w-4 h-4" />
            直接配置
          </TabsTrigger>
          <TabsTrigger value="proxy" className="gap-2">
            <Network className="w-4 h-4" />
            OneAPI代理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>大模型 API 配置</CardTitle>
              <CardDescription>
                支持 OpenAI、豆包、DeepSeek、Claude 等多个提供商的 API 密钥管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LLMConfigPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proxy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OneAPI 代理配置</CardTitle>
              <CardDescription>
                配置 OneAPI 代理服务，统一管理多个 AI 服务提供商的 API 密钥
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OneAPIConfigPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
