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
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  RefreshCcw,
  ArrowRight,
  Clock,
  Info,
  Table,
  Users,
  BriefcaseBusiness,
  User,
  Key,
  Shield,
  Globe,
  Route,
  FileText,
  Plus,
  Trash2,
  Edit,
} from 'lucide-react';
import FieldMappingTable from '@/components/field-mapping-table';
import EKPInterfacesPanel from './interfaces-panel';
import UserBindingsPanel from './user-bindings-panel';

interface EKPConfig {
  // 连接配置
  baseUrl: string;
  username: string;
  password: string;
  apiPath: string;
  
  // SSO 配置
  ssoEnabled: boolean;
  ssoServiceId: string;
  ssoWebservicePath: string;
  ssoLoginPath: string;
  ssoSessionVerifyPath: string;
  
  // 代理配置
  proxyEnabled: boolean;
  proxyPath: string;
  
  // 表单模板配置
  leaveTemplateId: string;
  expenseTemplateId: string;
  tripTemplateId: string;
  purchaseTemplateId: string;
  
  // 其他
  enabled: boolean;
}

interface FlowMapping {
  id: string;
  businessType: string;
  businessName: string;
  formUrl: string;
  templateId: string;
  enabled: boolean;
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

  // 配置状态
  const [config, setConfig] = useState<EKPConfig>({
    baseUrl: '',
    username: '',
    password: '',
    apiPath: '',
    ssoEnabled: true,
    ssoServiceId: 'loginWebserviceService',
    ssoWebservicePath: '/sys/webserviceservice/',
    ssoLoginPath: '/sys/authentication/sso/login_auto.jsp',
    ssoSessionVerifyPath: '/sys/org/sys-inf/sysInfo.do?method=currentUser',
    proxyEnabled: true,
    proxyPath: '/api/ekp-proxy',
    leaveTemplateId: '',
    expenseTemplateId: '',
    tripTemplateId: '',
    purchaseTemplateId: '',
    enabled: true,
  });

  // 流程映射状态
  const [flowMappings, setFlowMappings] = useState<FlowMapping[]>([]);
  const [editingMapping, setEditingMapping] = useState<FlowMapping | null>(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);

