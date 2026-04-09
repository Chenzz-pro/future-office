'use client';

/**
 * EKP 单点登录配置页面
 * 
 * 适用场景：
 * - 本系统用户从 EKP 同步（同一批用户）
 * - 自动使用当前用户账号登录 EKP，无需手动绑定
 * 
 * 功能：
 * 1. 自动 SSO：使用当前用户账号自动登录 EKP
 * 2. 手动绑定：可选，用于 EKP 账号与本系统账号不一致的情况
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, XCircle, Shield, User, Zap, Link, RefreshCw } from 'lucide-react';

interface CurrentUser {
  userId: string;
  loginName: string;
  name: string;
  email?: string;
  mobile?: string;
}

interface BindingStatus {
  isBound: boolean;
  ekpUsername?: string;
  bindingTime?: string;
}

interface SSOStatus {
  isConnected: boolean;
  message: string;
}

export default function EKPBingdingPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [bindingStatus, setBindingStatus] = useState<BindingStatus | null>(null);
  const [ssoStatus, setSSOStatus] = useState<SSOStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 获取当前用户信息
  const getCurrentUser = async (): Promise<CurrentUser | null> => {
    try {
      const userId = localStorage.getItem('current-user-id');
      if (!userId) return null;

      const response = await fetch('/api/auth/current', {
        headers: {
          'X-User-ID': userId,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        return {
          userId,
          loginName: result.data?.loginName || result.data?.fd_login_name || result.data?.username || '',
          name: result.data?.name || result.data?.fd_name || '',
          email: result.data?.email || result.data?.fd_email,
          mobile: result.data?.mobile || result.data?.fd_mobile,
        };
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }
    return null;
  };

  // 检查 SSO 连接状态
  const checkSSOConnection = async (userId: string) => {
    try {
      // 尝试使用当前用户账号登录 EKP
      const response = await fetch('/api/ekp/sso/auto-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSSOStatus({
          isConnected: true,
          message: '自动 SSO 连接成功！您可以直接使用 iframe 模式。',
        });
      } else {
        setSSOStatus({
          isConnected: false,
          message: result.error || '自动 SSO 连接失败，请尝试手动绑定',
        });
      }
    } catch (err) {
      setSSOStatus({
        isConnected: false,
        message: 'SSO 连接测试失败',
      });
    }
  };

  // 检查绑定状态
  const checkBinding = async (userId: string) => {
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
    }
  };

  // 初始化
  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();
      
      if (!user) {
        setError('未登录，请先登录系统');
        setIsChecking(false);
        return;
      }

      setCurrentUser(user);
      
      // 检查绑定状态和 SSO 状态
      await Promise.all([
        checkBinding(user.userId),
        checkSSOConnection(user.userId),
      ]);
      
      setIsChecking(false);
    };

    init();
  }, []);

  // 自动 SSO 登录
  const handleAutoSSO = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/ekp/sso/auto-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.userId,
        },
        body: JSON.stringify({
          loginName: currentUser.loginName,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('自动 SSO 登录成功！现在您可以在 AI 流程操控台中使用 iframe 模式了。');
        setSSOStatus({
          isConnected: true,
          message: 'SSO 登录成功',
        });
      } else {
        setError(result.error || '自动 SSO 登录失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '自动 SSO 登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新 SSO 状态
  const handleRefresh = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    await checkSSOConnection(currentUser.userId);
    setIsLoading(false);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-muted-foreground">正在检查 SSO 状态...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              EKP 单点登录
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>未登录</AlertTitle>
              <AlertDescription>请先登录本系统，再进行 EKP 绑定</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => window.location.href = '/login'}
            >
              前往登录
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">EKP 单点登录</h1>
            <p className="text-sm text-muted-foreground">配置与海峡人力 OA 系统的单点登录</p>
          </div>
        </div>

        {/* 当前用户信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              当前用户
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">用户名：</span>
                <span className="font-medium">{currentUser.loginName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">姓名：</span>
                <span className="font-medium">{currentUser.name}</span>
              </div>
              {currentUser.email && (
                <div>
                  <span className="text-muted-foreground">邮箱：</span>
                  <span className="font-medium">{currentUser.email}</span>
                </div>
              )}
              {currentUser.mobile && (
                <div>
                  <span className="text-muted-foreground">手机：</span>
                  <span className="font-medium">{currentUser.mobile}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SSO 状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              自动 SSO 状态
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              基于您在本系统的账号，自动登录 EKP 系统
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SSO 连接状态 */}
            {ssoStatus && (
              <Alert className={ssoStatus.isConnected 
                ? 'border-green-200 bg-green-50 dark:bg-green-950/30' 
                : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30'
              }>
                {ssoStatus.isConnected ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-yellow-600" />
                )}
                <AlertTitle>{ssoStatus.isConnected ? '已连接' : '未连接'}</AlertTitle>
                <AlertDescription>{ssoStatus.message}</AlertDescription>
              </Alert>
            )}

            {/* 自动 SSO 说明 */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">自动 SSO 工作原理：</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>系统使用您当前的登录账号（{currentUser.loginName}）</li>
                <li>自动向 EKP 系统发起登录请求</li>
                <li>获取 EKP Session 并建立 Cookie 桥接</li>
                <li>之后访问 AI 流程操控台时自动保持登录状态</li>
              </ol>
              {currentUser.email && (
                <p className="mt-2 text-muted-foreground">
                  备用账号：{currentUser.email}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleAutoSSO}
              disabled={isLoading}
            >
              {isLoading ? <Spinner className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              {ssoStatus?.isConnected ? '重新连接' : '启用自动 SSO'}
            </Button>
          </CardFooter>
        </Card>

        {/* 手动绑定（备用方案） */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link className="w-5 h-5" />
              手动绑定（备用）
            </CardTitle>
            <CardDescription>
              如果您的 EKP 账号与本系统账号不一致，可以使用此方式
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bindingStatus?.isBound ? (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>已绑定</AlertTitle>
                <AlertDescription>
                  当前已绑定 EKP 账号：{bindingStatus.ekpUsername}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  💡 提示：如果自动 SSO 无法使用，您可以联系管理员配置 EKP 账号映射。
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 提示信息 */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>错误</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>成功</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
