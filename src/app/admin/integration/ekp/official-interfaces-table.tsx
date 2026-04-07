'use client';

import { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search, Edit, Play, Plus, MoreVertical, Loader2, Trash2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import InterfaceFormDialog from './interface-form-dialog';
import InterfaceTestDialog from './interface-test-dialog';

export default function OfficialInterfacesTable({ onRefresh }: { onRefresh?: () => void }) {
  const [interfaces, setInterfaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<any>(null);
  const [testingInterface, setTestingInterface] = useState<any>(null);

  useEffect(() => {
    loadInterfaces();
  }, []);

  const loadInterfaces = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ekp-interfaces?type=official');
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

  // 过滤接口
  const filteredInterfaces = interfaces.filter((item: any) =>
    !searchKeyword ||
    item.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    item.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const handleAdd = () => {
    setEditingInterface(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingInterface(item);
    setFormDialogOpen(true);
  };

  const handleTest = (item: any) => {
    setTestingInterface(item);
    setTestDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个接口吗？')) return;

    try {
      const res = await fetch(`/api/admin/ekp-interfaces/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('删除成功');
        loadInterfaces();
        onRefresh?.();
      } else {
        alert('删除失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      alert('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleSave = async (formData: any) => {
    const url = editingInterface
      ? `/api/admin/ekp-interfaces/${editingInterface.id}?source=official`
      : '/api/admin/ekp-interfaces?source=official';

    const method = editingInterface ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || '保存失败');
    }

    alert(editingInterface ? '更新成功' : '创建成功');
    loadInterfaces();
    onRefresh?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索接口代码、名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 接口列表 */}
      {filteredInterfaces.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          {searchKeyword ? '未找到匹配的接口' : '暂无官方接口'}
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
              {filteredInterfaces.map((item: any) => (
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
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTest(item)}>
                          <Play className="w-4 h-4 mr-2" />
                          测试
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600">
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

      {/* 添加/编辑对话框 */}
      {formDialogOpen && (
        <InterfaceFormDialog
          open={formDialogOpen}
          onClose={() => setFormDialogOpen(false)}
          onSave={handleSave}
          initialData={editingInterface}
          source="official"
        />
      )}

      {/* 测试对话框 */}
      {testDialogOpen && (
        <InterfaceTestDialog
          open={testDialogOpen}
          onClose={() => setTestDialogOpen(false)}
          interfaceData={testingInterface}
        />
      )}
    </div>
  );
}