  // 加载配置
  useEffect(() => {
    fetchConfig();
    fetchFlowMappings();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ekp-config');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setConfig({
            baseUrl: data.data.baseUrl || '',
            username: data.data.username || '',
            password: data.data.password || '',
            apiPath: data.data.apiPath || '',
            ssoEnabled: data.data.ssoEnabled ?? true,
            ssoServiceId: data.data.ssoServiceId || 'loginWebserviceService',
            ssoWebservicePath: data.data.ssoWebservicePath || '/sys/webserviceservice/',
            ssoLoginPath: data.data.ssoLoginPath || '/sys/authentication/sso/login_auto.jsp',
            ssoSessionVerifyPath: data.data.ssoSessionVerifyPath || '/sys/org/sys-inf/sysInfo.do?method=currentUser',
            proxyEnabled: data.data.proxyEnabled ?? true,
            proxyPath: data.data.proxyPath || '/api/ekp-proxy',
            leaveTemplateId: data.data.leaveTemplateId || '',
            expenseTemplateId: data.data.expenseTemplateId || '',
            tripTemplateId: data.data.tripTemplateId || '',
            purchaseTemplateId: data.data.purchaseTemplateId || '',
            enabled: data.data.enabled ?? true,
          });
        }
      }
    } catch (error) {
      console.error('获取配置失败:', error);
    }
    setLoading(false);
  };

  const fetchFlowMappings = async () => {
    try {
      const response = await fetch('/api/admin/flow-mappings');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setFlowMappings(data.data);
        }
      }
    } catch (error) {
      console.error('获取流程映射失败:', error);
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ekp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (data.success) {
        alert('配置保存成功');
      } else {
        alert('配置保存失败: ' + data.error);
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

  const handleSaveFlowMapping = async (mapping: FlowMapping) => {
    try {
      const response = await fetch('/api/admin/flow-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping),
      });
      const data = await response.json();
      if (data.success) {
        fetchFlowMappings();
        setShowMappingDialog(false);
        setEditingMapping(null);
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (error) {
      console.error('保存流程映射失败:', error);
      alert('保存失败');
    }
  };

  const handleDeleteFlowMapping = async (id: string) => {
    if (!confirm('确定要删除这个流程映射吗？')) return;
    try {
      const response = await fetch(`/api/admin/flow-mappings?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        fetchFlowMappings();
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch (error) {
      console.error('删除流程映射失败:', error);
      alert('删除失败');
    }
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

      {/* 功能Tab */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto p-1 bg-muted/50 rounded-lg">
          <TabsTrigger value="connection" className="gap-2 data-[state=active]:bg-background">
            <Link2 className="w-4 h-4" />
            连接配置
          </TabsTrigger>
          <TabsTrigger value="sso" className="gap-2 data-[state=active]:bg-background">
            <Shield className="w-4 h-4" />
            SSO配置
          </TabsTrigger>
          <TabsTrigger value="proxy" className="gap-2 data-[state=active]:bg-background">
            <Route className="w-4 h-4" />
            代理配置
          </TabsTrigger>
          <TabsTrigger value="flow-mapping" className="gap-2 data-[state=active]:bg-background">
            <FileText className="w-4 h-4" />
            流程映射
          </TabsTrigger>
          <TabsTrigger value="interfaces" className="gap-2 data-[state=active]:bg-background">
            <Database className="w-4 h-4" />
            接口管理
          </TabsTrigger>
          <TabsTrigger value="sync" className="gap-2 data-[state=active]:bg-background">
            <RefreshCw className="w-4 h-4" />
            组织同步
          </TabsTrigger>
          <TabsTrigger value="bindings" className="gap-2 data-[state=active]:bg-background">
            <Users className="w-4 h-4" />
            用户绑定
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
                  <Label htmlFor="baseUrl">EKP基础地址</Label>
                  <Input
                    id="baseUrl"
                    value={config.baseUrl}
                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    placeholder="https://oa.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiPath">待办接口路径</Label>
                  <Input
                    id="apiPath"
                    value={config.apiPath}
                    onChange={(e) => setConfig({ ...config, apiPath: e.target.value })}
                    placeholder="/api/sys-notify/sysNotifyTodoRestService/getTodo"
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
                    {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                    测试连接
                  </Button>
                  <Button onClick={handleSaveConfig} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    保存配置
                  </Button>
                </div>
              </div>

              {testResult && (
                <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span className="font-medium">{testResult.message}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SSO配置 */}
        <TabsContent value="sso" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                SSO单点登录配置
              </CardTitle>
              <CardDescription>配置与EKP系统的单点登录参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">接口说明</p>
                    <p>本系统使用蓝凌官方WebService接口实现SSO单点登录。</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>getLoginSessionId: 获取sessionId</li>
                      <li>getTokenLoginName: 解析token</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ssoEnabled">启用SSO</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="ssoEnabled"
                      checked={config.ssoEnabled}
                      onCheckedChange={(checked) => setConfig({ ...config, ssoEnabled: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {config.ssoEnabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssoServiceId">SSO服务标识</Label>
                  <Input
                    id="ssoServiceId"
                    value={config.ssoServiceId}
                    onChange={(e) => setConfig({ ...config, ssoServiceId: e.target.value })}
                    placeholder="loginWebserviceService"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ssoWebservicePath">WebService地址</Label>
                  <Input
                    id="ssoWebservicePath"
                    value={config.ssoWebservicePath}
                    onChange={(e) => setConfig({ ...config, ssoWebservicePath: e.target.value })}
                    placeholder="/sys/webserviceservice/"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssoLoginPath">SSO登录页面路径</Label>
                  <Input
                    id="ssoLoginPath"
                    value={config.ssoLoginPath}
                    onChange={(e) => setConfig({ ...config, ssoLoginPath: e.target.value })}
                    placeholder="/sys/authentication/sso/login_auto.jsp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssoSessionVerifyPath">Session验证路径</Label>
                  <Input
                    id="ssoSessionVerifyPath"
                    value={config.ssoSessionVerifyPath}
                    onChange={(e) => setConfig({ ...config, ssoSessionVerifyPath: e.target.value })}
                    placeholder="/sys/org/sys-inf/sysInfo.do?method=currentUser"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveConfig} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  保存SSO配置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 代理配置 */}
        <TabsContent value="proxy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5" />
                EKP代理配置
              </CardTitle>
              <CardDescription>配置iframe嵌入EKP表单的代理参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">为什么需要代理？</p>
                    <p>由于浏览器同源策略限制，iframe无法直接嵌入不同域名的页面。通过配置代理路径，可以实现：</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>绕过跨域限制，iframe嵌入EKP表单</li>
                      <li>后端代理请求，自动注入认证Cookie</li>
                      <li>统一域名访问，提升用户体验</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proxyEnabled">启用代理</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="proxyEnabled"
                      checked={config.proxyEnabled}
                      onCheckedChange={(checked) => setConfig({ ...config, proxyEnabled: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {config.proxyEnabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxyPath">代理路径前缀</Label>
                  <Input
                    id="proxyPath"
                    value={config.proxyPath}
                    onChange={(e) => setConfig({ ...config, proxyPath: e.target.value })}
                    placeholder="/api/ekp-proxy"
                  />
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4 mt-4">
                <h4 className="font-medium mb-2">代理示例</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  配置代理路径后，iframe将使用以下URL格式：
                </p>
                <code className="text-xs bg-background px-2 py-1 rounded">
                  {config.proxyPath || '/api/ekp-proxy'}/km/review/km_review_main/kmReviewMain.do?method=add&amp;fdTemplateId=xxx
                </code>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveConfig} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  保存代理配置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 流程映射 */}
        <TabsContent value="flow-mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                流程映射配置
              </CardTitle>
              <CardDescription>
                配置业务类型与EKP表单模板的映射关系，支持AI流程操控台自动打开对应表单
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 快捷配置 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveTemplateId">请假申请模板ID</Label>
                  <Input
                    id="leaveTemplateId"
                    value={config.leaveTemplateId}
                    onChange={(e) => setConfig({ ...config, leaveTemplateId: e.target.value })}
                    placeholder="17cba859d4a22f589b8cc4b482bb6898"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expenseTemplateId">费用报销模板ID</Label>
                  <Input
                    id="expenseTemplateId"
                    value={config.expenseTemplateId}
                    onChange={(e) => setConfig({ ...config, expenseTemplateId: e.target.value })}
                    placeholder="费用报销表单模板ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tripTemplateId">出差申请模板ID</Label>
                  <Input
                    id="tripTemplateId"
                    value={config.tripTemplateId}
                    onChange={(e) => setConfig({ ...config, tripTemplateId: e.target.value })}
                    placeholder="出差申请表单模板ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseTemplateId">采购申请模板ID</Label>
                  <Input
                    id="purchaseTemplateId"
                    value={config.purchaseTemplateId}
                    onChange={(e) => setConfig({ ...config, purchaseTemplateId: e.target.value })}
                    placeholder="采购申请表单模板ID"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveConfig} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  保存流程映射
                </Button>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-4">已配置的流程映射</h4>
                {flowMappings.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    暂无流程映射配置
                  </div>
                ) : (
                  <div className="space-y-2">
                    {flowMappings.map((mapping) => (
                      <div
                        key={mapping.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{mapping.businessType}</Badge>
                            <span className="font-medium">{mapping.businessName}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {mapping.formUrl}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={mapping.enabled ? 'default' : 'secondary'}>
                            {mapping.enabled ? '启用' : '禁用'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingMapping(mapping);
                              setShowMappingDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFlowMapping(mapping.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 接口管理 */}
        <TabsContent value="interfaces" className="space-y-4">
          <EKPInterfacesPanel />
        </TabsContent>

        {/* 组织同步 */}
        <TabsContent value="sync" className="space-y-4">
          <Tabs defaultValue="config">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="config" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                同步配置
              </TabsTrigger>
              <TabsTrigger value="mapping" className="gap-2">
                <Table className="w-4 h-4" />
                字段映射
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>同步配置</CardTitle>
                  <CardDescription>配置从EKP系统同步组织架构的方式</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setSyncing(true)} disabled={syncing}>
                      {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      全量同步
                    </Button>
                    <Button variant="outline" onClick={() => setSyncing(true)} disabled={syncing}>
                      {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                      增量同步
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mapping" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>字段映射表</CardTitle>
                  <CardDescription>展示EKP系统字段与本地数据库表字段的映射关系</CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldMappingTable />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* 用户绑定 */}
        <TabsContent value="bindings" className="space-y-4">
          <UserBindingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
