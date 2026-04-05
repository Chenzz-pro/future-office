'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, Plus, Edit, Trash2, MoreHorizontal, Building2, User, Shield } from 'lucide-react';

export default function OrganizationManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const mockMembers = [
    {
      id: '1',
      name: '张三',
      email: 'zhangsan@example.com',
      department: '技术部',
      position: '高级工程师',
      role: 'admin',
      status: 'active',
      joinedAt: '2023-06-15',
    },
    {
      id: '2',
      name: '李四',
      email: 'lisi@example.com',
      department: '产品部',
      position: '产品经理',
      role: 'user',
      status: 'active',
      joinedAt: '2023-08-20',
    },
    {
      id: '3',
      name: '王五',
      email: 'wangwu@example.com',
      department: '市场部',
      position: '市场专员',
      role: 'user',
      status: 'active',
      joinedAt: '2023-09-10',
    },
    {
      id: '4',
      name: '赵六',
      email: 'zhaoliu@example.com',
      department: '技术部',
      position: '前端开发',
      role: 'user',
      status: 'inactive',
      joinedAt: '2023-10-05',
    },
  ];

  const mockDepartments = [
    { id: '1', name: '技术部', members: 12, manager: '张三' },
    { id: '2', name: '产品部', members: 8, manager: '李四' },
    { id: '3', name: '市场部', members: 15, manager: '王五' },
    { id: '4', name: '运营部', members: 10, manager: '赵六' },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">组织权限管理</h1>
          <p className="text-gray-600 mt-1">管理组织架构、成员和权限配置</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          添加成员
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">总成员数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">45</div>
            <p className="text-xs text-green-600 mt-1">+5 本月新增</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">部门数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">4</div>
            <p className="text-xs text-gray-500 mt-1">组织架构</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">管理员</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">3</div>
            <p className="text-xs text-gray-500 mt-1">6.7%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">活跃成员</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">42</div>
            <p className="text-xs text-gray-500 mt-1">93.3% 活跃率</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 部门列表 */}
        <Card>
          <CardHeader>
            <CardTitle>部门架构</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockDepartments.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{dept.name}</p>
                      <p className="text-xs text-gray-500">负责人: {dept.manager}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">{dept.members}</p>
                    <p className="text-xs text-gray-500">人</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 成员列表 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>成员列表</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="搜索成员..."
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
                  <TableHead>成员</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>职位</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>加入时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{member.department}</TableCell>
                    <TableCell className="text-gray-600">{member.position}</TableCell>
                    <TableCell>
                      <span
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          member.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {member.role === 'admin' ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        {member.role === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          member.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {member.status === 'active' ? '活跃' : '已停用'}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">{member.joinedAt}</TableCell>
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
    </div>
  );
}
