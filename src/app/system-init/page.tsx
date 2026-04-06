'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Database, CheckCircle, AlertCircle, Lock, User, Mail, RefreshCw, Play, LogIn, ArrowRight } from 'lucide-react';

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

  // 登录引导状态
  const [showLoginGuide, setShowLoginGuide] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // 检查系统状态
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);

        // 如果数据库已连接
        if (data.data.database.connected) {
          setDbMessage('数据库连接成功');
          setDbError('');
          setDbStep('connected');

          // 如果已初始化且数据库已连接，显示登录引导
          if (data.data.initialized.status) {
            setShowLoginGuide(true);
          } else {
            setShowLoginGuide(false);
          }
        } else {
          // 数据库未连接
          // 清除成功消息，显示连接未就绪状态
          if (dbMessage) {
            setDbMessage('');
          }
          if (dbStep === 'connected') {
            // 之前显示连接成功，但现在连接失败，显示错误
            setDbError('数据库连接失败，请检查配置信息');
            setDbStep('connect');
          } else if (dbMessage === '数据库连接成功，正在验证...') {
            // 正在验证时发现连接失败，显示错误
            setDbError('数据库连接失败，请检查配置信息');
            setDbMessage('');
            setDbStep('connect');
          }
          setShowLoginGuide(false);
        }
      }
    } catch (err) {
      console.error('检查系统状态失败:', err);
      setError('检查系统状态失败');
    } finally {
      setLoading(false);
    }
  };

  // 自动跳转到登录页
  useEffect(() => {
    if (showLoginGuide && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showLoginGuide && countdown === 0) {
      window.location.href = '/login';
    }
  }, [showLoginGuide, countdown]);

  // 立即跳转到登录页
  const handleGoToLogin = () => {
    window.location.href = '/login';
  };

  // 测试数据库连接
  const handleTestDb = async () => {
    console.log('[handleTestDb] 开始测试连接...');
    console.log('[handleTestDb] dbConfig:', {
      ...dbConfig,
      password: dbConfig.password ? '******' : '空',
    });
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
      console.log('[handleTestDb] 响应:', data);

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
    console.log('[handleConnectDb] 开始连接数据库...');
    console.log('[handleConnectDb] dbConfig:', {
      ...dbConfig,
      password: dbConfig.password ? '******' : '空',
    });

    // 验证密码是否为空
    if (!dbConfig.password) {
      setDbError('密码不能为空，请重新输入密码');
      setDbStep('test'); // 返回到测试步骤，允许用户重新输入
      return;
    }

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

      console.log('[handleConnectDb] 响应状态:', response.status, response.ok);

      // 检查 HTTP 状态码
      if (!response.ok) {
        let errorMessage = '数据库连接失败，请检查配置信息';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.log('[handleConnectDb] 错误信息:', errorMessage);
        } catch (e) {
          // JSON 解析失败，使用默认错误信息
          console.log('[handleConnectDb] JSON 解析失败');
        }
        setDbError(errorMessage);
        setDbStep('connect'); // 保持在 connect 状态，允许重新尝试
        return;
      }

      const data = await response.json();

      if (data.success) {
        // 先显示正在验证的消息
        setDbMessage('数据库连接成功，正在验证...');
        // 刷新状态以验证连接是否真正成功
        await checkStatus();
      } else {
        // 连接失败，显示错误信息
        setDbError(data.error || '数据库连接失败，请检查配置信息');
        setDbStep('connect'); // 保持在 connect 状态，允许重新尝试
      }
    } catch (err) {
      console.error('保存数据库连接失败:', err);
      const errorMessage = err instanceof Error ? err.message : '保存数据库连接失败';
      setDbError(errorMessage);
      setDbStep('connect'); // 保持在 connect 状态，允许重新尝试
    } finally {
      setDbLoading(false);
    }
  };

  // 重新测试连接
  const handleRetryConnection = () => {
    setDbStep('connect');
    setDbError('');
    setDbMessage('');
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
                <AlertDescription className="space-y-2">
                  <p>请填写数据库连接信息并测试连接，然后初始化系统。</p>
                  <p className="text-xs text-gray-500">
                    💡 <strong>关于系统初始化：</strong>
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside ml-2">
                    <li>如果数据库是全新的，需要您手动创建管理员账号</li>
                    <li>如果数据库已有管理员账号，系统会自动跳转到登录页</li>
                  </ul>
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
                    autoComplete="new-password"
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
                  <div className="space-y-2">
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

                    {dbError && (
                      <Button
                        onClick={handleRetryConnection}
                        variant="outline"
                        className="w-full"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        重新测试连接
                      </Button>
                    )}
                  </div>
                )}

                {/* 数据库连接失败时的帮助信息 */}
                {dbError && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium text-sm text-amber-800">数据库连接失败</p>
                        <p className="text-xs text-amber-700">请检查以下几点：</p>
                        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside ml-3">
                          <li>数据库地址和端口是否正确</li>
                          <li>数据库名称是否存在</li>
                          <li>用户名和密码是否正确</li>
                          <li>数据库服务是否正在运行</li>
                          <li>网络连接是否正常</li>
                          <li><strong>请勿依赖浏览器自动填充，建议重新输入密码</strong></li>
                        </ul>
                      </div>
                    </div>
                  </div>
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

          {/* 如果数据库已连接且已初始化，显示登录引导 */}
          {showLoginGuide && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">系统初始化完成！</AlertTitle>
                <AlertDescription className="text-green-700">
                  数据库连接成功，系统已就绪，可以登录使用了。
                </AlertDescription>
              </Alert>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <LogIn className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">前往登录页面</h3>
                    <p className="text-sm text-gray-600">系统已准备好，请使用管理员账号登录</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">用户名</span>
                    <span className="font-mono font-medium text-gray-900">admin</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">密码</span>
                    <span className="font-mono font-medium text-gray-900">admin123</span>
                  </div>
                  <p className="text-xs text-orange-600 mt-2 pt-2 border-t">
                    🔒 首次登录后，建议立即修改密码
                  </p>
                </div>

                <Button
                  onClick={handleGoToLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  立即跳转
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                {countdown > 0 && (
                  <p className="text-xs text-center text-gray-500">
                    {countdown} 秒后自动跳转...
                  </p>
                )}
              </div>
            </div>
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
