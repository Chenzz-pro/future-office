'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface InterfaceForm {
  code: string;
  name: string;
  description?: string;
  category: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  serviceId: string;
  enabled: boolean;
  version?: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
}

interface InterfaceFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  source: 'official' | 'custom';
  initialData?: any;
}

export default function InterfaceFormDialog({
  open,
  onClose,
  onSave,
  source,
  initialData,
}: InterfaceFormDialogProps) {
  const [form, setForm] = useState<InterfaceForm>({
    code: '',
    name: '',
    description: '',
    category: '',
    path: '',
    method: 'POST',
    serviceId: 'ekp-service',
    enabled: true,
    version: '1.0',
    request: {},
    response: {},
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        code: initialData.code || '',
        name: initialData.name || '',
        description: initialData.description || '',
        category: initialData.category || '',
        path: initialData.path || '',
        method: initialData.method || 'POST',
        serviceId: initialData.serviceId || 'ekp-service',
        enabled: initialData.enabled !== false,
        version: initialData.version || '1.0',
        request: initialData.request || {},
        response: initialData.response || {},
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.category || !form.path) {
      alert('请填写必填字段');
      return;
    }

    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (error) {
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const categories = source === 'official'
    ? ['workflow', 'document', 'organization', 'system']
    : ['流程', '统计', '文档', '其他'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? '编辑' : '添加'}{source === 'official' ? '官方接口' : '二开接口'}
          </DialogTitle>
          <DialogDescription>
            {initialData ? '修改接口配置信息' : '创建新的接口配置'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                接口代码 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="例如: todo.getTodo"
                disabled={!!initialData}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                接口名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如: 获取待办数量"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                接口分类 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">版本</Label>
              <Input
                id="version"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="1.0"
              />
            </div>
          </div>

          {/* 接口路径 */}
          <div className="space-y-2">
            <Label htmlFor="path">
              接口路径 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="path"
              value={form.path}
              onChange={(e) => setForm({ ...form, path: e.target.value })}
              placeholder="/api/sys-notify/sysNotifyTodoRestService/getTodo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="method">HTTP方法</Label>
              <Select
                value={form.method}
                onValueChange={(value: any) => setForm({ ...form, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceId">服务标识</Label>
              <Input
                id="serviceId"
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                placeholder="ekp-service"
              />
            </div>
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">接口描述</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="描述接口的功能和用途"
              rows={3}
            />
          </div>

          {/* 启用状态 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">启用接口</Label>
            <Switch
              id="enabled"
              checked={form.enabled}
              onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {initialData ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
