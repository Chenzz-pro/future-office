'use client';

/**
 * AI 流程操控台演示页面
 * 
 * 演示左右分栏布局：
 * - 左侧：EKP 表单（iframe 嵌入）
 * - 右侧：AI 对话面板
 * 
 * 功能：
 * - iframe 嵌入真实 EKP 表单
 * - AI 自然语言交互填表
 * - 实时表单预览
 */

import React, { useState, useEffect } from 'react';
import { AIFormConsole } from '@/components/ai-flow-console';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Bot, FileText, MessageSquare } from 'lucide-react';
import Link from 'next/link';

// 业务类型选项（使用真实的EKP表单URL）
const BUSINESS_TYPES = [
  {
    value: 'leave',
    label: '请假申请',
    description: '事假、病假、年假等',
    formUrl: 'https://oa.fjhxrl.com/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=17cba859d4a22f589b8cc4b482bb6898',
  },
  {
    value: 'expense',
    label: '费用报销',
    description: '差旅费、交通费、餐费等',
    formUrl: 'https://oa.fjhxrl.com/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=expense_template_001',
  },
  {
    value: 'trip',
    label: '出差申请',
    description: '出差审批流程',
    formUrl: 'https://oa.fjhxrl.com/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=trip_template_001',
  },
];

export default function AIFlowConsoleDemo() {
  const [userId, setUserId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<typeof BUSINESS_TYPES[0] | null>(null);
  const [showConsole, setShowConsole] = useState(false);

  // 获取当前用户ID
  useEffect(() => {
    const storedUserId = localStorage.getItem('current-user-id');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  const handleStartDemo = (type: typeof BUSINESS_TYPES[0]) => {
    setSelectedType(type);
    setShowConsole(true);
  };

  // 如果没有用户ID，显示提示
  if (!userId) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>请先登录</CardTitle>
              <CardDescription>
                AI 流程操控台需要登录后才能使用
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button>前往登录</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 显示操控台
  if (showConsole && selectedType) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* 顶部栏 */}
        <div className="h-14 border-b bg-card px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowConsole(false)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回选择
            </Button>
            <Badge variant="outline">{selectedType.label}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            当前用户ID: {userId.slice(0, 8)}...
          </div>
        </div>

        {/* AI 流程操控台 */}
        <div className="flex-1 overflow-hidden">
          <AIFormConsole
            businessType={selectedType.value}
            formUrl={selectedType.formUrl}
            userId={userId}
            onClose={() => setShowConsole(false)}
            onSubmit={(data) => {
              console.log('[Demo] 表单提交成功:', data);
              alert('表单提交成功！');
            }}
          />
        </div>
      </div>
    );
  }

  // 选择业务类型
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* 顶部导航 */}
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回首页
          </Button>
        </Link>

        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            AI 流程操控台
          </h1>
          <p className="text-muted-foreground">
            左右分栏布局，AI 智能填表，让审批流程更简单
          </p>
        </div>

        {/* 功能说明 */}
        <Tabs defaultValue="features" className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="features">功能特点</TabsTrigger>
            <TabsTrigger value="how-to-use">使用方式</TabsTrigger>
            <TabsTrigger value="architecture">架构说明</TabsTrigger>
          </TabsList>
          
          <TabsContent value="features" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>功能特点</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">左侧：EKP 表单嵌入</h4>
                    <p className="text-sm text-muted-foreground">
                      通过 iframe 嵌入真实的 EKP 表单，实现与原生系统无缝对接
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">右侧：AI 对话面板</h4>
                    <p className="text-sm text-muted-foreground">
                      用自然语言描述您的需求，AI 自动解析并填写表单字段
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">智能解析</h4>
                    <p className="text-sm text-muted-foreground">
                      支持日期、数量、类型等多种字段的智能识别和转换
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="how-to-use" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>使用方式</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">1. 选择业务类型</h4>
                  <p className="text-sm text-muted-foreground">
                    从下方列表中选择您要申请的流程类型
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">2. 用自然语言描述</h4>
                  <p className="text-sm text-muted-foreground">
                    例如："请事假3天，明天开始"，AI 会自动解析并填表
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">3. 确认并提交</h4>
                  <p className="text-sm text-muted-foreground">
                    查看 AI 填写的表单，确认无误后说"提交"
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="architecture" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>架构说明</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm">
                  <p className="text-muted-foreground mb-2">系统架构：</p>
                  <pre className="whitespace-pre-wrap">{`RootAgent (意图识别)
    ↓
ApprovalAgent (调度层)
    ↓
┌─────────────────────────────────────┐
│           EKP 服务层                │
├─────────────────────────────────────┤
│  TodoService  │ 待办查询、审批操作   │
│  FlowService  │ 流程模板、发起流程   │
│  FormService  │ 表单处理、AI填表     │
└─────────────────────────────────────┘
    ↓
EKP Client (统一接口调用)
    ↓
蓝凌 EKP 系统`}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 业务类型选择 */}
        <h2 className="text-xl font-semibold mb-4">选择业务类型</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {BUSINESS_TYPES.map((type) => (
            <Card key={type.value} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleStartDemo(type)}>
              <CardHeader>
                <CardTitle className="text-lg">{type.label}</CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  开始填表
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 示例对话 */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">示例对话</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-xs text-primary-foreground font-medium">用户</span>
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <p className="text-sm">请事假3天，明天开始，原因家中有事</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <p className="text-sm whitespace-pre-wrap">{`已为您填写以下内容：

- 请假类型：事假
- 开始时间：2024-04-10
- 结束时间：2024-04-12
- 请假天数：3天
- 请假原因：家中有事

还有其他需要补充的吗？`}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-xs text-primary-foreground font-medium">用户</span>
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <p className="text-sm">提交</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg px-4 py-2 border border-green-200 dark:border-green-900">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      ✅ 表单已提交成功！
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
