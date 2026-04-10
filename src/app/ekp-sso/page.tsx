'use client';

/**
 * EKP 账号绑定页面（用户级别）
 * 
 * 功能：
 * 1. 自动 SSO：使用当前用户账号自动登录 EKP
 * 2. 手动绑定：用于 EKP 账号与本系统账号不一致的情况
 * 
 * 放置位置：侧边栏底部菜单
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, XCircle, Shield, User, Zap, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CurrentUser {
  userId: string;
  loginName: string;
  name: string;
  email?: string;
  mobile?: string;
}

interface BindingInfo {
  isBound: boolean;
  ekpUsername?: string;
  bindingTime?: string;
}

export default function UserEKPSSO() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [bindingInfo, setBindingInfo] = useState<BindingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualUsername, setManualUsername] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [showManualBind, setShowManualBind] = useState(false);

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
        setBindingInfo({
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
      await checkBinding(user.userId);
      setIsChecking(false);
    };

    init();
  }, []);

  // 自动 SSO 登录（使用当前账号）
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
          email: currentUser.email,
          mobile: currentUser.mobile,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('SSO 登录成功！您现在可以使用 AI 流程操控台了。');
        await checkBinding(currentUser.userId);
      } else {
        setError(result.error || '自动 SSO 登录失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '自动 SSO 登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 手动绑定 EKP 账号
  const handleManualBind = async () => {
    if (!currentUser || !manualUsername || !manualPassword) {
      setError('请填写完整的 EKP 账号和密码');
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
          'X-User-ID': currentUser.userId,
        },
        body: JSON.stringify({
          ekpUsername: manualUsername,
          ekpPassword: manualPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('EKP 账号绑定成功！');
        setManualUsername('');
        setManualPassword('');
        setShowManualBind(false);
        await checkBinding(currentUser.userId);
      } else {
        setError(result.error || '绑定失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-muted-foreground">正在加载...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                EKP 账号绑定
              </CardTitle>
              <CardDescription>绑定您的海峡人力 OA 账号</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>未登录</AlertTitle>
                <AlertDescription>请先登录本系统，再进行 EKP 账号绑定</AlertDescription>
              </Alert>
              <Button 
                className="w-full mt-4" 
                onClick={() => {
                  sessionStorage.setItem('login-redirect', window.location.href);
                  router.push('/login');
                }}
              >
                前往登录
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">EKP 账号绑定</h1>
            <p className="text-sm text-muted-foreground">绑定海峡人力 OA 账号</p>
          </div>
        </div>

        {/* 当前用户信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              当前用户
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">用户名：</span>
                <span className="font-medium">{currentUser.loginName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">姓名：</span>
                <span className="font-medium">{currentUser.name}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 绑定状态 */}
        {bindingInfo?.isBound && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">已绑定 EKP 账号</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                绑定的账号：{bindingInfo.ekpUsername}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 成功提示 */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700">操作成功</AlertTitle>
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        {/* 自动 SSO */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              自动 SSO 登录
            </CardTitle>
            <CardDescription>
              如果您的 OA 账号与本系统账号相同，可以使用自动登录
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>系统将使用以下信息自动登录 OA：</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {currentUser.loginName && <li>用户名：{currentUser.loginName}</li>}
                {currentUser.email && <li>邮箱：{currentUser.email}</li>}
                {currentUser.mobile && <li>手机：{currentUser.mobile}</li>}
              </ul>
            </div>
            <Button 
              className="w-full" 
              onClick={handleAutoSSO}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  登录中...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  使用当前账号登录 OA
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 手动绑定 */}
        {!showManualBind ? (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowManualBind(true)}
          >
            账号不一致？手动绑定
          </Button>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">手动绑定 EKP 账号</CardTitle>
              <CardDescription>
                如果您的 OA 账号与本系统账号不同，请手动输入 OA 账号信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">OA 用户名</label>
                <Input
                  placeholder="请输入 OA 用户名"
                  value={manualUsername}
                  onChange={(e) => setManualUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">OA 密码</label>
                <Input
                  type="password"
                  placeholder="请输入 OA 密码"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowManualBind(false)}
                >
                  取消
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleManualBind}
                  disabled={isLoading || !manualUsername || !manualPassword}
                >
                  {isLoading ? '绑定中...' : '确认绑定'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
