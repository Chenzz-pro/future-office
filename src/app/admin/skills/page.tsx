'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Search, Plus, Edit, Trash2, MoreHorizontal, Code2, Globe } from 'lucide-react';

export default function SkillsManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const mockSkills = [
    {
      id: '1',
      name: 'EKP 待办查询',
      description: '查询蓝凌 EKP 系统的待办事项',
      type: 'rest',
      category: '业务集成',
      status: 'active',
      totalUsage: 5678,
      lastUsed: '2024-01-20',
    },
    {
      id: '2',
      name: 'EKP 请假申请',
      description: '在蓝凌 EKP 系统发起请假申请',
      type: 'rest',
      category: '业务集成',
      status: 'active',
      totalUsage: 1234,
      lastUsed: '2024-01-19',
    },
    {
      id: '3',
      name: '天气查询',
      description: '查询指定城市的天气信息',
      type: 'rest',
      category: '工具',
      status: 'active',
      totalUsage: 8921,
      lastUsed: '2024-01-20',
    },
    {
      id: '4',
      name: '文本翻译',
      description: '多语言文本翻译服务',
      type: 'rest',
      category: '工具',
      status: 'inactive',
      totalUsage: 3456,
      lastUsed: '2024-01-10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">技能管理</h1>
          <p className="text-gray-600 mt-1">管理和配置系统中的自定义技能</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新建技能
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">总技能数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">128</div>
            <p className="text-xs text-green-600 mt-1">+8 本周新增</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">REST API</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">95</div>
            <p className="text-xs text-gray-500 mt-1">74.2%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">自定义模板</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">33</div>
            <p className="text-xs text-gray-500 mt-1">25.8%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">本月使用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">45,678</div>
            <p className="text-xs text-green-600 mt-1">+23.1% 较上月</p>
          </CardContent>
        </Card>
      </div>

      {/* 技能列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>技能列表</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索技能..."
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
                <TableHead>技能名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>使用次数</TableHead>
                <TableHead>最后使用</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSkills.map((skill) => (
                <TableRow key={skill.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                        {skill.type === 'rest' ? (
                          <Globe className="w-5 h-5 text-yellow-600" />
                        ) : (
                          <Code2 className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <span className="font-medium">{skill.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{skill.description}</TableCell>
                  <TableCell>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {skill.type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {skill.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        skill.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {skill.status === 'active' ? '已启用' : '已停用'}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600">{skill.totalUsage.toLocaleString()}</TableCell>
                  <TableCell className="text-gray-600">{skill.lastUsed}</TableCell>
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
