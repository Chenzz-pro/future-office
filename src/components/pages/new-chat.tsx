'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Paperclip,
  Brain,
  Mic,
  Send,
  Image as ImageIcon,
  Code,
  Video,
  Search,
  HelpCircle,
  PenTool,
  User,
  Bot,
  Loader2,
  AlertCircle,
  Settings,
  Trash2,
  Bell,
  Calendar,
  Database,
  Globe,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatHistory, Message, ChatSession } from '@/hooks/use-chat-history';
import { useLLMConfig } from '@/hooks/use-llm-config';
import { CustomSkill } from '@/types/custom-skill';

interface ApiKey {
  id: string;
  name: string;
  provider: 'openai' | 'claude' | 'deepseek' | 'doubao' | 'custom';
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
}

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe,
  Database,
  ImageIcon,
  Code,
  Video,
  Search,
  HelpCircle,
  PenTool,
  Zap,
  Bell,
  Calendar,
};

// localStorage key
const CUSTOM_SKILLS_STORAGE_KEY = 'custom_skills';

// 内置快捷技能
const builtInQuickSkills = [
  { icon: ImageIcon, label: '图像生成', color: 'text-purple-500', skillId: null },
  { icon: Code, label: 'AI 编程', color: 'text-blue-500', skillId: null },
  { icon: Video, label: '视频生成', color: 'text-pink-500', skillId: null },
  { icon: Search, label: 'AI 搜索', color: 'text-green-500', skillId: null },
  { icon: HelpCircle, label: '解题答疑', color: 'text-orange-500', skillId: null },
  { icon: PenTool, label: '帮我写作', color: 'text-cyan-500', skillId: null },
];

interface NewChatPageProps {
  onNewChat?: () => void;
}

