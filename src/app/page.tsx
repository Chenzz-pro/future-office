'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { MainContent } from '@/components/main-content';
import { HistoryPanel } from '@/components/history-panel';
import { useChatHistory, ChatSession } from '@/hooks/use-chat-history';

export default function Home() {
  const [activeTab, setActiveTab] = useState('new-chat');
  const [showHistory, setShowHistory] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const { loadSession, setCurrentSession } = useChatHistory();

  // 检查用户登录状态
  useEffect(() => {
    const checkAuthStatus = () => {
      // 检查是否已登录（localStorage 中有 current-user-id）
      const userId = localStorage.getItem('current-user-id');
      const currentUser = localStorage.getItem('currentUser');

      console.log('[Home] 检查登录状态:', {
        hasUserId: !!userId,
        hasCurrentUser: !!currentUser,
        userId,
      });

      if (!userId || !currentUser) {
        router.push('/login');
        return;
      }

      const user = JSON.parse(currentUser);

      // 判断是否为管理员角色
      const isAdmin = user.role?.isAdmin === true;

      // 如果是管理员，跳转到管理员页面
      if (isAdmin) {
        router.push('/admin/overview');
        return;
      }

      // 普通用户设置认证状态
      console.log('[Home] 普通用户，设置认证状态为 true');
      setAuthenticated(true);
    };

    checkAuthStatus();
  }, [router]);

  // 监听 localStorage 变化，当用户登录后重新加载
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'current-user-id' && e.newValue) {
        console.log('[Home] 检测到用户登录，重新检查认证状态');
        checkAuthStatus();
      }
    };

    const checkAuthStatus = () => {
      const userId = localStorage.getItem('current-user-id');
      const currentUser = localStorage.getItem('currentUser');

      if (userId && currentUser) {
        const user = JSON.parse(currentUser);
        if (!user.role?.isAdmin) {
          setAuthenticated(true);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 处理选择历史会话
  const handleSelectSession = (session: ChatSession) => {
    setActiveTab('new-chat');
    loadSession(session.id);
    setSelectedSessionId(session.id);
    setShowHistory(false);
  };

  // 开始新对话
  const handleNewChat = () => {
    setCurrentSession(null);
    setSelectedSessionId(null);
    setActiveTab('new-chat');
  };

  if (!mounted || !authenticated) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-64 bg-sidebar animate-pulse" />
        <div className="flex-1 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* 左侧导航 */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        onSelectSession={handleSelectSession}
      />

      {/* 历史对话面板 */}
      {showHistory && (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
          onSelectSession={handleSelectSession}
        />
      )}

      {/* 主内容区 */}
      <MainContent
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewChat={handleNewChat}
        selectedSessionId={selectedSessionId}
      />
    </div>
  );
}
