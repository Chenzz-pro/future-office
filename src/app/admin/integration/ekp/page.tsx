'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Settings,
  RefreshCw,
  Database,
  Link2,
  TestTube,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Trash2,
  Edit,
  Save,
  RefreshCcw,
} from 'lucide-react';

interface EKPConfig {
  id?: string;
  name: string;
  url: string;
  username: string;
  password: string;
  apiPath: string;
  authType: 'basic' | 'bearer' | 'apikey';
  enabled: boolean;
}

interface SyncConfig {
  autoSync: boolean;
  syncInterval: number;
  syncScope: string[];
}

export default function EKPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'connection');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<{ total: number; success: number; failed: number; lastSync: string } | null>(null);

  const [config, setConfig] = useState<EKPConfig>({
    name: '蓝凌EKP',
    url: 'https://oa.fjhxrl.com',
    username: '',
    password: '',
    apiPath: '/api/sys-notify/sysNotifyTodoRestService/getTodo',
    authType: 'basic',
    enabled: true,
  });

  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    autoSync: true,
    syncInterval: 60,
    syncScope: ['organizations', 'persons', 'departments'],
  });

  // 加载配置
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ekp?action=getConfig');
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (error) {
      console.error('获取配置失败:', error);
    }
    setLoading(false);
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ekp?action=saveConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (data.success) {
        alert('配置保存成功');
      } else {
        alert('配置保存失败: ' + data.message);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败');
    }
    setLoading(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/ekp?action=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? '连接成功' : '连接失败'),
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: '测试连接失败，请检查网络和配置',
      });
    }
    setTesting(false);
  };

  const handleSync = async (type: 'full' | 'incremental') => {
    setSyncing(true);
    try {
      const response = await fetch('/api/organization/sync?source=ekp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await response.json();
      if (data.success) {
        setSyncStats({
          total: data.stats?.total || 0,
          success: data.stats?.success || 0,
          failed: data.stats?.failed || 0,
          lastSync: new Date().toLocaleString(),
        });
        alert(`同步完成：成功 ${data.stats?.success || 0} 条，失败 ${data.stats?.failed || 0} 条`);
      } else {
        alert('同步失败: ' + (data.message || '未知错误'));
      }
    } catch (error) {
      console.error('同步失败:', error);
      alert('同步失败');
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">蓝凌EKP集成</h1>
            <p className="text-muted-foreground">企业协同办公平台集成配置</p>
          </div>
        </div>
        <Badge variant={config.enabled ? 'default' : 'secondary'} className="text-sm px-3 py-1">
          {config.enabled ? '已启用' : '已禁用'}
        </Badge>
      </div>

      {/* 状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">连接状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {testResult?.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : testResult?.success === false ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-400" />
              )}
              <span className="font-medium">
                {testResult?.success === undefined ? '未测试' : testResult?.success ? '已连接' : '连接失败'}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">最后同步</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">{syncStats?.lastSync || '从未同步'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">同步成功</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{syncStats?.success || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">同步失败</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{syncStats?.failed || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* 功能Tab */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="connection">
            <Link2 className="w-4 h-4 mr-2" />
            连接配置
          </TabsTrigger>
          <TabsTrigger value="sync">
            <RefreshCw className="w-4 h-4 mr-2" />
            组织架构同步
          </TabsTrigger>
          <TabsTrigger value="interfaces">
            <Database className="w-4 h-4 mr-2" />
            接口管理
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Settings className="w-4 h-4 mr-2" />
            高级配置
          </TabsTrigger>
        </TabsList>

        {/* 连接配置 */}
        <TabsContent value="connection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>连接配置</CardTitle>
              <CardDescription>配置EKP系统的连接信息和认证方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">配置名称</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    placeholder="蓝凌EKP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">EKP地址</Label>
                  <Input
                    id="url"
                    value={config.url}
                    onChange={(e) => setConfig({ ...config, url: e.target.value })}
                    placeholder="https://oa.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    value={config.username}
                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                    placeholder="管理员用户名"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    value={config.password}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    placeholder="管理员密码"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiPath">接口路径</Label>
                  <Input
                    id="apiPath"
                    value={config.apiPath}
                    onChange={(e) => setConfig({ ...config, apiPath: e.target.value })}
                    placeholder="/api/sys-notify/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authType">认证方式</Label>
                  <Select
                    value={config.authType}
                    onValueChange={(value) => setConfig({ ...config, authType: value as EKPConfig['authType'] })}
                  >
                    <SelectTrigger id="authType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="apikey">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    id="enabled"
                    checked={config.enabled}
                    onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                  />
                  <Label htmlFor="enabled">启用EKP集成</Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                    {testing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4 mr-2" />
                    )}
                    测试连接
                  </Button>
                  <Button onClick={handleSaveConfig} disabled={loading}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    保存配置
                  </Button>
                </div>
              </div>

              {/* 测试结果 */}
              {testResult && (
                <div className={`p-4 rounded-lg ${
                  testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">{testResult.message}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 组织架构同步 */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>同步配置</CardTitle>
              <CardDescription>配置从EKP系统同步组织架构的方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Switch
                    id="autoSync"
                    checked={syncConfig.autoSync}
                    onCheckedChange={(checked) => setSyncConfig({ ...syncConfig, autoSync: checked })}
                  />
                  <Label htmlFor="autoSync" className="font-medium">启用自动同步</Label>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4" />
                  每 <Input
                    className="w-16 h-8 inline-block mx-2 text-center"
                    type="number"
                    value={syncConfig.syncInterval}
                    onChange={(e) => setSyncConfig({ ...syncConfig, syncInterval: parseInt(e.target.value) || 60 })}
                    disabled={!syncConfig.autoSync}
                  /> 分钟
                </div>
              </div>

              <div className="space-y-2">
                <Label>同步范围</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'organizations', label: '机构', icon: Building2 },
                    { key: 'departments', label: '部门', icon: Database },
                    { key: 'persons', label: '人员', icon: Link2 },
                  ].map(item => (
                    <Badge
                      key={item.key}
                      variant={syncConfig.syncScope.includes(item.key) ? 'default' : 'outline'}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => {
                        const scope = syncConfig.syncScope.includes(item.key)
                          ? syncConfig.syncScope.filter(s => s !== item.key)
                          : [...syncConfig.syncScope, item.key];
                        setSyncConfig({ ...syncConfig, syncScope: scope });
                      }}
                    >
                      <item.icon className="w-3 h-3 mr-1" />
                      {item.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => handleSync('full')} disabled={syncing}>
                  {syncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  全量同步
                </Button>
                <Button variant="outline" onClick={() => handleSync('incremental')} disabled={syncing}>
                  {syncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCcw className="w-4 h-4 mr-2" />
                  )}
                  增量同步
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 同步历史 */}
          <Card>
            <CardHeader>
              <CardTitle>同步历史</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                暂无同步历史记录
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 接口管理 */}
        <TabsContent value="interfaces" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>EKP接口列表</CardTitle>
                  <CardDescription>管理EKP系统的REST接口配置</CardDescription>
                </div>
                <Button onClick={() => router.push('/admin/integration/ekp/interfaces')}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加接口
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                点击上方按钮进入EKP接口管理中心
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 高级配置 */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>高级配置</CardTitle>
              <CardDescription>配置重试策略、超时设置等高级选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">请求超时（秒）</Label>
                  <Input id="timeout" type="number" defaultValue={30} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retry">重试次数</Label>
                  <Input id="retry" type="number" defaultValue={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retryDelay">重试间隔（秒）</Label>
                  <Input id="retryDelay" type="number" defaultValue={5} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchSize">批量大小</Label>
                  <Input id="batchSize" type="number" defaultValue={100} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="headers">自定义请求头</Label>
                <Textarea
                  id="headers"
                  placeholder="Accept: application/json"
                  rows={3}
                />
              </div>
              <div className="pt-4">
                <Button>保存高级配置</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
