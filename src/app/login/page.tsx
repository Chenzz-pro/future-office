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
  const [userType, setUserType] = useState<'user' | 'admin'>('user');
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
      // 模拟登录验证（实际应该调用后端 API）
      const users = localStorage.getItem('users');
      let validUsers = [];

      if (users) {
        validUsers = JSON.parse(users);
      } else {
        // 初始化默认用户
        validUsers = [
          { id: '1', username: 'admin', password: 'admin123', role: 'admin', email: 'admin@example.com', createdAt: new Date().toISOString() },
          { id: '2', username: 'user', password: 'user123', role: 'user', email: 'user@example.com', createdAt: new Date().toISOString() },
        ];
        localStorage.setItem('users', JSON.stringify(validUsers));
      }

      const user = validUsers.find((u: { username: string; password: string; role: string; id: string; email: string }) => u.username === formData.username && u.password === formData.password);

      if (!user) {
        setError('用户名或密码错误');
        setLoading(false);
        return;
      }

      // 登录成功，保存用户信息
      const currentUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        loginTime: new Date().toISOString(),
      };

      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      // 跳转到对应页面
      if (user.role === 'admin') {
        router.push('/admin/overview');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const isAdmin = userType === 'admin';
  const title = isAdmin ? '管理员登录' : '未来办公系统';
  const description = isAdmin ? '登录到系统管理后台' : '登录到未来办公 AI 协作平台';
  const testAccounts = '普通用户：user / user123\n管理员：admin / admin123';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex justify-center mb-2">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              isAdmin
                ? 'bg-gradient-to-br from-blue-600 to-indigo-700'
                : 'bg-gradient-to-br from-blue-500 to-purple-600'
            }`}>
              {isAdmin ? (
                <Shield className="w-8 h-8 text-white" />
              ) : (
                <Shield className="w-8 h-8 text-white" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold">
            {title}
          </CardTitle>
          <CardDescription className="text-center text-base">
            {description}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">用户名</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder={isAdmin ? "请输入管理员用户名" : "请输入用户名"}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="font-medium mb-1">测试账号：</p>
              <p className="whitespace-pre-line">{testAccounts}</p>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