export function NewChatPage({ onNewChat }: NewChatPageProps) {
  const [inputValue, setInputValue] = useState('');
  const [greeting, setGreeting] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>([]);
  const [executingSkill, setExecutingSkill] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState(false);
  const [dbCheckLoading, setDbCheckLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sessions, currentSession, setCurrentSession, createSession, addMessage, updateSession } = useChatHistory();

  // 获取当前用户ID
  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{}') : null;
  const userId = currentUser?.id;

  // 使用配置钩子（仅全局配置）
  const { config: activeKey, source: configSource, loading: configLoading } = useLLMConfig();

  // 检查数据库连接状态
  useEffect(() => {
    checkDatabaseConnection();
  }, []);

  const checkDatabaseConnection = async () => {
    try {
      setDbCheckLoading(true);
      const response = await fetch('/api/database');
      const data = await response.json();
      setDbConnected(data.success || false);
      if (!data.success) {
        console.log('[NewChat] 数据库未连接:', data.error);
      }
    } catch (error) {
      console.error('[NewChat] 检查数据库连接失败:', error);
      setDbConnected(false);
    } finally {
      setDbCheckLoading(false);
    }
  };

  // 设置默认模型
  useEffect(() => {
    if (activeKey) {
      if (activeKey.provider === 'openai') setSelectedModel('gpt-4o');
      else if (activeKey.provider === 'claude') setSelectedModel('claude-3-5-sonnet-20241022');
      else if (activeKey.provider === 'deepseek') setSelectedModel('deepseek-chat');
      else if (activeKey.provider === 'doubao') setSelectedModel('doubao-seed-2-0-lite-260215');
    }
  }, [activeKey]);

  const checkDatabaseConnection = async () => {
    try {
      setDbCheckLoading(true);
      const response = await fetch('/api/database');
      const data = await response.json();
      setDbConnected(data.success || false);
      if (!data.success) {
        console.log('[NewChat] 数据库未连接:', data.error);
      }
    } catch (error) {
      console.error('[NewChat] 检查数据库连接失败:', error);
      setDbConnected(false);
    } finally {
      setDbCheckLoading(false);
    }
  };

  // 设置默认模型
  useEffect(() => {
    if (activeKey) {
      if (activeKey.provider === 'openai') setSelectedModel('gpt-4o');
      else if (activeKey.provider === 'claude') setSelectedModel('claude-3-5-sonnet-20241022');
      else if (activeKey.provider === 'deepseek') setSelectedModel('deepseek-chat');
      else if (activeKey.provider === 'doubao') setSelectedModel('doubao-seed-2-0-lite-260215');
    }
  }, [activeKey]);

  // 加载自定义技能
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_SKILLS_STORAGE_KEY);
      console.log('[NewChat] 加载自定义技能:', stored ? '有数据' : '无数据');
      if (stored) {
        const skills = JSON.parse(stored) as CustomSkill[];
        const enabledSkills = skills.filter(s => s.enabled);
        console.log('[NewChat] 已启用的技能数量:', enabledSkills.length, enabledSkills.map(s => s.name));
        setCustomSkills(enabledSkills);
      }
    } catch (err) {
      console.error('加载自定义技能失败:', err);
    }
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 6) {
      setGreeting('夜深了');
    } else if (hour < 12) {
      setGreeting('早上好');
    } else if (hour < 18) {
      setGreeting('下午好');
    } else {
      setGreeting('晚上好');
    }
  }, []);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    console.log('[sendMessage] 开始发送消息');
    console.log('[sendMessage] dbConnected:', dbConnected);
    console.log('[sendMessage] activeKey:', activeKey ? '已配置' : '未配置');

    // 如果没有当前会话，创建一个
    let session = currentSession;
    if (!session) {
      console.log('[sendMessage] 创建新会话');
      session = createSession(selectedModel, activeKey?.provider || 'unknown');
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    console.log('[sendMessage] 添加用户消息:', userMessage.content);

    // 先添加用户消息到界面
    addMessage(session.id, userMessage);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // 检查数据库连接和API配置
    if (!dbConnected) {
      console.log('[sendMessage] 数据库未连接');
      setError('数据库未连接，消息已显示但无法保存到历史记录。请稍后重试或联系管理员检查数据库配置。');
      setIsLoading(false);
      return;
    }

    if (!activeKey) {
      console.log('[sendMessage] API Key 未配置');
      setError('API Key 未配置，消息已显示但无法获取 AI 回复。请联系管理员配置 AI 模型 API Key。');
      setIsLoading(false);
      return;
    }

    // 添加用户消息
    addMessage(session.id, userMessage);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // 构建消息历史
    const chatMessages = [
      { role: 'system' as const, content: '你是一个有帮助的 AI 助手。' },
      ...(session.messages.map(m => ({ role: m.role, content: m.content }))),
      { role: 'user' as const, content: userMessage.content },
    ];

    console.log('[sendMessage] 调用 Chat API');
    console.log('[sendMessage] 消息数量:', chatMessages.length);
    console.log('[sendMessage] 模型:', selectedModel);
    console.log('[sendMessage] 提供商:', activeKey.provider);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          model: selectedModel,
          apiKey: activeKey.apiKey,
          baseUrl: activeKey.baseUrl,
          provider: activeKey.provider,
        }),
      });

      console.log('[sendMessage] Chat API 响应状态:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[sendMessage] Chat API 错误:', errorData);
        throw new Error(errorData.error || '请求失败');
      }

      // 流式读取响应
      const reader = response.body?.getReader();
      if (!reader) {
        console.error('[sendMessage] 无法读取响应');
        throw new Error('无法读取响应');
      }

      let assistantContent = '';
      const decoder = new TextDecoder();
      let chunksReceived = 0;

      console.log('[sendMessage] 开始读取流式响应');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[sendMessage] 流式响应结束，共收到', chunksReceived, '个数据块');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        chunksReceived++;

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === '' || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.content) {
                assistantContent += data.content;
                console.log('[sendMessage] 收到内容片段:', assistantContent.length, '字符');
              }
            } catch (err) {
              console.error('[sendMessage] 解析数据块失败:', err);
            }
          }
        }
      }

      console.log('[sendMessage] 助手回复完成，总长度:', assistantContent.length);

      // 添加助手消息
      if (assistantContent) {
        console.log('[sendMessage] 添加助手消息');
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date(),
        };
        addMessage(session.id, assistantMessage);
      }
    } catch (err) {
      console.error('[sendMessage] Chat error:', err);
      setError(err instanceof Error ? err.message : '请求失败，请重试');
    } finally {
      setIsLoading(false);
      console.log('[sendMessage] 发送消息流程结束');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 执行自定义技能
  const executeCustomSkill = async (skill: CustomSkill) => {
    if (!currentSession) {
      // 如果没有当前会话，创建一个
      if (!activeKey) {
        setError('请先配置 API 密钥');
        return;
      }
      createSession(selectedModel, activeKey.provider);
    }

    setExecutingSkill(skill.id);
    setError(null);

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `🔍 执行技能：${skill.name}`,
      timestamp: new Date(),
    };
    
    if (currentSession) {
      addMessage(currentSession.id, userMessage);
    }

    try {
      // 构建默认参数
      const params: Record<string, unknown> = {};
      for (const param of skill.requestParams) {
        if (param.defaultValue !== undefined) {
          params[param.name] = param.defaultValue;
        } else if (param.name === 'loginName' && skill.authConfig.type === 'basic') {
          params[param.name] = skill.authConfig.username;
        }
      }

      const response = await fetch('/api/custom-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          skill,
          params,
        }),
      });

      const data = await response.json();

      // 添加助手消息
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.success 
          ? `✅ **${skill.name}** 执行成功\n\n${data.message}\n\n\`\`\`json\n${JSON.stringify(data.data, null, 2)}\n\`\`\``
          : `❌ **${skill.name}** 执行失败：${data.message}`,
        timestamp: new Date(),
      };

      if (currentSession) {
        addMessage(currentSession.id, assistantMessage);
      }
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 执行失败：${err instanceof Error ? err.message : '网络错误'}`,
        timestamp: new Date(),
      };

      if (currentSession) {
        addMessage(currentSession.id, errorMessage);
      }
    } finally {
      setExecutingSkill(null);
    }
  };

  // 合并内置技能和自定义技能
  const allQuickSkills = [
    ...builtInQuickSkills,
    ...customSkills.map(skill => ({
      icon: iconMap[skill.icon] || Zap,
      label: skill.name,
      color: 'text-primary',
      skillId: skill.id,
      skill,
    })),
  ];

  // 清空当前对话
  const clearCurrentChat = () => {
    if (currentSession) {
      updateSession(currentSession.id, { messages: [] });
    }
  };

  const hasMessages = (currentSession?.messages.length || 0) > 0;
  const messages = currentSession?.messages || [];

  // 配置加载中或未配置时的提示
  if (configLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeKey) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">未配置 AI 服务</h2>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          {configSource === 'global' 
            ? '管理员尚未配置全局 AI 服务'
            : '请先在设置中配置 API 密钥，或联系管理员配置全局服务'}
        </p>
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          打开设置
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 配置来源提示 */}
      <div className="border-b border-border bg-muted/30 px-4 py-1 text-xs text-muted-foreground flex items-center justify-between">
        <span>
          {configSource === 'global' ? `🌐 全局配置${activeKey?.name ? ` (${activeKey.name})` : ''}` : '⚠️ 未配置，请联系管理员配置'}
        </span>
        <button
          onClick={() => setShowSettings(true)}
          className="hover:text-foreground transition-colors"
        >
          <Settings className="w-3 h-3" />
          <span>配置详情</span>
        </button>
      </div>

      {/* 顶部工具栏 */}
      <div className="border-b border-border bg-card/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasMessages && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {activeKey?.provider === 'doubao' && (
                <>
                  <option value="doubao-seed-2-0-pro-260215">豆包 Seed 2.0 Pro</option>
                  <option value="doubao-seed-2-0-lite-260215">豆包 Seed 2.0 Lite</option>
                  <option value="doubao-seed-2-0-mini-260215">豆包 Seed 2.0 Mini</option>
                  <option value="doubao-seed-1-8-251228">豆包 Seed 1.8</option>
                  <option value="doubao-seed-1-6-251015">豆包 Seed 1.6</option>
                </>
              )}
              {activeKey?.provider === 'openai' && (
                <>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </>
              )}
              {activeKey?.provider === 'claude' && (
                <>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                </>
              )}
              {activeKey?.provider === 'deepseek' && (
                <>
                  <option value="deepseek-chat">DeepSeek Chat</option>
                  <option value="deepseek-coder">DeepSeek Coder</option>
                </>
              )}
              {activeKey?.provider === 'custom' && (
                <option value="default">默认模型</option>
              )}
            </select>
          )}
          {hasMessages && (
            <button
              onClick={clearCurrentChat}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="清空对话"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
          title="设置"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          /* 欢迎界面 */
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-semibold text-foreground mb-2">
                {greeting}，陈振镇
              </h1>
              <p className="text-muted-foreground">
                {activeKey ? '内容由 AI 助手生成' : '请先配置 API 密钥以开始对话'}
              </p>
            </div>
          </div>
        ) : (
          /* 消息列表 */
          <div className="max-w-3xl mx-auto py-4 px-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 状态提示 */}
      {dbCheckLoading && (
        <div className="px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            正在检查系统状态...
          </div>
        </div>
      )}

      {!dbConnected && !dbCheckLoading && (
        <div className="px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-start gap-3 px-4 py-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">数据库未连接</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                当前功能受限，对话历史无法保存。请稍后重试或联系管理员检查数据库配置。
              </p>
            </div>
          </div>
        </div>
      )}

      {dbConnected && !activeKey && !configLoading && (
        <div className="px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-start gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-800 dark:text-blue-200">API Key 未配置</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                请联系管理员配置 AI 模型 API Key 后使用对话功能。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            {error.includes('请先配置') && (
              <span className="text-xs ml-2">请联系管理员配置</span>
            )}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t border-border bg-background p-4">
        <div className="max-w-2xl mx-auto">
          {/* 快捷技能 */}
          {!hasMessages && (
            <div className="mb-4 flex flex-wrap justify-center gap-2">
              {allQuickSkills.map((skill, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (skill.skillId && skill.skill) {
                      executeCustomSkill(skill.skill);
                    }
                  }}
                  disabled={!!executingSkill}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 border rounded-full text-sm transition-all",
                    skill.skillId 
                      ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20" 
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-accent",
                    executingSkill && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {executingSkill === skill.skillId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <skill.icon className={`w-4 h-4 ${skill.color}`} />
                  )}
                  <span>{skill.label}</span>
                  {skill.skillId && (
                    <span className="text-xs opacity-60">自定义</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* 输入框 */}
          <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeKey ? '发消息或输入"/"选择技能' : '请先配置 API 密钥'}
                disabled={!activeKey}
                className="w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base min-h-[40px] disabled:opacity-50"
                rows={1}
                style={{ height: 'auto' }}
              />
            </div>

            {/* 工具栏 */}
            <div className="px-4 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                  <Paperclip className="w-4 h-4" />
                  <span>附件</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                  <Brain className="w-4 h-4" />
                  <span>深度思考</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading || !activeKey}
                  className="p-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* API 状态提示 */}
          {!activeKey && (
            <div className="mt-3 text-center">
              <button
                onClick={() => setShowSettings(true)}
                className="text-sm text-primary hover:underline"
              >
                点击配置 API 密钥
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 设置弹窗 - 动态导入避免循环依赖 */}
      {showSettings && (
        <SettingsDialogWrapper
          onClose={() => setShowSettings(false)}
          onKeysChange={() => {}}
        />
      )}
    </div>
  );
}

// 动态导入设置弹窗
import dynamic from 'next/dynamic';

const SettingsDialogWrapper = dynamic(
  () => import('./settings-dialog-wrapper').then(mod => mod.SettingsDialogWrapper),
  { ssr: false }
);
