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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
// 类型定义
// ============================================

interface FlowMapping {
  id: string;
  businessType: string;
  businessTypeName: string;
  businessKeywords: string[];
  flowTemplateId?: string;
  flowTemplateName?: string;
  formUrl?: string;
  formCode?: string;
  formVersion?: string;
  fieldMappings?: Record<string, string>;
  category?: string;
  enabled: boolean;
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FlowMappingFormData {
  businessType: string;
  businessTypeName: string;
  businessKeywords: string;
  flowTemplateId: string;
  flowTemplateName: string;
  launchEndpoint: string;
  formUrl: string;
  formCode: string;
  formVersion?: string;
  fieldMappings: string;
  category: string;
  enabled: boolean;
}

// ============================================
// 默认表单数据
// ============================================

const DEFAULT_FORM_DATA: FlowMappingFormData = {
  businessType: '',
  businessTypeName: '',
  businessKeywords: '',
  flowTemplateId: '',
  flowTemplateName: '',
  launchEndpoint: '/km/review/restservice/kmReviewRestService/launch',
  formUrl: '',
  formCode: '',
  formVersion: '',
  fieldMappings: '',
  category: 'hr',
  enabled: true,
};

// ============================================
// 页面组件
// ============================================

export default function FlowMappingPage() {
  // 状态
  const [mappings, setMappings] = useState<FlowMapping[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
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
      if (filterCategory) params.set('category', filterCategory);

      const response = await fetch(`/api/admin/flow-mappings?${params}`);
      const result = await response.json();

      if (result.success) {
        setMappings(result.data.mappings);
        setCategories(result.data.categories || []);
      } else {
        toast.error(result.error || '加载失败');
      }
    } catch (error) {
      toast.error('加载数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, filterCategory]);

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
        businessTypeName: mapping.businessTypeName,
        businessKeywords: mapping.businessKeywords.join(', '),
        flowTemplateId: mapping.flowTemplateId || '',
        flowTemplateName: mapping.flowTemplateName || '',
        launchEndpoint: '/km/review/restservice/kmReviewRestService/launch',
        formUrl: mapping.formUrl || '',
        formCode: mapping.formCode || '',
        formVersion: mapping.formVersion || '',
        fieldMappings: mapping.fieldMappings 
          ? JSON.stringify(mapping.fieldMappings, null, 2)
          : '',
        category: mapping.category || 'hr',
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
      let fieldMappings: Record<string, string> = {};
      if (data.fieldMappings) {
        try {
          fieldMappings = JSON.parse(data.fieldMappings);
        } catch {
          toast.error('字段映射 JSON 格式错误');
          setSaving(false);
          return;
        }
      }

      const payload = {
        ...data,
        businessKeywords: data.businessKeywords.split(',').map(k => k.trim()).filter(Boolean),
        fieldMappings,
      };

      const url = editingMapping 
        ? `/api/admin/flow-mappings?id=${editingMapping.id}`
        : '/api/admin/flow-mappings';
      
      const method = editingMapping ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingMapping ? { id: editingMapping.id, ...payload } : payload),
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
            管理业务类型到 EKP 流程模板的映射关系
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
                  placeholder="搜索业务类型、名称、表单编码..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">全部分类</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
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
                  <TableHead>表单编码</TableHead>
                  <TableHead>流程模板</TableHead>
                  <TableHead>分类</TableHead>
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
                        <div className="font-medium">{mapping.businessTypeName}</div>
                        <div className="text-xs text-muted-foreground">{mapping.businessType}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {mapping.formCode || '-'}
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
                      <Badge variant="outline">{mapping.category || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {mapping.businessKeywords.slice(0, 3).map((kw, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                        {mapping.businessKeywords.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{mapping.businessKeywords.length - 3}
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
                    name="businessTypeName"
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

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>分类</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="hr">人力资源</option>
                          <option value="finance">财务</option>
                          <option value="office">行政</option>
                          <option value="procurement">采购</option>
                          <option value="other">其他</option>
                        </select>
                      </FormControl>
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

                <FormField
                  control={form.control}
                  name="launchEndpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>发起接口路径</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="/km/review/restservice/kmReviewRestService/launch" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* 表单信息 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  表单信息
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="formCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>表单编码</FormLabel>
                        <FormControl>
                          <Input placeholder="leave_form" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="formVersion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>表单版本</FormLabel>
                        <FormControl>
                          <Input placeholder="v1.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="formUrl"
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
  "leaveType": "fd_leave_type",
  "startTime": "fd_start_time",
  "endTime": "fd_end_time",
  "days": "fd_days",
  "reason": "fd_reason"
}`}
                          className="font-mono text-xs h-40"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        AI 字段名 → EKP 字段名 的映射关系
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* 状态 */}
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>启用状态</FormLabel>
                      <FormDescription>
                        禁用后 AI 将不会识别此业务类型
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-5 h-5"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

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
