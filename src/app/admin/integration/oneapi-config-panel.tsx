'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Check, AlertCircle, Loader2, ExternalLink, TestTube, Save, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OneAPIConfig {
  id?: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  channelName?: string;
  isActive: boolean;
  autoLoadBalance?: boolean;
  createdAt?: string;
}

interface OneAPIChannel {
  id: string;
  name: string;
  type: string;
  baseURL: string;
  status: 'active' | 'disabled' | 'error';
  balance?: number;
  used?: number;
}

export default function OneAPIConfigPanel() {
  const [configs, setConfigs] = useState<OneAPIConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [channels, setChannels] = useState<OneAPIChannel[]>([]);

  const [newConfig, setNewConfig] = useState<Partial<OneAPIConfig>>({
    name: '',
    baseUrl: '',
    apiKey: '',
    isActive: true,
    autoLoadBalance: false,
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/oneapi');
      const data = await res.json();
      if (data.success) {
        setConfigs(data.data || []);
        if (data.channels) {
          setChannels(data.channels);
        }
      }
    } catch (error) {
      console.error('加载 OneAPI 配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (config: Partial<OneAPIConfig>) => {
    if (!config.baseUrl) return;

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/oneapi/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? '连接成功' : '连接失败'),
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: '测试连接失败，请检查网络和配置',
      });
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async () => {
    if (!newConfig.name || !newConfig.baseUrl || !newConfig.apiKey) {
      alert('请填写完整信息');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/oneapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      const data = await res.json();
      if (data.success) {
        await loadConfigs();
        setShowAddForm(false);
        setNewConfig({
          name: '',
          baseUrl: '',
          apiKey: '',
          isActive: true,
          autoLoadBalance: false,
        });
      } else {
        alert('保存失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async (id: string) => {
    if (!confirm('确定要删除这个配置吗？')) return;

    try {
      const res = await fetch(`/api/admin/oneapi/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await loadConfigs();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const toggleConfig = async (id: string) => {
    const config = configs.find(c => c.id === id);
    if (!config) return;

    try {
      const res = await fetch(`/api/admin/oneapi/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !config.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        await loadConfigs();
      }
    } catch (error) {
      console.error('切换状态失败:', error);
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '****' + key.slice(-4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 提示 */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Network className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">OneAPI 代理说明</p>
            <p>OneAPI 是一个 AI 模型 API 代理服务，可以通过一个 API Key 访问多个 AI 服务提供商。</p>
            <p className="mt-1">配置 OneAPI 后，系统将自动使用代理服务进行 AI 调用，支持负载均衡和故障转移。</p>
            <a 
              href="https://github.com/songquanpeng/one-api" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:underline"
            >
              了解更多
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* 已添加的配置列表 */}
      {configs.length > 0 ? (
        <div className="space-y-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      config.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      <Network className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{config.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{config.baseUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={config.isActive ? 'default' : 'secondary'}>
                      {config.isActive ? '已启用' : '已禁用'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleConfig(config.id!)}
                    >
                      {config.isActive ? '禁用' : '启用'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteConfig(config.id!)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono">
                      {showKeyMap[config.id!] ? config.apiKey : maskApiKey(config.apiKey)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKeyMap({ 
                        ...showKeyMap, 
                        [config.id!]: !showKeyMap[config.id!] 
                      })}
                    >
                      {showKeyMap[config.id!] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(config)}
                      disabled={testing}
                    >
                      <TestTube className="w-4 h-4 mr-1" />
                      测试
                    </Button>
                  </div>

                  {testResult && (
                    <div className={cn(
                      'p-3 rounded-lg text-sm',
                      testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    )}>
                      {testResult.success ? (
                        <Check className="w-4 h-4 inline mr-1" />
                      ) : (
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                      )}
                      {testResult.message}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* 添加新配置 */}
      {showAddForm ? (
        <Card>
          <CardHeader>
            <CardTitle>添加 OneAPI 配置</CardTitle>
            <CardDescription>配置 OneAPI 代理服务的连接信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">配置名称 *</Label>
                <Input
                  id="name"
                  value={newConfig.name}
                  onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                  placeholder="例如：我的OneAPI"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseUrl">OneAPI 地址 *</Label>
                <Input
                  id="baseUrl"
                  value={newConfig.baseUrl}
                  onChange={(e) => setNewConfig({ ...newConfig, baseUrl: e.target.value })}
                  placeholder="https://api.example.com"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="apiKey">API Key *</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={newConfig.apiKey}
                  onChange={(e) => setNewConfig({ ...newConfig, apiKey: e.target.value })}
                  placeholder="输入 OneAPI 的 API Key"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="autoBalance"
                checked={newConfig.autoLoadBalance}
                onCheckedChange={(checked) => setNewConfig({ ...newConfig, autoLoadBalance: checked })}
              />
              <Label htmlFor="autoBalance">启用自动负载均衡</Label>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t">
              <Button onClick={saveConfig} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                保存配置
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                取消
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => testConnection(newConfig)}
                disabled={testing || !newConfig.baseUrl}
              >
                <TestTube className="w-4 h-4 mr-2" />
                测试连接
              </Button>
            </div>

            {testResult && (
              <div className={cn(
                'p-3 rounded-lg text-sm',
                testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              )}>
                {testResult.success ? (
                  <Check className="w-4 h-4 inline mr-1" />
                ) : (
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                )}
                {testResult.message}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowAddForm(true)} variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          添加 OneAPI 配置
        </Button>
      )}
    </div>
  );
}
