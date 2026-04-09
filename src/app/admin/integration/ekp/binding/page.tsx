'use client';

/**
 * EKP 账号绑定页面
 * 
 * 允许用户绑定自己的 EKP 账号，实现 SSO 单点登录
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, XCircle, AlertCircle, Key, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BindingStatus {
  isBound: boolean;
  ekpUsername?: string;
  bindingTime?: string;
}

export default function EKPBindingPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bindingStatus, setBindingStatus] = useState<BindingStatus | null>(null);

  // 获取当前用户ID
  const getUserId = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('current-user-id');
    }
    return null;
  };

  // 检查绑定状态
  useEffect(() => {
    const checkBinding = async () => {
      const userId = getUserId();
      if (!userId) {
        setError('未登录，请先登录系统');
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch('/api/ekp/binding', {
          headers: {
            'X-User-ID': userId,
          },
        });
        const result = await response.json();

        if (result.success) {
          setBindingStatus({
            isBound: !!result.data,
            ekpUsername: result.data?.ekpUsername,
            bindingTime: result.data?.bindingTime,
          });
        }
      } catch (err) {
        console.error('检查绑定状态失败:', err);
      } finally {
        setIsChecking(false);
      }
    };

    checkBinding();
  }, []);

  // 绑定账号
  const handleBind = async () => {
    if (!username.trim() || !password.trim()) {
      setError('用户名和密码不能为空');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      setError('未登录，请先登录系统');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/ekp/binding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          ekpUsername: username.trim(),
          ekpPassword: password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('EKP 账号绑定成功！现在您可以在 AI 流程操控台中使用 SSO 自动登录了。');
        setPassword('');
        setBindingStatus({
          isBound: true,
          ekpUsername: username.trim(),
          bindingTime: new Date().toISOString(),
        });
      } else {
        setError(result.error || '绑定失败，请检查用户名和密码');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 解绑账号
  const handleUnbind = async () => {
    const userId = getUserId();
    if (!userId) {
      setError('未登录，请先登录系统');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/ekp/binding', {
        method: 'DELETE',
        headers: {
          'X-User-ID': userId,
        },
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('EKP 账号已解绑。');
        setBindingStatus({
          isBound: false,
        });
        setUsername('');
        setPassword('');
      } else {
        setError(result.error || '解绑失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解绑失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">正在检查绑定状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            EKP 账号绑定
          </CardTitle>
          <CardDescription>
            绑定您的海峡人力 OA 账号，实现 SSO 单点登录功能
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 绑定状态 */}
          {bindingStatus?.isBound && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">已绑定</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                当前已绑定账号：<strong>{bindingStatus.ekpUsername}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 成功提示 */}
          {success && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>成功</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* 绑定表单 */}
          {!bindingStatus?.isBound && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  OA 用户名
                </label>
                <Input
                  type="text"
                  placeholder="请输入您的 OA 用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  OA 密码
                </label>
                <Input
                  type="password"
                  placeholder="请输入您的 OA 密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-2">绑定说明：</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>您的 OA 账号密码将加密存储</li>
                  <li>绑定后可在 AI 流程操控台实现 SSO 自动登录</li>
                  <li>如需更换账号，请先解绑再重新绑定</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          {bindingStatus?.isBound ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.close()}
                disabled={isLoading}
              >
                关闭页面
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleUnbind}
                disabled={isLoading}
              >
                {isLoading ? <Spinner size="sm" /> : '解绑账号'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.close()}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button
                className="flex-1"
                onClick={handleBind}
                disabled={isLoading}
              >
                {isLoading ? <Spinner size="sm" /> : '绑定账号'}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
