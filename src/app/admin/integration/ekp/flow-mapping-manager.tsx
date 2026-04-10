'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface FlowMapping {
  id: string;
  businessType: string;
  businessName: string;
  formUrl: string;
  templateId: string;
  enabled: boolean;
}

const BUSINESS_TYPES = [
  { value: 'leave', label: '请假申请' },
  { value: 'expense', label: '费用报销' },
  { value: 'trip', label: '出差申请' },
  { value: 'purchase', label: '采购申请' },
  { value: 'vehicle', label: '用车申请' },
  { value: 'reception', label: '接待申请' },
  { value: 'loan', label: '借款申请' },
  { value: 'custom', label: '自定义流程' },
];

export default function FlowMappingManager() {
  const [mappings, setMappings] = useState<FlowMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FlowMapping | null>(null);
  const [formData, setFormData] = useState<Omit<FlowMapping, 'id'>>({
    businessType: '',
    businessName: '',
    formUrl: '',
    templateId: '',
    enabled: true,
  });

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/flow-mappings');
      const data = await response.json();
      if (data.success) {
        setMappings(data.data || []);
      }
    } catch (error) {
      console.error('获取流程映射失败:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const mapping = editingMapping 
        ? { ...formData, id: editingMapping.id }
        : { ...formData };
      
      const response = await fetch('/api/admin/flow-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping),
      });
      const data = await response.json();
      
      if (data.success) {
        fetchMappings();
        setShowDialog(false);
        setEditingMapping(null);
        setFormData({
          businessType: '',
          businessName: '',
          formUrl: '',
          templateId: '',
          enabled: true,
        });
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (error) {
      console.error('保存流程映射失败:', error);
      alert('保存失败');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个流程映射吗？')) return;
    
    try {
      const response = await fetch(`/api/admin/flow-mappings?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        fetchMappings();
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch (error) {
      console.error('删除流程映射失败:', error);
      alert('删除失败');
    }
  };

  const openEditDialog = (mapping?: FlowMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      setFormData({
        businessType: mapping.businessType,
        businessName: mapping.businessName,
        formUrl: mapping.formUrl,
        templateId: mapping.templateId,
        enabled: mapping.enabled,
      });
    } else {
      setEditingMapping(null);
      setFormData({
        businessType: '',
        businessName: '',
        formUrl: '',
        templateId: '',
        enabled: true,
      });
    }
    setShowDialog(true);
  };

  const handleBusinessTypeChange = (value: string) => {
    const businessType = BUSINESS_TYPES.find(t => t.value === value);
    setFormData({
      ...formData,
      businessType: value,
      businessName: businessType?.label || '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">流程映射管理</h3>
          <p className="text-sm text-muted-foreground">
            配置业务类型与 EKP 表单模板的映射关系
          </p>
        </div>
        <Button onClick={() => openEditDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          添加映射
        </Button>
      </div>

      {mappings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground mb-4">暂无流程映射配置</p>
            <Button variant="outline" onClick={() => openEditDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              添加第一个映射
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {mappings.map((mapping) => (
            <Card key={mapping.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={mapping.enabled ? 'default' : 'secondary'}>
                      {mapping.businessType}
                    </Badge>
                    <span className="font-medium">{mapping.businessName}</span>
                    {mapping.enabled ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {mapping.formUrl}
                  </p>
                  {mapping.templateId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      模板ID: {mapping.templateId}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(mapping)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(mapping.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 添加/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? '编辑流程映射' : '添加流程映射'}
            </DialogTitle>
            <DialogDescription>
              配置业务类型与 EKP 表单模板的映射关系
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="businessType">业务类型</Label>
              <Select
                value={formData.businessType}
                onValueChange={handleBusinessTypeChange}
              >
                <SelectTrigger id="businessType">
                  <SelectValue placeholder="选择业务类型" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">业务名称</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="业务名称"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="formUrl">表单 URL</Label>
              <Input
                id="formUrl"
                value={formData.formUrl}
                onChange={(e) => setFormData({ ...formData, formUrl: e.target.value })}
                placeholder="/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=xxx"
              />
              <p className="text-xs text-muted-foreground">
                填写 EKP 表单的相对路径或完整 URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateId">模板 ID</Label>
              <Input
                id="templateId"
                value={formData.templateId}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                placeholder="表单模板 ID"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">启用映射</Label>
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
