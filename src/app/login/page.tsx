'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, User, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LoginFormData {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // 检查是否已登录
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'admin') {
        router.push('/admin/overview');
      } else {
        router.push('/');
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 调用登录 API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '登录失败');
        setLoading(false);
        return;
      }

      // 登录成功，保存用户信息
      const currentUser = {
        userId: result.data.userId,
        username: result.data.username,
        personId: result.data.personId,
        personName: result.data.personName,
        email: result.data.email,
        role: result.data.role,
        status: result.data.status,
        loginTime: new Date().toISOString(),
      };

      // 保存到 localStorage
      localStorage.setItem('current-user-id', result.data.userId);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      console.log('[Login] 登录成功', currentUser);

      // 跳转到对应页面
      if (result.data.role === 'admin') {
        router.push('/admin/overview');
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('[Login] 登录错误:', err);
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">未来办公系统</CardTitle>
          <CardDescription>登录到未来办公 AI 协作平台</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                用户名
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                密码
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
                className="h-11"
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium shadow-lg"
              disabled={loading}
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
