'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  Mail,
  Webhook,
  MessageSquare,
} from 'lucide-react';
import { NotificationChannel, CHANNEL_LABELS, ChannelConfig } from '@/lib/monitor/types';

const CHANNEL_ICONS: Record<NotificationChannel, React.ReactNode> = {
  [NotificationChannel.EMAIL]: <Mail className="w-4 h-4" />,
  [NotificationChannel.WEBHOOK]: <Webhook className="w-4 h-4" />,
  [NotificationChannel.DINGTALK]: <MessageSquare className="w-4 h-4" />,
  [NotificationChannel.WECHAT_WORK]: <MessageSquare className="w-4 h-4" />,
  [NotificationChannel.SYSTEM]: <MessageSquare className="w-4 h-4" />,
};

export default function MonitorChannelsPage() {
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    channel: NotificationChannel.EMAIL as NotificationChannel,
    name: '',
    enabled: true,
    // Email配置
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpFrom: '',
    // Webhook配置
    webhookUrl: '',
    webhookMethod: 'POST' as 'GET' | 'POST' | 'PUT',
    // 钉钉配置
    dingtalkWebhook: '',
    dingtalkSecret: '',
    // 企业微信配置
    wechatWorkWebhook: '',
    wechatWorkAgentId: '',
  });

  // 加载渠道列表
  const loadChannels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/monitor/channels');
      const data = await response.json();
      if (data.success) {
        setChannels(data.data);
      }
    } catch (error) {
      console.error('加载渠道失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  // 创建/更新渠道
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        id: editingChannel?.id,
        channel: formData.channel,
        name: formData.name,
        enabled: formData.enabled,
        smtpHost: formData.smtpHost,
        smtpPort: formData.smtpPort,
        smtpUser: formData.smtpUser,
        smtpPassword: formData.smtpPassword,
        smtpFrom: formData.smtpFrom,
        webhookUrl: formData.webhookUrl,
        webhookMethod: formData.webhookMethod,
        dingtalkWebhook: formData.dingtalkWebhook,
        dingtalkSecret: formData.dingtalkSecret,
        wechatWorkWebhook: formData.wechatWorkWebhook,
        wechatWorkAgentId: formData.wechatWorkAgentId,
      };

      const response = await fetch('/api/monitor/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        setDialogOpen(false);
        setEditingChannel(null);
        resetForm();
        loadChannels();
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (error) {
      console.error('保存渠道失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      channel: NotificationChannel.EMAIL,
      name: '',
      enabled: true,
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      smtpFrom: '',
      webhookUrl: '',
      webhookMethod: 'POST',
      dingtalkWebhook: '',
      dingtalkSecret: '',
      wechatWorkWebhook: '',
      wechatWorkAgentId: '',
    });
  };

  const openEditDialog = (channel: ChannelConfig) => {
    setEditingChannel(channel);
    setFormData({
      channel: channel.channel,
      name: channel.name,
      enabled: channel.enabled,
      smtpHost: channel.smtpHost || '',
      smtpPort: channel.smtpPort || 587,
      smtpUser: channel.smtpUser || '',
      smtpPassword: channel.smtpPassword || '',
      smtpFrom: channel.smtpFrom || '',
      webhookUrl: channel.webhookUrl || '',
      webhookMethod: channel.webhookMethod || 'POST',
      dingtalkWebhook: channel.dingtalkWebhook || '',
      dingtalkSecret: channel.dingtalkSecret || '',
      wechatWorkWebhook: channel.wechatWorkWebhook || '',
      wechatWorkAgentId: channel.wechatWorkAgentId || '',
    });
    setDialogOpen(true);
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    return CHANNEL_ICONS[channel] || <MessageSquare className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">通知渠道</h1>
          <p className="text-muted-foreground mt-1">配置告警通知渠道和接收方式</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadChannels} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            刷新
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            新建渠道
          </Button>
        </div>
      </div>

      {/* 渠道列表 */}
      <Card>
        <CardHeader>
          <CardTitle>已配置的通知渠道 ({channels.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>渠道类型</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>配置信息</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : channels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    暂无通知渠道，点击&quot;新建渠道&quot;添加
                  </TableCell>
                </TableRow>
              ) : (
                channels.map(channel => (
                  <TableRow key={channel.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getChannelIcon(channel.channel)}
                        <Badge variant="outline">
                          {CHANNEL_LABELS[channel.channel]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{channel.name}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {channel.channel === NotificationChannel.EMAIL && channel.smtpHost && (
                          <span>{channel.smtpHost}:{channel.smtpPort}</span>
                        )}
                        {channel.channel === NotificationChannel.WEBHOOK && channel.webhookUrl && (
                          <span className="truncate max-w-xs block">{channel.webhookUrl}</span>
                        )}
                        {channel.channel === NotificationChannel.DINGTALK && channel.dingtalkWebhook && (
                          <span>已配置Webhook</span>
                        )}
                        {channel.channel === NotificationChannel.WECHAT_WORK && channel.wechatWorkWebhook && (
                          <span>已配置Webhook</span>
                        )}
                        {(!channel.smtpHost && !channel.webhookUrl && !channel.dingtalkWebhook && !channel.wechatWorkWebhook) && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={channel.enabled ? 'secondary' : 'outline'} className={channel.enabled ? 'bg-green-100 text-green-800' : ''}>
                        {channel.enabled ? '已启用' : '已禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEditDialog(channel)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
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
            <DialogTitle>{editingChannel ? '编辑渠道' : '新建渠道'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="channel">渠道类型 *</Label>
                <Select 
                  value={formData.channel} 
                  onValueChange={v => setFormData({ ...formData, channel: v as NotificationChannel })}
                  disabled={!!editingChannel}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          {getChannelIcon(value as NotificationChannel)}
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">渠道名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入渠道名称"
                />
              </div>
            </div>

            {/* 邮件配置 */}
            {formData.channel === NotificationChannel.EMAIL && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">邮件配置</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP服务器</Label>
                    <Input
                      id="smtpHost"
                      value={formData.smtpHost}
                      onChange={e => setFormData({ ...formData, smtpHost: e.target.value })}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP端口</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={formData.smtpPort}
                      onChange={e => setFormData({ ...formData, smtpPort: parseInt(e.target.value) || 587 })}
                      placeholder="587"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">用户名</Label>
                    <Input
                      id="smtpUser"
                      value={formData.smtpUser}
                      onChange={e => setFormData({ ...formData, smtpUser: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">密码</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={formData.smtpPassword}
                      onChange={e => setFormData({ ...formData, smtpPassword: e.target.value })}
                      placeholder="请输入密码"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFrom">发件人</Label>
                  <Input
                    id="smtpFrom"
                    value={formData.smtpFrom}
                    onChange={e => setFormData({ ...formData, smtpFrom: e.target.value })}
                    placeholder="noreply@example.com"
                  />
                </div>
              </div>
            )}

            {/* Webhook配置 */}
            {formData.channel === NotificationChannel.WEBHOOK && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Webhook配置</h4>
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook地址 *</Label>
                  <Input
                    id="webhookUrl"
                    value={formData.webhookUrl}
                    onChange={e => setFormData({ ...formData, webhookUrl: e.target.value })}
                    placeholder="https://your-webhook-endpoint.com/notify"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhookMethod">请求方法</Label>
                  <Select 
                    value={formData.webhookMethod} 
                    onValueChange={v => setFormData({ ...formData, webhookMethod: v as 'GET' | 'POST' | 'PUT' })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* 钉钉配置 */}
            {formData.channel === NotificationChannel.DINGTALK && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">钉钉配置</h4>
                <div className="space-y-2">
                  <Label htmlFor="dingtalkWebhook">Webhook地址 *</Label>
                  <Input
                    id="dingtalkWebhook"
                    value={formData.dingtalkWebhook}
                    onChange={e => setFormData({ ...formData, dingtalkWebhook: e.target.value })}
                    placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dingtalkSecret">加签密钥（可选）</Label>
                  <Input
                    id="dingtalkSecret"
                    value={formData.dingtalkSecret}
                    onChange={e => setFormData({ ...formData, dingtalkSecret: e.target.value })}
                    placeholder="SEC开头的密钥"
                  />
                </div>
              </div>
            )}

            {/* 企业微信配置 */}
            {formData.channel === NotificationChannel.WECHAT_WORK && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">企业微信配置</h4>
                <div className="space-y-2">
                  <Label htmlFor="wechatWorkWebhook">Webhook地址 *</Label>
                  <Input
                    id="wechatWorkWebhook"
                    value={formData.wechatWorkWebhook}
                    onChange={e => setFormData({ ...formData, wechatWorkWebhook: e.target.value })}
                    placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wechatWorkAgentId">AgentId（可选）</Label>
                  <Input
                    id="wechatWorkAgentId"
                    value={formData.wechatWorkAgentId}
                    onChange={e => setFormData({ ...formData, wechatWorkAgentId: e.target.value })}
                    placeholder="企业微信应用AgentId"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={v => setFormData({ ...formData, enabled: v })}
              />
              <Label htmlFor="enabled">启用渠道</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={saving || !formData.name}>
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
