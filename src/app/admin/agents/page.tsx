'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bot, Search, Plus, Edit, Trash2, MoreHorizontal } from 'lucide-react';

export default function AgentsManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const mockAgents = [
    {
      id: '1',
      name: '客服助手',
      description: '处理客户咨询和问题解答',
      category: '客服',
      status: 'active',
      createdAt: '2024-01-15',
      totalCalls: 1234,
    },
    {
      id: '2',
      name: '任务助手',
      description: '协助任务分配和进度跟踪',
      category: '任务',
      status: 'active',
      createdAt: '2024-01-10',
      totalCalls: 856,
    },
    {
      id: '3',
      name: '数据分析',
      description: '数据分析和报表生成',
      category: '分析',
      status: 'active',
      createdAt: '2024-01-08',
      totalCalls: 432,
    },
    {
      id: '4',
      name: '代码助手',
      description: '代码编写和代码审查',
      category: '开发',
      status: 'inactive',
      createdAt: '2024-01-05',
      totalCalls: 678,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">智能体管理</h1>
          <p className="text-gray-600 mt-1">管理和配置系统中的智能体</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新建智能体
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">总智能体数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">56</div>
            <p className="text-xs text-green-600 mt-1">+3 本周新增</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">运行中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">48</div>
            <p className="text-xs text-gray-500 mt-1">85.7% 活跃率</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">本月调用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">12,345</div>
            <p className="text-xs text-green-600 mt-1">+15.3% 较上月</p>
          </CardContent>
        </Card>
      </div>

      {/* 智能体列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>智能体列表</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索智能体..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>智能体名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>调用次数</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="font-medium">{agent.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{agent.description}</TableCell>
                  <TableCell>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {agent.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        agent.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {agent.status === 'active' ? '运行中' : '已停用'}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600">{agent.totalCalls.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-600">{agent.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
