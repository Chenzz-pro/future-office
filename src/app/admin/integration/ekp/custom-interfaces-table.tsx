'use client';

import { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Edit, Trash2, Play, MoreVertical, Loader2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CustomInterfacesTable({ onRefresh }: { onRefresh?: () => void }) {
  const [interfaces, setInterfaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInterfaces();
  }, []);

  const loadInterfaces = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ekp-interfaces?type=custom');
      const data = await res.json();
      if (data.success) {
        setInterfaces(data.data || []);
      }
    } catch (error) {
      console.error('加载接口失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm('确定要删除这个接口配置吗？')) return;

    try {
      const res = await fetch(`/api/admin/ekp-interfaces/${code}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadInterfaces();
        if (onRefresh) onRefresh();
      } else {
        alert('删除失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      alert('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 统计信息
  const total = interfaces.length;
  const enabled = interfaces.filter((i: any) => i.enabled).length;
  const disabled = interfaces.filter((i: any) => !i.enabled).length;
  const flowCount = interfaces.filter((i: any) => i.category === '流程').length;
  const statsCount = interfaces.filter((i: any) => i.category === '统计').length;

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg">
          <div className="text-sm text-purple-700 dark:text-purple-300">总接口数</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {total}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
          <div className="text-sm text-green-700 dark:text-green-300">已启用</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {enabled}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-950/20 p-4 rounded-lg">
          <div className="text-sm text-gray-700 dark:text-gray-300">已禁用</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {disabled}
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <div className="text-sm text-blue-700 dark:text-blue-300">流程类</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {flowCount}
          </div>
        </div>
      </div>

      {/* 接口列表 */}
      {interfaces.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          暂无二开接口配置
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">接口代码</TableHead>
                <TableHead>接口名称</TableHead>
                <TableHead className="w-[120px]">分类</TableHead>
                <TableHead className="w-[300px]">API路径</TableHead>
                <TableHead className="w-[120px]">服务标识</TableHead>
                <TableHead className="w-[80px]">方法</TableHead>
                <TableHead className="w-[80px]">状态</TableHead>
                <TableHead className="w-[100px]">版本</TableHead>
                <TableHead className="w-[120px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interfaces.map((item: any) => (
                <TableRow key={item.id || item.code}>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.path}</TableCell>
                  <TableCell className="font-mono text-xs">{item.serviceId}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.method}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.enabled ? 'default' : 'secondary'}>
                      {item.enabled ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{item.version}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Play className="w-4 h-4 mr-2" />
                          测试
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(item.code)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
