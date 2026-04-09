'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface Role {
  fd_id: string;
  fd_name: string;
  fd_code: string;
  fd_description: string | null;
  fd_order: number;
  fd_is_available: number;
}

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [migrating, setMigrating] = useState(false);

  const [formData, setFormData] = useState({
    fd_name: '',
    fd_code: '',
    fd_description: '',
    fd_order: 0,
    fd_is_available: 1,
  });

  // 加载角色列表
  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organization/role');
      const data = await response.json();
      if (data.success) {
        setRoles(data.data || []);
      }
    } catch (error) {
      console.error('加载角色列表失败:', error);
      alert('加载角色列表失败，请检查数据库连接');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadRoles();
  }, []);

  // 执行数据库迁移
  const handleMigrate = async () => {
    if (!confirm('确定要执行数据库迁移吗？\n\n这将创建角色表并修改 sys_org_person 表的 fd_role 字段。\n\n注意：请先备份数据库！')) {
      return;
    }

    try {
      setMigrating(true);

      // 读取 SQL 脚本
      const response = await fetch('/database-schema-role.sql');
      const sql = await response.text();

      // 执行迁移
      const migrateResponse = await fetch('/api/database/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });

      const result = await migrateResponse.json();

      if (result.success) {
        alert(`数据库迁移完成！\n成功: ${result.successCount} 条\n失败: ${result.failedCount} 条`);
        loadRoles();
      } else {
        throw new Error(result.error || '迁移失败');
      }
    } catch (error) {
      console.error('数据库迁移失败:', error);
      alert(`数据库迁移失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setMigrating(false);
    }
  };

  // 打开新建对话框
  const handleCreate = () => {
    setDialogMode('create');
    setCurrentRole(null);
    setFormData({
      fd_name: '',
      fd_code: '',
      fd_description: '',
      fd_order: 0,
      fd_is_available: 1,
    });
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (role: Role) => {
    setDialogMode('edit');
    setCurrentRole(role);
    setFormData({
      fd_name: role.fd_name,
      fd_code: role.fd_code,
      fd_description: role.fd_description || '',
      fd_order: role.fd_order,
      fd_is_available: role.fd_is_available,
    });
    setDialogOpen(true);
  };

  // 保存角色
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/organization/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: dialogMode === 'create' ? 'create' : 'update',
          data: formData,
          id: currentRole?.fd_id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(dialogMode === 'create' ? '角色创建成功' : '角色更新成功');
        setDialogOpen(false);
        loadRoles();
      } else {
        throw new Error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存角色失败:', error);
      alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 打开删除确认对话框
  const handleDelete = (role: Role) => {
    setDeleteRole(role);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deleteRole) return;

    try {
      const response = await fetch('/api/organization/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: deleteRole.fd_id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('角色删除成功');
        setDeleteDialogOpen(false);
        loadRoles();
      } else {
        throw new Error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除角色失败:', error);
      alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="p-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-orange-600" />
            <div>
              <h1 className="text-2xl font-bold">角色管理</h1>
              <p className="text-sm text-gray-500 mt-1">管理系统角色和权限</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleMigrate}
              disabled={migrating}
              title="执行数据库迁移脚本"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${migrating ? 'animate-spin' : ''}`} />
              执行迁移
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              新建角色
            </Button>
          </div>
        </div>

        {/* 角色列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            加载中...
          </div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Shield className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">暂无角色数据</p>
            <p className="text-sm">请先执行数据库迁移，然后创建角色</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <Card key={role.fd_id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{role.fd_name}</h3>
                      <p className="text-sm text-gray-500">{role.fd_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(role)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(role)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {role.fd_description && (
                  <p className="text-sm text-gray-600 mb-3">{role.fd_description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>排序号: {role.fd_order}</span>
                  <span className={role.fd_is_available ? 'text-green-600' : 'text-gray-400'}>
                    {role.fd_is_available ? '可用' : '不可用'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* 新建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              {dialogMode === 'create' ? '新建角色' : '编辑角色'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="fd_name">
                角色名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fd_name"
                value={formData.fd_name}
                onChange={(e) => setFormData({ ...formData, fd_name: e.target.value })}
                placeholder="请输入角色名称"
                required
              />
            </div>

            <div>
              <Label htmlFor="fd_code">
                角色代码 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fd_code"
                value={formData.fd_code}
                onChange={(e) => setFormData({ ...formData, fd_code: e.target.value })}
                placeholder="请输入角色代码（英文，唯一标识）"
                required
                disabled={dialogMode === 'edit'} // 编辑时不允许修改代码
              />
            </div>

            <div>
              <Label htmlFor="fd_description">角色描述</Label>
              <Textarea
                id="fd_description"
                value={formData.fd_description}
                onChange={(e) => setFormData({ ...formData, fd_description: e.target.value })}
                placeholder="请输入角色描述"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="fd_order">排序号</Label>
              <Input
                id="fd_order"
                type="number"
                value={formData.fd_order}
                onChange={(e) => setFormData({ ...formData, fd_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit">
                {dialogMode === 'create' ? '新建' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除角色 &quot;{deleteRole?.fd_name}&quot; 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
