'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Building2,
  BriefcaseBusiness,
  Users,
  User,
  GitBranch,
  Info,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Table as TableIcon
} from 'lucide-react';
import { fieldMappings, MappingCategory, FieldMapping } from '@/lib/sync/field-mapping-config';

// 图标映射
const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 className="w-4 h-4" />,
  BriefcaseBusiness: <BriefcaseBusiness className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  User: <User className="w-4 h-4" />,
  GitBranch: <GitBranch className="w-4 h-4" />,
};

// 颜色映射
const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

// 单个映射表组件
function MappingTable({ category }: { category: MappingCategory }) {
  return (
    <Card className="border-2 border-slate-200">
      <CardHeader className={`bg-gradient-to-r ${colorMap[category.color].replace('text-', 'from-').replace('bg-', '')} border-b`}>
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${colorMap[category.color].replace('border-', 'bg-')}`}>
            {iconMap[category.icon]}
          </div>
          <div>
            <CardTitle>{category.label}字段映射</CardTitle>
            <CardDescription>
              {category.description || `共 ${category.fields.length} 个字段映射规则`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-bold">EKP字段</TableHead>
                <TableHead className="font-bold">本地字段</TableHead>
                <TableHead className="font-bold">说明</TableHead>
                <TableHead className="font-bold text-center">必填</TableHead>
                <TableHead className="font-bold">转换规则</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {category.fields.map((field, index) => (
                <TableRow key={index} className="hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {field.ekpField}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <Badge variant="secondary" className="font-mono text-xs">
                        {field.localField}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {field.description}
                  </TableCell>
                  <TableCell className="text-center">
                    {field.required ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                    ) : (
                      <span className="text-slate-400 text-sm">否</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {field.transform ? (
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                        {field.transform}
                      </code>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// 主组件
export function FieldMappingTable() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Info className="w-4 h-4" />
          查看字段映射
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TableIcon className="w-5 h-5" />
            EKP 组织架构同步字段映射表
          </DialogTitle>
          <DialogDescription>
            展示 EKP 系统字段与本地数据库表字段的映射关系，帮助理解数据同步逻辑
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          <Tabs defaultValue="organization" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              {fieldMappings.map((category) => (
                <TabsTrigger
                  key={category.name}
                  value={category.name}
                  className="gap-2"
                >
                  {iconMap[category.icon]}
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {fieldMappings.map((category) => (
              <TabsContent key={category.name} value={category.name} className="mt-0">
                <MappingTable category={category} />
              </TabsContent>
            ))}
          </Tabs>

          {/* 全局说明 */}
          <Card className="mt-6 border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4" />
                重要说明
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-700 space-y-2">
              <div>
                <strong>1. 父级关系：</strong>
                机构使用 <code className="bg-amber-100 px-1 rounded">fd_parentorgid</code>，
                部门使用 <code className="bg-amber-100 px-1 rounded">fd_parentid</code>，
                岗位使用 <code className="bg-amber-100 px-1 rounded">fd_parentid</code>。
              </div>
              <div>
                <strong>2. 人员部门：</strong>
                人员的 <code className="bg-amber-100 px-1 rounded">fd_dept_id</code> 取自 EKP 的 <code className="bg-amber-100 px-1 rounded">fd_parentid</code> 字段。
              </div>
              <div>
                <strong>3. 登录名优先级：</strong>
                人员的 <code className="bg-amber-100 px-1 rounded">fd_login_name</code> 优先使用 EKP 的 <code className="bg-amber-100 px-1 rounded">fd_login_name</code> 字段，其次是 <code className="bg-amber-100 px-1 rounded">loginName</code>，最后是 <code className="bg-amber-100 px-1 rounded">id</code>。
              </div>
              <div>
                <strong>4. 状态字段：</strong>
                所有状态字段（<code className="bg-amber-100 px-1 rounded">isAvailable</code>）支持字符串（<code className="bg-amber-100 px-1 rounded">'0'/'1'/'true'/'false'</code>）和布尔值两种格式。
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 紧凑版映射表（用于页面内展示）
export function FieldMappingCompact() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Info className="w-4 h-4" />
          字段映射说明
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TableIcon className="w-5 h-5" />
            EKP 组织架构同步字段映射表
          </DialogTitle>
          <DialogDescription>
            展示 EKP 系统字段与本地数据库表字段的映射关系
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          <Tabs defaultValue="organization" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              {fieldMappings.map((category) => (
                <TabsTrigger
                  key={category.name}
                  value={category.name}
                  className="gap-2"
                >
                  {iconMap[category.icon]}
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {fieldMappings.map((category) => (
              <TabsContent key={category.name} value={category.name} className="mt-0">
                <MappingTable category={category} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FieldMappingTable;
