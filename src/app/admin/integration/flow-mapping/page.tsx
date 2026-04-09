'use client';

/**
 * 流程映射管理页面
 * /admin/integration/flow-mapping
 * 
 * 管理业务类型到 EKP 流程模板的映射关系
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Key,
  Link2,
  Settings,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================
// 类型定义（与 API 返回格式匹配）
// ============================================

interface FlowMapping {
  id: string;
  businessType: string;
  businessName: string;
  keywords: string[];
  flowTemplateId?: string;
  flowTemplateName?: string;
  formTemplateId?: string;
  formTemplateUrl?: string;
  fieldMappings?: FieldMapping[];
  enabled: boolean;
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FieldMapping {
  ekpField: string;
  localField: string;
  label: string;
  required?: boolean;
}

interface BusinessTypeOption {
  value: string;
  label: string;
}

interface FlowMappingFormData {
  businessType: string;
  businessName: string;
  businessKeywords: string;
  flowTemplateId: string;
  flowTemplateName: string;
  formTemplateId: string;
  formTemplateUrl: string;
  fieldMappings: string;
  enabled: boolean;
}

// ============================================
// 默认表单数据
// ============================================

const DEFAULT_FORM_DATA: FlowMappingFormData = {
  businessType: '',
  businessName: '',
  businessKeywords: '',
  flowTemplateId: '',
  flowTemplateName: '',
  formTemplateId: '',
  formTemplateUrl: '',
  fieldMappings: '',
  enabled: true,
};

// ============================================
// 页面组件
// ============================================

export default function FlowMappingPage() {
  // 状态
  const [mappings, setMappings] = useState<FlowMapping[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FlowMapping | null>(null);
  const [saving, setSaving] = useState(false);

  // 表单
  const form = useForm<FlowMappingFormData>({
    defaultValues: DEFAULT_FORM_DATA,
  });

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword) params.set('keyword', searchKeyword);

      const response = await fetch(`/api/admin/flow-mappings?${params}`);
      const result = await response.json();

      if (result.success) {
        setMappings(result.data.mappings || []);
        setBusinessTypes(result.data.businessTypes || []);
      } else {
        toast.error(result.error || '加载失败');
      }
    } catch (error) {
      toast.error('加载数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 初始化默认映射
  const handleInit = async () => {
    try {
      const response = await fetch('/api/admin/flow-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init' }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success('默认映射初始化成功');
        loadData();
      } else {
        toast.error(result.error || '初始化失败');
      }
    } catch (error) {
      toast.error('初始化失败');
      console.error(error);
    }
  };

  // 打开编辑对话框
  const handleEdit = (mapping?: FlowMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      form.reset({
        businessType: mapping.businessType,
        businessName: mapping.businessName,
        businessKeywords: mapping.keywords.join(', '),
        flowTemplateId: mapping.flowTemplateId || '',
        flowTemplateName: mapping.flowTemplateName || '',
        formTemplateId: mapping.formTemplateId || '',
        formTemplateUrl: mapping.formTemplateUrl || '',
        fieldMappings: mapping.fieldMappings 
          ? JSON.stringify({ fields: mapping.fieldMappings }, null, 2)
          : '',
        enabled: mapping.enabled,
      });
    } else {
      setEditingMapping(null);
      form.reset(DEFAULT_FORM_DATA);
    }
    setDialogOpen(true);
  };

  // 保存
  const handleSave = async (data: FlowMappingFormData) => {
    setSaving(true);
    try {
      // 解析字段映射
      let fieldMappings: FieldMapping[] = [];
      if (data.fieldMappings) {
        try {
          const parsed = JSON.parse(data.fieldMappings);
          fieldMappings = parsed.fields || [];
        } catch {
          toast.error('字段映射 JSON 格式错误');
          setSaving(false);
          return;
        }
      }

      const payload = {
        businessType: data.businessType,
        businessName: data.businessName,
        keywords: data.businessKeywords.split(',').map(k => k.trim()).filter(Boolean),
        flowTemplateId: data.flowTemplateId || undefined,
        flowTemplateName: data.flowTemplateName || undefined,
        formTemplateId: data.formTemplateId || undefined,
        formTemplateUrl: data.formTemplateUrl || undefined,
        fieldMappings,
        enabled: data.enabled,
      };

      const method = editingMapping ? 'PUT' : 'POST';
      const body = editingMapping 
        ? { id: editingMapping.id, ...payload }
        : payload;

      const response = await fetch('/api/admin/flow-mappings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingMapping ? '更新成功' : '创建成功');
        setDialogOpen(false);
        loadData();
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // 删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个映射吗？')) return;

    try {
      const response = await fetch(`/api/admin/flow-mappings?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('删除成功');
        loadData();
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
      console.error(error);
    }
  };

  // 切换启用状态
  const handleToggleEnabled = async (mapping: FlowMapping) => {
    try {
      const response = await fetch('/api/admin/flow-mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: mapping.id,
          enabled: !mapping.enabled,
        }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success(mapping.enabled ? '已禁用' : '已启用');
        loadData();
      } else {
        toast.error(result.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">流程映射管理</h1>
          <p className="text-muted-foreground">
            管理业务类型到 EKP 流程模板的映射关系，支持 AI 自然语言填表
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleInit}>
            <Database className="w-4 h-4 mr-2" />
            初始化默认映射
          </Button>
          <Button onClick={() => handleEdit()}>
            <Plus className="w-4 h-4 mr-2" />
            新建映射
          </Button>
        </div>
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索业务类型、名称..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 列表 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>暂无映射配置</p>
              <Button variant="link" onClick={handleInit}>
                初始化默认映射
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>业务类型</TableHead>
                  <TableHead>表单模板ID</TableHead>
                  <TableHead>流程模板</TableHead>
                  <TableHead>关键词</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{mapping.businessName}</div>
                        <div className="text-xs text-muted-foreground">{mapping.businessType}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {mapping.formTemplateId || '-'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{mapping.flowTemplateName || '-'}</div>
                        {mapping.flowTemplateId && (
                          <div className="text-xs text-muted-foreground">
                            ID: {mapping.flowTemplateId.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {mapping.keywords.slice(0, 3).map((kw, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                        {mapping.keywords.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{mapping.keywords.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleEnabled(mapping)}
                        className={cn(
                          mapping.enabled ? 'text-green-600' : 'text-muted-foreground'
                        )}
                      >
                        {mapping.enabled ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(mapping)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!mapping.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(mapping.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? '编辑映射' : '新建映射'}
            </DialogTitle>
            <DialogDescription>
              配置业务类型到 EKP 流程模板的映射关系
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
              {/* 基础信息 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  基础信息
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="businessType"
                    rules={{ required: '业务类型编码不能为空' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>业务类型编码</FormLabel>
                        <FormControl>
                          <Input placeholder="leave" {...field} />
                        </FormControl>
                        <FormDescription>英文标识，如：leave, expense</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessName"
                    rules={{ required: '业务类型名称不能为空' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>业务类型名称</FormLabel>
                        <FormControl>
                          <Input placeholder="请假申请" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="businessKeywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>关键词（逗号分隔）</FormLabel>
                      <FormControl>
                        <Input placeholder="请假,休假,事假,病假,年假" {...field} />
                      </FormControl>
                      <FormDescription>用于 AI 自动识别用户意图</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* 流程信息 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  流程信息
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="flowTemplateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>流程模板ID</FormLabel>
                        <FormControl>
                          <Input placeholder="17cba859d4a22f589b8cc4b482bb6898" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="flowTemplateName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>流程模板名称</FormLabel>
                        <FormControl>
                          <Input placeholder="请假申请流程" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* 表单信息 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  表单信息
                </h3>

                <FormField
                  control={form.control}
                  name="formTemplateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>表单模板ID</FormLabel>
                      <FormControl>
                        <Input placeholder="leave_form_001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="formTemplateUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>表单URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://oa.fjhxrl.com/km/review/km_review_main/..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>iframe 嵌入用的表单页面 URL</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* 字段映射 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  字段映射（JSON）
                </h3>

                <FormField
                  control={form.control}
                  name="fieldMappings"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder={`{
  "fields": [
    { "ekpField": "fd_leave_type", "localField": "leaveType", "label": "请假类型" },
    { "ekpField": "fd_start_time", "localField": "startTime", "label": "开始时间" }
  ]
}`}
                          {...field}
                          className="font-mono text-xs h-40"
                        />
                      </FormControl>
                      <FormDescription>
                        定义 AI 字段名与 EKP 字段名的映射关系
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
