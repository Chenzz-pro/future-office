'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Database, CheckCircle, AlertCircle, Lock, User, Mail, RefreshCw, Play } from 'lucide-react';

interface SystemStatus {
  database: {
    connected: boolean;
    message: string;
  };
  initialized: {
    status: boolean;
    message: string;
    adminCount: number;
  };
  version: string;
}

export default function SystemInitPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [initForm, setInitForm] = useState({
    username: 'admin',
    password: '',
    email: 'admin@example.com',
    personName: '系统管理员',
  });
  const [initLoading, setInitLoading] = useState(false);
  const [initSuccess, setInitSuccess] = useState(false);
  const [error, setError] = useState('');

  // 数据库配置状态
  const [dbConfig, setDbConfig] = useState({
    id: 'default',
    name: 'MySQL',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    databaseName: 'futureoffice',
    username: 'root',
    password: '',
  });
  const [dbStep, setDbStep] = useState<'test' | 'connect' | 'connected'>('test');
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState('');
  const [dbMessage, setDbMessage] = useState('');

  // 检查系统状态
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);

        // 如果已初始化，跳转到登录页
        if (data.data.initialized.status) {
          window.location.href = '/login';
        }
      }
    } catch (err) {
      console.error('检查系统状态失败:', err);
      setError('检查系统状态失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试数据库连接
  const handleTestDb = async () => {
    setDbError('');
    setDbMessage('');
    setDbLoading(true);

    try {
      const response = await fetch('/api/database?action=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      });

      const data = await response.json();

      if (data.success) {
        setDbMessage('数据库连接成功');
        setDbStep('connect');
      } else {
        setDbError(data.error || '数据库连接失败');
      }
    } catch (err) {
      console.error('测试数据库连接失败:', err);
      setDbError('数据库连接失败');
    } finally {
      setDbLoading(false);
    }
  };

  // 保存并连接数据库
  const handleConnectDb = async () => {
    setDbError('');
    setDbMessage('');
    setDbLoading(true);

    try {
      const response = await fetch('/api/database?action=connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dbConfig,
          isActive: true,
          isDefault: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDbMessage('数据库连接已保存');
        setDbStep('connected');
        // 刷新状态
        await checkStatus();
      } else {
        setDbError(data.error || '保存数据库连接失败');
      }
    } catch (err) {
      console.error('保存数据库连接失败:', err);
      setDbError('保存数据库连接失败');
    } finally {
      setDbLoading(false);
    }
  };

  // 初始化系统
  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!initForm.password) {
      setError('请输入管理员密码');
      return;
    }

    setInitLoading(true);

    try {
      const response = await fetch('/api/system/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initForm),
      });

      const data = await response.json();

      if (data.success) {
        setInitSuccess(true);
        // 3秒后跳转到登录页
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        setError(data.error || '初始化失败');
      }
    } catch (err) {
      console.error('初始化系统失败:', err);
      setError('初始化系统失败');
    } finally {
      setInitLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在检查系统状态...</p>
        </div>
      </div>
    );
  }

  if (initSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">初始化成功！</CardTitle>
            <CardDescription>
              系统已成功初始化，管理员账号创建完成。
              <br />
              3 秒后将自动跳转到登录页面...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Database className="w-6 h-6" />
            系统初始化
          </CardTitle>
          <CardDescription>
            首次部署需要初始化系统并创建管理员账号
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 系统状态 */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-700">系统状态</h3>

            {/* 数据库状态 */}
            <Alert variant={status?.database.connected ? 'default' : 'destructive'}>
              {status?.database.connected ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>数据库状态</AlertTitle>
              <AlertDescription>{status?.database.message}</AlertDescription>
            </Alert>

            {/* 初始化状态 */}
            <Alert variant={status?.initialized.status ? 'default' : 'destructive'}>
              {status?.initialized.status ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>初始化状态</AlertTitle>
              <AlertDescription>
                {status?.initialized.message}
                {status?.initialized.adminCount && status.initialized.adminCount > 0 && ` (管理员数量: ${status.initialized.adminCount})`}
              </AlertDescription>
            </Alert>
          </div>

          {/* 如果数据库未连接，显示数据库配置表单 */}
          {!status?.database.connected && (
            <div className="space-y-4">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertTitle>需要配置数据库</AlertTitle>
                <AlertDescription>
                  请填写数据库连接信息并测试连接，然后初始化系统。
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label>数据库配置</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="主机地址 (例如: localhost)"
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    disabled={dbStep !== 'test'}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="端口 (例如: 3306)"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({ ...dbConfig, port: parseInt(e.target.value) || 3306 })}
                      disabled={dbStep !== 'test'}
                    />
                    <Input
                      placeholder="数据库名"
                      value={dbConfig.databaseName}
                      onChange={(e) => setDbConfig({ ...dbConfig, databaseName: e.target.value })}
                      disabled={dbStep !== 'test'}
                    />
                  </div>
                  <Input
                    placeholder="用户名"
                    value={dbConfig.username}
                    onChange={(e) => setDbConfig({ ...dbConfig, username: e.target.value })}
                    disabled={dbStep !== 'test'}
                  />
                  <Input
                    type="password"
                    placeholder="密码"
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                    disabled={dbStep !== 'test'}
                  />
                </div>

                {dbError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{dbError}</AlertDescription>
                  </Alert>
                )}

                {dbMessage && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{dbMessage}</AlertDescription>
                  </Alert>
                )}

                {dbStep === 'test' && (
                  <Button
                    onClick={handleTestDb}
                    disabled={dbLoading}
                    className="w-full"
                  >
                    {dbLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        测试连接中...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        测试连接
                      </>
                    )}
                  </Button>
                )}

                {dbStep === 'connect' && (
                  <Button
                    onClick={handleConnectDb}
                    disabled={dbLoading}
                    className="w-full"
                  >
                    {dbLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        保存连接中...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        保存并连接
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 如果数据库已连接但未初始化，显示初始化表单 */}
          {status?.database.connected && !status?.initialized.status && (
            <form onSubmit={handleInit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin"
                    value={initForm.username}
                    onChange={(e) => setInitForm({ ...initForm, username: e.target.value })}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={initForm.password}
                    onChange={(e) => setInitForm({ ...initForm, password: e.target.value })}
                    className="pl-9"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-gray-500">密码长度至少 6 位</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={initForm.email}
                    onChange={(e) => setInitForm({ ...initForm, email: e.target.value })}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personName">姓名</Label>
                <Input
                  id="personName"
                  type="text"
                  placeholder="系统管理员"
                  value={initForm.personName}
                  onChange={(e) => setInitForm({ ...initForm, personName: e.target.value })}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={initLoading}>
                {initLoading ? '正在创建...' : '创建管理员账号'}
              </Button>
            </form>
          )}

          {/* 版本信息 */}
          <div className="text-xs text-gray-400 text-center">
            系统版本: {status?.version}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
