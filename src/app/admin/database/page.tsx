'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Link2, RefreshCw, Database, Check, X, ArrowRight } from 'lucide-react';

interface DatabaseConfig {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql';
  host: string;
  port: number;
  databaseName: string;
  username: string;
  isActive: boolean;
  isDefault: boolean;
}

interface DatabaseStatus {
  configs: DatabaseConfig[];
  isConnected: boolean;
  currentConfig: DatabaseConfig | null;
}

interface MigrationPreview {
  users: number;
  apiKeys: number;
  chatSessions: number;
  customSkills: number;
  ekpConfigs: number;
}

interface MigrationResult {
  success: boolean;
  message: string;
  error?: string;
  details?: {
    users: { migrated: number; skipped: number };
    apiKeys: { migrated: number; skipped: number };
    chatSessions: { migrated: number; skipped: number };
    customSkills: { migrated: number; skipped: number };
    ekpConfigs: { migrated: number; skipped: number };
  };
}

export default function DatabaseConfigPage() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [testing, setTesting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  const [initForm, setInitForm] = useState({
    host: 'localhost',
    port: 3306,
    databaseName: 'future_office',
    username: 'root',
    password: '',
  });

  const [addForm, setAddForm] = useState({
    name: '',
    host: '',
    port: 3306,
    databaseName: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    handleLoadStatus();
    handleLoadPreview();
  }, []);

  const handleLoadStatus = async () => {
    try {
      const res = await fetch('/api/database');
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch {
      console.error('加载状态失败');
    }
  };

  const handleLoadPreview = async () => {
    try {
      const res = await fetch('/api/database/migrate');
      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
      }
    } catch {
      console.error('加载预览失败');
    }
  };

  const handleTestConnection = async (config?: DatabaseConfig) => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/database?action=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config || addForm),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: '连接测试失败' });
    } finally {
      setTesting(false);
    }
  };

  const handleInitDatabase = async () => {
    try {
      const res = await fetch('/api/database?action=init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initForm),
      });
      const data = await res.json();

      if (data.success) {
        alert('数据库初始化成功！');
        setShowInitDialog(false);
        handleLoadStatus();
      } else {
        alert('初始化失败: ' + data.error);
      }
    } catch (error) {
      alert('初始化失败: ' + error);
    }
  };

  const handleAddConfig = async () => {
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          config: addForm,
        }),
      });
      const data = await res.json();

      if (data.success) {
        alert('配置添加成功！');
        setShowAddDialog(false);
        handleLoadStatus();
      } else {
        alert('添加失败: ' + data.error);
      }
    } catch (error) {
      alert('添加失败: ' + error);
    }
  };

  const handleConnect = async (configId: string) => {
    try {
      const res = await fetch('/api/database?action=connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId }),
      });
      const data = await res.json();

      if (data.success) {
        alert('数据库连接成功！');
        handleLoadStatus();
      } else {
        alert('连接失败: ' + data.error);
      }
    } catch (error) {
      alert('连接失败: ' + error);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/database?action=disconnect', {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        alert('数据库已断开！');
        handleLoadStatus();
      } else {
        alert('断开失败: ' + data.error);
      }
    } catch (error) {
      alert('断开失败: ' + error);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrationResult(null);

    try {
      const res = await fetch('/api/database/migrate', {
        method: 'POST',
      });
      const data = await res.json();
      setMigrationResult(data);

      if (data.success) {
        setTimeout(() => {
          setShowMigrateDialog(false);
          handleLoadPreview();
        }, 2000);
      }
    } catch {
      setMigrationResult({ success: false, message: '迁移失败', details: undefined });
    } finally {
      setMigrating(false);
    }
  };

  const totalMigrateCount = preview
    ? preview.users + preview.apiKeys + preview.chatSessions + preview.customSkills + preview.ekpConfigs
    : 0;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">数据库配置中心</h1>
        <p className="text-muted-foreground mt-2">
          管理数据库连接、初始化数据库和迁移本地数据
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="configs">数据库配置</TabsTrigger>
          <TabsTrigger value="migration">数据迁移</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">连接状态</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {status?.isConnected ? (
                    <Badge className="bg-green-500">已连接</Badge>
                  ) : (
                    <Badge variant="destructive">未连接</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {status?.currentConfig ? status.currentConfig.name : '无配置'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">数据库配置数</CardTitle>
                <Link2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{status?.configs.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">个配置</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">待迁移数据</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMigrateCount}</div>
                <p className="text-xs text-muted-foreground mt-1">条记录</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">快速操作</CardTitle>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowInitDialog(true)}
                >
                  初始化数据库
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowMigrateDialog(true)}
                  disabled={!status?.isConnected}
                >
                  数据迁移
                </Button>
              </CardContent>
            </Card>
          </div>

          {status?.currentConfig && (
            <Card>
              <CardHeader>
                <CardTitle>当前连接信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">名称:</span>
                    <span>{status.currentConfig.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">类型:</span>
                    <span>{status.currentConfig.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">主机:</span>
                    <span>{status.currentConfig.host}:{status.currentConfig.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">数据库:</span>
                    <span>{status.currentConfig.databaseName}</span>
                  </div>
                </div>
                {!status?.isConnected && status.currentConfig && (
                  <Button className="mt-4" onClick={() => handleConnect(status.currentConfig!.id)}>
                    连接数据库
                  </Button>
                )}
                {status?.isConnected && (
                  <Button variant="destructive" className="mt-4" onClick={handleDisconnect}>
                    断开连接
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="configs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">数据库配置列表</h3>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              添加配置
            </Button>
          </div>

          {status && status.configs.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>主机</TableHead>
                    <TableHead>数据库</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status.configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell>{config.type}</TableCell>
                      <TableCell>{config.host}:{config.port}</TableCell>
                      <TableCell>{config.databaseName}</TableCell>
                      <TableCell>
                        {config.isActive && (
                          <Badge className="bg-green-500">激活</Badge>
                        )}
                        {config.isDefault && (
                          <Badge variant="outline" className="ml-2">默认</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!config.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConnect(config.id)}
                          >
                            连接
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Alert>
              <AlertDescription>暂无数据库配置，请先添加配置或初始化数据库。</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="migration" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">数据迁移</h3>
            <Button onClick={() => setShowMigrateDialog(true)} disabled={!status?.isConnected}>
              <RefreshCw className="h-4 w-4 mr-2" />
              开始迁移
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>迁移预览</CardTitle>
              <CardDescription>将从 localStorage 迁移以下数据到 MySQL</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">用户数据</span>
                  <Badge>{preview?.users || 0} 条</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">API Keys</span>
                  <Badge>{preview?.apiKeys || 0} 条</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">对话会话</span>
                  <Badge>{preview?.chatSessions || 0} 条</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">自定义技能</span>
                  <Badge>{preview?.customSkills || 0} 条</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">EKP 配置</span>
                  <Badge>{preview?.ekpConfigs || 0} 条</Badge>
                </div>
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center font-semibold">
                    <span>总计</span>
                    <Badge variant="outline">{totalMigrateCount} 条</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 初始化数据库对话框 */}
      <Dialog open={showInitDialog} onOpenChange={setShowInitDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>初始化数据库</DialogTitle>
            <DialogDescription>
              首次使用需要初始化数据库，这将创建所有必要的表结构。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="host">主机地址</Label>
              <Input
                id="host"
                value={initForm.host}
                onChange={(e) => setInitForm({ ...initForm, host: e.target.value })}
                placeholder="localhost"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="port">端口</Label>
              <Input
                id="port"
                type="number"
                value={initForm.port}
                onChange={(e) => setInitForm({ ...initForm, port: parseInt(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="databaseName">数据库名</Label>
              <Input
                id="databaseName"
                value={initForm.databaseName}
                onChange={(e) => setInitForm({ ...initForm, databaseName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={initForm.username}
                onChange={(e) => setInitForm({ ...initForm, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={initForm.password}
                onChange={(e) => setInitForm({ ...initForm, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitDialog(false)}>
              取消
            </Button>
            <Button onClick={handleInitDatabase}>初始化</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加配置对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>添加数据库配置</DialogTitle>
            <DialogDescription>
              添加新的数据库配置，支持多数据库管理。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">配置名称</Label>
              <Input
                id="name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="生产数据库"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-host">主机地址</Label>
              <Input
                id="add-host"
                value={addForm.host}
                onChange={(e) => setAddForm({ ...addForm, host: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-port">端口</Label>
              <Input
                id="add-port"
                type="number"
                value={addForm.port}
                onChange={(e) => setAddForm({ ...addForm, port: parseInt(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-databaseName">数据库名</Label>
              <Input
                id="add-databaseName"
                value={addForm.databaseName}
                onChange={(e) => setAddForm({ ...addForm, databaseName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-username">用户名</Label>
              <Input
                id="add-username"
                value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-password">密码</Label>
              <Input
                id="add-password"
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => handleTestConnection()}
              disabled={testing}
            >
              {testing ? '测试中...' : '测试连接'}
            </Button>
            {testResult && (
              <Alert className={testResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-red-600 shrink-0" />
                  )}
                  <AlertDescription className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                    {testResult.message}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddConfig}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 数据迁移对话框 */}
      <Dialog open={showMigrateDialog} onOpenChange={setShowMigrateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>数据迁移</DialogTitle>
            <DialogDescription>
              将 localStorage 中的数据迁移到 MySQL 数据库。
            </DialogDescription>
          </DialogHeader>
          {!migrationResult ? (
            <div className="space-y-4 py-4">
              <Alert>
                <AlertDescription>
                  迁移过程中会保留 localStorage 数据，迁移完成后请手动清理。
                </AlertDescription>
              </Alert>
              {preview && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">将迁移以下数据:</div>
                  {preview.users > 0 && (
                    <div className="text-sm">• 用户数据: {preview.users} 条</div>
                  )}
                  {preview.apiKeys > 0 && (
                    <div className="text-sm">• API Keys: {preview.apiKeys} 条</div>
                  )}
                  {preview.chatSessions > 0 && (
                    <div className="text-sm">• 对话会话: {preview.chatSessions} 条</div>
                  )}
                  {preview.customSkills > 0 && (
                    <div className="text-sm">• 自定义技能: {preview.customSkills} 条</div>
                  )}
                  {preview.ekpConfigs > 0 && (
                    <div className="text-sm">• EKP 配置: {preview.ekpConfigs} 条</div>
                  )}
                  {totalMigrateCount === 0 && (
                    <div className="text-sm text-muted-foreground">无数据需要迁移</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {migrationResult.success ? (
                <Alert className="border-green-500 bg-green-50">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <AlertDescription className="text-green-700">{migrationResult.message}</AlertDescription>
                  </div>
                </Alert>
              ) : (
                <Alert className="border-red-500 bg-red-50">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-600 shrink-0" />
                    <AlertDescription className="text-red-700">{migrationResult.error}</AlertDescription>
                  </div>
                </Alert>
              )}
              {migrationResult.details && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">迁移详情:</div>
                  <div className="text-sm">• 用户: {migrationResult.details.users.migrated} 成功 / {migrationResult.details.users.skipped} 跳过</div>
                  <div className="text-sm">• API Keys: {migrationResult.details.apiKeys.migrated} 成功 / {migrationResult.details.apiKeys.skipped} 跳过</div>
                  <div className="text-sm">• 对话会话: {migrationResult.details.chatSessions.migrated} 成功 / {migrationResult.details.chatSessions.skipped} 跳过</div>
                  <div className="text-sm">• 自定义技能: {migrationResult.details.customSkills.migrated} 成功 / {migrationResult.details.customSkills.skipped} 跳过</div>
                  <div className="text-sm">• EKP 配置: {migrationResult.details.ekpConfigs.migrated} 成功 / {migrationResult.details.ekpConfigs.skipped} 跳过</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMigrateDialog(false)}>
              {migrationResult?.success ? '完成' : '取消'}
            </Button>
            {!migrationResult && (
              <Button onClick={handleMigrate} disabled={migrating || totalMigrateCount === 0}>
                {migrating ? '迁移中...' : '开始迁移'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
