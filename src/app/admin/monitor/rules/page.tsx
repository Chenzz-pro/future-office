'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import {
  AlertRule,
  AlertLevel,
  AlertType,
  NotificationChannel,
  ALERT_LEVEL_LABELS,
  ALERT_TYPE_LABELS,
  CHANNEL_LABELS,
  ALERT_RULE_TEMPLATES,
} from '@/lib/monitor/types';

export default function MonitorRulesPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: AlertType.CUSTOM,
    level: AlertLevel.WARNING,
    enabled: true,
    relatedSystem: '',
    notificationConfig: {
      channels: [] as NotificationChannel[],
      recipients: [] as string[],
      cooldownMinutes: 5,
    },
  });

  // 加载规则列表
  const loadRules = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/monitor/rules');
      const data = await response.json();
      if (data.success) {
        setRules(data.data);
      }
    } catch (error) {
      console.error('加载规则失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  // 创建/更新规则
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/monitor/rules', {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        setDialogOpen(false);
        setEditingRule(null);
        resetForm();
        loadRules();
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (error) {
      console.error('保存规则失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 删除规则
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个规则吗？')) return;
    
    try {
      const response = await fetch(`/api/monitor/rules?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        loadRules();
      }
    } catch (error) {
      console.error('删除规则失败:', error);
    }
  };

  // 切换启用状态
  const handleToggle = async (rule: AlertRule) => {
    try {
      const response = await fetch('/api/monitor/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      });
      const data = await response.json();
      if (data.success) {
        loadRules();
      }
    } catch (error) {
      console.error('切换状态失败:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: AlertType.CUSTOM,
      level: AlertLevel.WARNING,
      enabled: true,
      relatedSystem: '',
      notificationConfig: {
        channels: [],
        recipients: [],
        cooldownMinutes: 5,
      },
    });
  };

  const openEditDialog = (rule: AlertRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      type: rule.type,
      level: rule.level,
      enabled: rule.enabled,
      relatedSystem: rule.relatedSystem || '',
      notificationConfig: {
        channels: rule.notificationConfig.channels,
        recipients: rule.notificationConfig.recipients || [],
        cooldownMinutes: rule.notificationConfig.cooldownMinutes || 5,
      },
    });
    setDialogOpen(true);
  };

  const applyTemplate = (template: typeof ALERT_RULE_TEMPLATES[0]) => {
    setFormData({
      ...formData,
      name: template.name,
      description: template.description,
      type: template.type,
      level: template.level,
      notificationConfig: {
        ...formData.notificationConfig,
        channels: template.notificationConfig.channels,
        cooldownMinutes: template.notificationConfig.cooldownMinutes || 5,
      },
    });
  };

  const toggleChannel = (channel: NotificationChannel) => {
    const channels = formData.notificationConfig.channels.includes(channel)
      ? formData.notificationConfig.channels.filter(c => c !== channel)
      : [...formData.notificationConfig.channels, channel];
    setFormData({
      ...formData,
      notificationConfig: { ...formData.notificationConfig, channels },
    });
  };

  const getLevelBadge = (level: AlertLevel) => {
    const colors: Record<AlertLevel, string> = {
      [AlertLevel.INFO]: 'bg-blue-100 text-blue-800',
      [AlertLevel.WARNING]: 'bg-yellow-100 text-yellow-800',
      [AlertLevel.ERROR]: 'bg-red-100 text-red-800',
      [AlertLevel.CRITICAL]: 'bg-purple-100 text-purple-800',
    };
    return (
      <Badge className={colors[level]}>
        {ALERT_LEVEL_LABELS[level]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">告警规则</h1>
          <p className="text-muted-foreground mt-1">配置告警触发规则和通知方式</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRules} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            刷新
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            新建规则
          </Button>
        </div>
      </div>

      {/* 规则列表 */}
      <Card>
        <CardHeader>
          <CardTitle>规则列表 ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>规则名称</TableHead>
                <TableHead>告警类型</TableHead>
                <TableHead>级别</TableHead>
                <TableHead>关联系统</TableHead>
                <TableHead>通知渠道</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    暂无告警规则，点击&quot;新建规则&quot;创建
                  </TableCell>
                </TableRow>
              ) : (
                rules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        {rule.description && (
                          <div className="text-sm text-muted-foreground">{rule.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ALERT_TYPE_LABELS[rule.type] || rule.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{getLevelBadge(rule.level)}</TableCell>
                    <TableCell>
                      {rule.relatedSystem ? (
                        <Badge variant="outline">{rule.relatedSystem}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {rule.notificationConfig.channels.map(ch => (
                          <Badge key={ch} variant="secondary" className="text-xs">
                            {CHANNEL_LABELS[ch]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={rule.enabled} onCheckedChange={() => handleToggle(rule)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(rule)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(rule.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? '编辑规则' : '新建规则'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* 模板选择 */}
            {!editingRule && (
              <div className="space-y-2">
                <Label>快速模板</Label>
                <div className="flex flex-wrap gap-2">
                  {ALERT_RULE_TEMPLATES.map((template, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => applyTemplate(template)}
                    >
                      {template.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">规则名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入规则名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relatedSystem">关联系统</Label>
                <Input
                  id="relatedSystem"
                  value={formData.relatedSystem}
                  onChange={e => setFormData({ ...formData, relatedSystem: e.target.value })}
                  placeholder="如: EKP, 定时任务等"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">告警类型 *</Label>
                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v as AlertType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ALERT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">告警级别 *</Label>
                <Select value={formData.level} onValueChange={v => setFormData({ ...formData, level: v as AlertLevel })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ALERT_LEVEL_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">规则描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入规则描述"
              />
            </div>

            <div className="border-t pt-4">
              <Label className="mb-2 block">通知渠道 *</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                  <Badge
                    key={value}
                    variant={formData.notificationConfig.channels.includes(value as NotificationChannel) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleChannel(value as NotificationChannel)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooldown">告警冷却时间（分钟）</Label>
              <Input
                id="cooldown"
                type="number"
                value={formData.notificationConfig.cooldownMinutes}
                onChange={e => setFormData({
                  ...formData,
                  notificationConfig: {
                    ...formData.notificationConfig,
                    cooldownMinutes: parseInt(e.target.value) || 5,
                  },
                })}
                className="w-32"
                min={1}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={v => setFormData({ ...formData, enabled: v })}
              />
              <Label htmlFor="enabled">启用规则</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
