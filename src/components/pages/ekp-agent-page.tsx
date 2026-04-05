'use client';

import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 动态导入EKP Agent组件，避免SSR问题
const EKPAgent = dynamic(() => import('./ekp-agent'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  ),
});

interface EKPAgentPageProps {
  onBack: () => void;
}

export function EKPAgentPage({ onBack }: EKPAgentPageProps) {
  return (
    <div className="h-full flex flex-col">
      {/* 返回按钮 */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回智能体列表
        </Button>
      </div>

      {/* EKP Agent组件 */}
      <div className="flex-1 min-h-0">
        <EKPAgent />
      </div>
    </div>
  );
}
