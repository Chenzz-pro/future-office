'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Bot, 
  Sparkles, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function SystemOverview() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">系统概览</h1>
        <p className="text-gray-600 mt-1">查看系统整体运行状态和数据统计</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">用户总数</CardTitle>
            <Users className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">1,234</div>
            <p className="text-xs text-gray-500 mt-1">
              <span className="text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12.5%
              </span>
              较上月
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">智能体数量</CardTitle>
            <Bot className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">56</div>
            <p className="text-xs text-gray-500 mt-1">
              <span className="text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +8.2%
              </span>
              较上月
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">技能总数</CardTitle>
            <Sparkles className="w-5 h-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">128</div>
            <p className="text-xs text-gray-500 mt-1">
              <span className="text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +15.3%
              </span>
              较上月
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">今日活跃</CardTitle>
            <Activity className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">892</div>
            <p className="text-xs text-gray-500 mt-1">
              <span className="text-red-600 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                -2.1%
              </span>
              较昨日
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 系统状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>系统运行状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">API 服务</span>
              </div>
              <span className="text-sm text-green-700">运行正常</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">数据库</span>
              </div>
              <span className="text-sm text-green-700">运行正常</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">智能体服务</span>
              </div>
              <span className="text-sm text-green-700">运行正常</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-900">存储空间</span>
              </div>
              <span className="text-sm text-yellow-700">使用率 78%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 mt-2 bg-blue-600 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">新增智能体 "客服助手"</p>
                  <p className="text-xs text-gray-500 mt-1">由 管理员 创建</p>
                  <p className="text-xs text-gray-400 mt-1">10 分钟前</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 mt-2 bg-green-600 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">用户 张三 加入组织</p>
                  <p className="text-xs text-gray-500 mt-1">邀请码: INV202401</p>
                  <p className="text-xs text-gray-400 mt-1">30 分钟前</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 mt-2 bg-purple-600 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">更新技能 "EKP 待办查询"</p>
                  <p className="text-xs text-gray-500 mt-1">优化了查询性能</p>
                  <p className="text-xs text-gray-400 mt-1">1 小时前</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 mt-2 bg-yellow-600 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">系统备份完成</p>
                  <p className="text-xs text-gray-500 mt-1">自动备份任务</p>
                  <p className="text-xs text-gray-400 mt-1">2 小时前</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
