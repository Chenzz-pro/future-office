'use client';

import { useState, useEffect } from 'react';
import {
  X,
  User,
  LogOut,
  Camera,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiKey {
  id: string;
  userId: string;
  name: string;
  provider: 'openai' | 'claude' | 'deepseek' | 'doubao' | 'custom';
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
}

interface User {
  fd_id: string;
  fd_name: string;
  username: string;
  email: string;
  role: string;
  fd_email?: string;
  fd_avatar?: string;
  avatar?: string;
}

interface UserSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onKeysChange?: (keys: ApiKey[]) => void;
}

export function UserSettingsDialog({ open, onClose, onKeysChange }: UserSettingsDialogProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setAvatarPreview(user.avatar || '');
      }
    }
  }, [open]);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        // 更新用户信息
        const updatedUser: User = {
          fd_id: currentUser?.fd_id || '',
          fd_name: currentUser?.fd_name || '',
          username: currentUser?.username || '',
          email: currentUser?.email || '',
          role: currentUser?.role || '',
          avatar: reader.result as string,
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        setShowAvatarUpload(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">个人设置</h2>
            <p className="text-sm text-muted-foreground">管理您的个人资料</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 头像设置 */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-muted overflow-hidden border-2 border-border">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="头像"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                )}
              </div>
              <button
                onClick={() => document.getElementById('avatar-upload')?.click()}
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {currentUser?.username || '未命名用户'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentUser?.email || 'user@example.com'}
              </p>
            </div>
          </div>

          {/* 用户信息 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">用户名</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.username || '-'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">角色</p>
                  <p className="text-xs text-muted-foreground">
                    {currentUser?.role === 'admin' ? '管理员' : '普通用户'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 退出登录 */}
          <div className="pt-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">退出登录</span>
            </button>
          </div>
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
