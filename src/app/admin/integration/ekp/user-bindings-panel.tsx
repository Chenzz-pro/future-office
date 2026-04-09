'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  User,
  Link2,
  Users,
  Shield,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 类型定义
interface UserBinding {
  id: string;
  local_user_id: string | null;
  local_username: string | null;
  ekp_user_id: string | null;
  ekp_username: string | null;
  ekp_login_name: string | null;
  binding_type: 'manual' | 'auto' | 'role';
  binding_reason: string | null;
  is_active: boolean;
  created_at: string;
}

interface RoleMapping {
  id: string;
  local_role_id: string | null;
  local_role_name: string | null;
  ekp_role_id: string | null;
  ekp_role_name: string | null;
  ekp_role_code: string | null;
  priority: number;
  is_active: boolean;
}

interface LocalUser {
  fd_id: string;
  fd_login_name: string;
  fd_name: string;
}

interface LocalRole {
  fd_id: string;
  fd_name: string;
  fd_code: string;
}

export default function UserBindingsPanel() {
  const [bindings, setBindings] = useState<UserBinding[]>([]);
  const [roleMappings, setRoleMappings] = useState<RoleMapping[]>([]);
  const [localUsers, setLocalUsers] = useState<LocalUser[]>([]);
  const [localRoles, setLocalRoles] = useState<LocalRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [initLoading, setInitLoading] = useState(false);

  // 绑定编辑对话框
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false);
  const [editingBinding, setEditingBinding] = useState<UserBinding | null>(null);
  const [bindingForm, setBindingForm] = useState({
    local_user_id: '',
    local_username: '',
    ekp_user_id: '',
    ekp_username: '',
    ekp_login_name: '',
    binding_type: 'manual' as 'manual' | 'auto' | 'role',
    binding_reason: '',
    is_active: true,
  });

  // 角色映射编辑对话框
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleMapping | null>(null);
  const [roleForm, setRoleForm] = useState({
    local_role_id: '',
    local_role_name: '',
    ekp_role_id: '',
    ekp_role_name: '',
    ekp_role_code: '',
    priority: 0,
    is_active: true,
  });

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user-bindings?type=all');
      const data = await response.json();
      if (data.success) {
        setBindings(data.data.bindings || []);
        setRoleMappings(data.data.roleMappings || []);
        setLocalUsers(data.data.localUsers || []);
        setLocalRoles(data.data.localRoles || []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 初始化表结构
  const handleInitTables = async () => {
    setInitLoading(true);
    try {
      const response = await fetch('/api/user-bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initTables' }),
      });
      const data = await response.json();
      if (data.success) {
        alert('表结构初始化成功');
        loadData();
      } else {
        alert('初始化失败: ' + data.error);
      }
    } catch (error) {
      alert('初始化失败: ' + error);
    }
    setInitLoading(false);
  };

  // 打开绑定编辑对话框
  const openBindingDialog = (binding?: UserBinding) => {
    if (binding) {
      setEditingBinding(binding);
      setBindingForm({
        local_user_id: binding.local_user_id || '',
        local_username: binding.local_username || '',
        ekp_user_id: binding.ekp_user_id || '',
        ekp_username: binding.ekp_username || '',
        ekp_login_name: binding.ekp_login_name || '',
        binding_type: binding.binding_type,
        binding_reason: binding.binding_reason || '',
        is_active: binding.is_active,
      });
    } else {
      setEditingBinding(null);
      setBindingForm({
        local_user_id: '',
        local_username: '',
        ekp_user_id: '',
        ekp_username: '',
        ekp_login_name: '',
        binding_type: 'manual',
        binding_reason: '',
        is_active: true,
      });
    }
    setBindingDialogOpen(true);
  };

  // 保存绑定配置
  const handleSaveBinding = async () => {
    try {
      const response = await fetch('/api/user-bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingBinding ? 'update' : 'create',
          data: {
            ...(editingBinding ? { id: editingBinding.id } : {}),
            ...bindingForm,
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        setBindingDialogOpen(false);
        loadData();
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (error) {
      alert('保存失败: ' + error);
    }
  };

  // 删除绑定配置
  const handleDeleteBinding = async (id: string) => {
    if (!confirm('确定要删除这条绑定配置吗？')) return;
    try {
      const response = await fetch('/api/user-bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', data: { id } }),
      });
      const data = await response.json();
      if (data.success) {
        loadData();
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch (error) {
      alert('删除失败: ' + error);
    }
  };

  // 打开角色映射编辑对话框
  const openRoleDialog = (mapping?: RoleMapping) => {
    if (mapping) {
      setEditingRole(mapping);
      setRoleForm({
        local_role_id: mapping.local_role_id || '',
        local_role_name: mapping.local_role_name || '',
        ekp_role_id: mapping.ekp_role_id || '',
        ekp_role_name: mapping.ekp_role_name || '',
        ekp_role_code: mapping.ekp_role_code || '',
        priority: mapping.priority,
        is_active: mapping.is_active,
      });
    } else {
      setEditingRole(null);
      setRoleForm({
        local_role_id: '',
        local_role_name: '',
        ekp_role_id: '',
        ekp_role_name: '',
        ekp_role_code: '',
        priority: 0,
        is_active: true,
      });
    }
    setRoleDialogOpen(true);
  };

  // 保存角色映射
  const handleSaveRole = async () => {
    try {
      const response = await fetch('/api/user-bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingRole ? 'updateRoleMapping' : 'createRoleMapping',
          data: {
            ...(editingRole ? { id: editingRole.id } : {}),
            ...roleForm,
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        setRoleDialogOpen(false);
        loadData();
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (error) {
      alert('保存失败: ' + error);
    }
  };

  // 删除角色映射
  const handleDeleteRole = async (id: string) => {
    if (!confirm('确定要删除这条角色映射吗？')) return;
    try {
      const response = await fetch('/api/user-bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteRoleMapping', data: { id } }),
      });
      const data = await response.json();
      if (data.success) {
        loadData();
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch (error) {
      alert('删除失败: ' + error);
    }
  };

  // 获取绑定类型标签
  const getBindingTypeBadge = (type: string) => {
    switch (type) {
      case 'manual':
        return <Badge variant="default">手动</Badge>;
      case 'auto':
        return <Badge variant="secondary">自动</Badge>;
      case 'role':
        return <Badge variant="outline">角色</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Link2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>用户绑定配置</CardTitle>
                <CardDescription>配置EKP用户与本系统用户的绑定关系</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleInitTables} disabled={initLoading}>
                {initLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                初始化表结构
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="bindings">
        <TabsList>
          <TabsTrigger value="bindings">
            <User className="h-4 w-4 mr-2" />
            用户绑定
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield className="h-4 w-4 mr-2" />
            角色映射
          </TabsTrigger>
        </TabsList>

        {/* 用户绑定列表 */}
        <TabsContent value="bindings" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">用户绑定列表</h3>
            <Button size="sm" onClick={() => openBindingDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              添加绑定
            </Button>
          </div>

          {bindings.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>本系统用户</TableHead>
                    <TableHead>EKP用户</TableHead>
                    <TableHead>EKP登录名</TableHead>
                    <TableHead>绑定类型</TableHead>
                    <TableHead>绑定原因</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bindings.map((binding) => (
                    <TableRow key={binding.id}>
                      <TableCell className="font-medium">
                        {binding.local_username || '-'}
                      </TableCell>
                      <TableCell>{binding.ekp_username || '-'}</TableCell>
                      <TableCell>{binding.ekp_login_name || '-'}</TableCell>
                      <TableCell>{getBindingTypeBadge(binding.binding_type)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {binding.binding_reason || '-'}
                      </TableCell>
                      <TableCell>
                        {binding.is_active ? (
                          <Badge className="bg-green-500">生效</Badge>
                        ) : (
                          <Badge variant="secondary">失效</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openBindingDialog(binding)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBinding(binding.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                暂无绑定配置，点击"添加绑定"创建第一个绑定规则
              </CardContent>
            </Card>
          )}

          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">绑定优先级说明：</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                    <li><strong>手动绑定</strong>：优先级最高，优先使用</li>
                    <li><strong>自动绑定</strong>：基于登录名自动匹配（如 admin 绑定）</li>
                    <li><strong>角色绑定</strong>：基于角色映射规则匹配</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 角色映射列表 */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">角色映射列表</h3>
            <Button size="sm" onClick={() => openRoleDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              添加映射
            </Button>
          </div>

          {roleMappings.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>本系统角色</TableHead>
                    <TableHead>EKP角色名称</TableHead>
                    <TableHead>EKP角色代码</TableHead>
                    <TableHead>优先级</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleMappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-medium">
                        {mapping.local_role_name || '-'}
                      </TableCell>
                      <TableCell>{mapping.ekp_role_name || '-'}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {mapping.ekp_role_code || '-'}
                        </code>
                      </TableCell>
                      <TableCell>{mapping.priority}</TableCell>
                      <TableCell>
                        {mapping.is_active ? (
                          <Badge className="bg-green-500">生效</Badge>
                        ) : (
                          <Badge variant="secondary">失效</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openRoleDialog(mapping)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(mapping.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                暂无角色映射配置，点击"添加映射"创建第一个映射规则
              </CardContent>
            </Card>
          )}

          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">角色映射说明：</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                    <li>当EKP用户没有精确绑定时，会根据角色映射自动匹配</li>
                    <li>优先级越高的映射规则越优先匹配</li>
                    <li>系统默认已配置超级管理员、管理员、普通用户的映射</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 用户绑定编辑对话框 */}
      <Dialog open={bindingDialogOpen} onOpenChange={setBindingDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingBinding ? '编辑绑定' : '添加绑定'}</DialogTitle>
            <DialogDescription>配置EKP用户与本系统用户的绑定关系</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>本系统用户</Label>
              <Select
                value={bindingForm.local_user_id}
                onValueChange={(value) => {
                  const user = localUsers.find((u) => u.fd_id === value);
                  setBindingForm({
                    ...bindingForm,
                    local_user_id: value,
                    local_username: user?.fd_login_name || '',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择本系统用户" />
                </SelectTrigger>
                <SelectContent>
                  {localUsers.map((user) => (
                    <SelectItem key={user.fd_id} value={user.fd_id}>
                      {user.fd_login_name} ({user.fd_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>EKP用户ID</Label>
              <Input
                value={bindingForm.ekp_user_id}
                onChange={(e) => setBindingForm({ ...bindingForm, ekp_user_id: e.target.value })}
                placeholder="EKP系统中的用户ID"
              />
            </div>
            <div className="grid gap-2">
              <Label>EKP用户名</Label>
              <Input
                value={bindingForm.ekp_username}
                onChange={(e) => setBindingForm({ ...bindingForm, ekp_username: e.target.value })}
                placeholder="EKP系统中的用户名"
              />
            </div>
            <div className="grid gap-2">
              <Label>EKP登录名</Label>
              <Input
                value={bindingForm.ekp_login_name}
                onChange={(e) => setBindingForm({ ...bindingForm, ekp_login_name: e.target.value })}
                placeholder="用于自动匹配的登录名"
              />
            </div>
            <div className="grid gap-2">
              <Label>绑定类型</Label>
              <Select
                value={bindingForm.binding_type}
                onValueChange={(value: 'manual' | 'auto' | 'role') =>
                  setBindingForm({ ...bindingForm, binding_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">手动绑定</SelectItem>
                  <SelectItem value="auto">自动绑定</SelectItem>
                  <SelectItem value="role">角色绑定</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>绑定原因</Label>
              <Input
                value={bindingForm.binding_reason}
                onChange={(e) => setBindingForm({ ...bindingForm, binding_reason: e.target.value })}
                placeholder="描述绑定的原因或说明"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={bindingForm.is_active}
                onCheckedChange={(checked) => setBindingForm({ ...bindingForm, is_active: checked })}
              />
              <Label>是否生效</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBindingDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveBinding}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 角色映射编辑对话框 */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRole ? '编辑角色映射' : '添加角色映射'}</DialogTitle>
            <DialogDescription>配置EKP角色与本系统角色的映射关系</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>本系统角色</Label>
              <Select
                value={roleForm.local_role_id}
                onValueChange={(value) => {
                  const role = localRoles.find((r) => r.fd_id === value);
                  setRoleForm({
                    ...roleForm,
                    local_role_id: value,
                    local_role_name: role?.fd_name || '',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择本系统角色" />
                </SelectTrigger>
                <SelectContent>
                  {localRoles.map((role) => (
                    <SelectItem key={role.fd_id} value={role.fd_id}>
                      {role.fd_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>EKP角色ID</Label>
              <Input
                value={roleForm.ekp_role_id}
                onChange={(e) => setRoleForm({ ...roleForm, ekp_role_id: e.target.value })}
                placeholder="EKP系统中的角色ID"
              />
            </div>
            <div className="grid gap-2">
              <Label>EKP角色名称</Label>
              <Input
                value={roleForm.ekp_role_name}
                onChange={(e) => setRoleForm({ ...roleForm, ekp_role_name: e.target.value })}
                placeholder="EKP系统中的角色名称"
              />
            </div>
            <div className="grid gap-2">
              <Label>EKP角色代码</Label>
              <Input
                value={roleForm.ekp_role_code}
                onChange={(e) => setRoleForm({ ...roleForm, ekp_role_code: e.target.value })}
                placeholder="用于精确匹配的代码"
              />
            </div>
            <div className="grid gap-2">
              <Label>优先级</Label>
              <Input
                type="number"
                value={roleForm.priority}
                onChange={(e) => setRoleForm({ ...roleForm, priority: parseInt(e.target.value) || 0 })}
                placeholder="数字越大优先级越高"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={roleForm.is_active}
                onCheckedChange={(checked) => setRoleForm({ ...roleForm, is_active: checked })}
              />
              <Label>是否生效</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveRole}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
