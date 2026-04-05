'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Clock, Settings, Link2, Key, Globe, Webhook } from 'lucide-react';

export default function IntegrationCenter() {
  const integrations = [
    {
      id: '1',
      name: '蓝凌 EKP',
      description: '企业协同平台集成',
      icon: <Building2 className="w-6 h-6" />,
      status: 'connected',
      type: 'rest',
      lastSync: '2024-01-20 14:30',
    },
    {
      id: '2',
      name: '钉钉',
      description: '企业通讯录集成',
      icon: <Link2 className="w-6 h-6" />,
      status: 'connected',
      type: 'oauth',
      lastSync: '2024-01-20 10:15',
    },
    {
      id: '3',
      name: '企业微信',
      description: '企业通讯工具集成',
      icon: <Globe className="w-6 h-6" />,
      status: 'disconnected',
      type: 'oauth',
      lastSync: '-',
    },
    {
      id: '4',
      name: '自定义 Webhook',
      description: '事件通知配置',
      icon: <Webhook className="w-6 h-6" />,
      status: 'connected',
      type: 'webhook',
      lastSync: '2024-01-20 16:00',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">集成中心</h1>
        <p className="text-gray-600 mt-1">管理第三方系统集成和 API 配置</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">已集成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">3</div>
            <p className="text-xs text-gray-500 mt-1">75.0%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">待配置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">1</div>
            <p className="text-xs text-gray-500 mt-1">25.0%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">API 调用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">12,345</div>
            <p className="text-xs text-green-600 mt-1">+18.2% 本月</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">失败率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">0.3%</div>
            <p className="text-xs text-green-600 mt-1">-0.1% 较上月</p>
          </CardContent>
        </Card>
      </div>

      {/* 集成列表 */}
      <Card>
        <CardHeader>
          <CardTitle>第三方集成</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="border rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                      {integration.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                      <p className="text-sm text-gray-500">{integration.description}</p>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      integration.status === 'connected'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {integration.status === 'connected' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                    {integration.status === 'connected' ? '已连接' : '未连接'}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>集成类型</span>
                    <span className="font-medium text-gray-900">
                      {integration.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>最后同步</span>
                    <span className="font-medium text-gray-900">{integration.lastSync}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  {integration.status === 'connected' ? (
                    <>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="w-4 h-4 mr-2" />
                        配置
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        断开
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" className="flex-1">
                        <Link2 className="w-4 h-4 mr-2" />
                        连接
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        查看
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API 密钥管理 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API 密钥管理</CardTitle>
            <Button size="sm" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              新建密钥
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Production Key</p>
                  <p className="text-xs text-gray-500">sk_prod_xxxxxxxxxxxxxxx</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  活跃
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Clock className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                  删除
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Test Key</p>
                  <p className="text-xs text-gray-500">sk_test_xxxxxxxxxxxxxxx</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  测试
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Clock className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                  删除
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Building2({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}
