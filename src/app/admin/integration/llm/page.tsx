'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import LLMConfigPanel from '../llm-config-panel';

export default function LLMConfigPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">大模型配置</h1>
        <p className="text-gray-600 mt-1">配置和管理大语言模型的 API 密钥</p>
      </div>

      {/* 配置内容 */}
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
    </div>
  );
}
