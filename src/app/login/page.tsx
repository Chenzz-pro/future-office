'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Lock, AlertCircle, Loader2 } from 'lucide-react';

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

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({
    loginName: '',
    password: '',
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');

  // 检查系统状态
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);

        // 如果数据库未连接，跳转到初始化页面
        if (!data.data.database.connected) {
          router.push('/system-init');
        }
        // 如果系统未初始化，跳转到初始化页面
        else if (!data.data.initialized.status) {
          router.push('/system-init');
        }
      }
    } catch (err) {
      console.error('检查系统状态失败:', err);
      setError('检查系统状态失败');
    } finally {
      setLoading(false);
    }
  };

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginForm.loginName || !loginForm.password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoginLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.loginName,
          password: loginForm.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 保存用户信息到 localStorage
        localStorage.setItem('currentUser', JSON.stringify({
          id: data.data.userId,
          username: data.data.username,
          personName: data.data.personName,
          email: data.data.email,
          role: data.data.role,
        }));

        // 跳转到首页
        router.push('/');
      } else {
        setError(data.error || '登录失败');
      }
    } catch (err) {
      console.error('登录失败:', err);
      setError('登录失败，请稍后重试');
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">正在检查系统状态...</p>
        </div>
      </div>
    );
  }

  // 如果系统状态检查失败，显示提示
  if (!status?.database.connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Database className="w-6 h-6" />
              系统未配置
            </CardTitle>
            <CardDescription>
              数据库未连接，请先配置数据库连接
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/system-init')}
              className="w-full"
            >
              前往系统初始化
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果系统未初始化，跳转到初始化页面
  if (!status?.initialized.status) {
    return null; // useEffect 会处理跳转
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">登录</CardTitle>
          <CardDescription>
            登录未来办公系统
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginName">用户名</Label>
              <Input
                id="loginName"
                type="text"
                placeholder="请输入用户名"
                value={loginForm.loginName}
                onChange={(e) => setLoginForm({ ...loginForm, loginName: e.target.value })}
                required
                disabled={loginLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
                disabled={loginLoading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loginLoading}>
              {loginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  登录
                </>
              )}
            </Button>
          </form>

          {/* 默认账号提示 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 font-medium mb-2">默认账号：</p>
            <p className="text-xs text-blue-600">
              用户名：<span className="font-mono">admin</span>
            </p>
            <p className="text-xs text-blue-600">
              密码：<span className="font-mono">admin123</span>
            </p>
          </div>

          <div className="text-xs text-gray-400 text-center mt-4">
            系统版本: {status.version}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
