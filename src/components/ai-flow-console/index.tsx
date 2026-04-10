'use client';

/**
 * AI 流程操控台
 * 
 * 左右分栏布局：
 * - 左侧：EKP 表单（iframe 嵌入）
 * - 右侧：AI 对话面板
 * 
 * 功能：
 * - iframe 嵌入真实 EKP 表单（通过 Nginx 反向代理解决跨域）
 * - AI 自然语言交互填表
 * - 实时表单预览
 * - SSO 自动登录（通过 Cookie 桥接）
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  Send,
  PanelLeftClose,
  PanelLeft,
  RefreshCw,
  ExternalLink,
  Info,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// 类型定义
// ============================================

export interface FormMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  formData?: Record<string, unknown>;
  isAction?: boolean;
  actionType?: 'fill_field' | 'submit' | 'validate' | 'open_form';
}

export interface FormField {
  code: string;
  value: unknown;
  timestamp?: Date;
}

export interface AIFormConsoleProps {
  /** 表单URL（EKP iframe 嵌入） */
  formUrl?: string;
  /** 业务类型 */
  businessType?: string;
  /** 表单编码 */
  formCode?: string;
  /** 字段映射配置 */
  fieldMappings?: Record<string, string>;
  /** 初始表单数据 */
  initialData?: Record<string, unknown>;
  /** 用户ID */
  userId: string;
  /** 是否全屏模式 */
  fullscreen?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
  /** 提交成功回调 */
  onSubmit?: (data: Record<string, unknown>) => void;
  /** 表单变化回调 */
  onFormChange?: (data: Record<string, unknown>) => void;
  className?: string;
}

// ============================================
// 默认字段映射
// ============================================

const DEFAULT_FIELD_MAPPINGS: Record<string, string> = {
  leaveType: 'fd_leave_type',
  startTime: 'fd_start_time',
  endTime: 'fd_end_time',
  days: 'fd_days',
  reason: 'fd_reason',
};

// ============================================
// AIFormConsole 组件
// ============================================

export function AIFormConsole({
  formUrl,
  businessType,
  formCode,
  fieldMappings = DEFAULT_FIELD_MAPPINGS,
  initialData = {},
  userId,
  fullscreen = false,
  onClose,
  onSubmit,
  onFormChange,
  className,
}: AIFormConsoleProps) {
  // 状态
  const [messages, setMessages] = useState<FormMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [formFields, setFormFields] = useState<Record<string, unknown>>(initialData);
  const [isFormReady, setIsFormReady] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  // EKP 登录状态：null=未检测, true=已登录, false=未登录
  const [ekpLoginStatus, setEkpLoginStatus] = useState<boolean | null>(null);
  // SSO 登录中状态
  const [isSSOLoading, setIsSSOLoading] = useState(false);
  // 当前 iframe 的 SSO sessionId
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 初始化欢迎消息
  useEffect(() => {
    if (!businessType) return;

    const welcomeMessage: FormMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: getWelcomeMessage(businessType),
      timestamp: new Date(),
      isAction: true,
      actionType: 'open_form',
    };

    setMessages([welcomeMessage]);
  }, [businessType]);

  // 检查 EKP 登录状态（通过 API 代理检测）
  useEffect(() => {
    if (!userId || !formUrl) return;

    const checkEKPLogin = async () => {
      try {
        const response = await fetch(`/api/ekp-proxy/sys/org/sys-inf/sysInfo.do?method=currentUser`, {
          headers: {
            'X-User-ID': userId,
          },
        });
        // 如果返回 200，说明已登录
        if (response.ok) {
          setEkpLoginStatus(true);
        } else {
          setEkpLoginStatus(false);
        }
      } catch {
        // 无法检测，设置为未知
        setEkpLoginStatus(null);
      }
    };

    checkEKPLogin();
  }, [userId, formUrl]);

  // 检查 EKP Session 是否有效（通过代理 API）
  const checkEKPJSESSION = async (uid: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/ekp-proxy/sys/org/sys-inf/sysInfo.do?method=currentUser`, {
        headers: {
          'X-User-ID': uid,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  // 添加系统消息
  const addSystemMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      isAction: false,
    }]);
  }, []);

  // 监听 iframe 加载状态
  const handleIframeLoad = useCallback(() => {
    setIsFormReady(true);
    
    // 尝试检测登录状态（通过检查 iframe 文档内容）
    try {
      const iframeDoc = iframeRef.current?.contentDocument;
      if (iframeDoc) {
        // 检查是否包含登录表单元素
        const loginForm = iframeDoc.querySelector('form[action*="login"], input[name="username"], input[name="fd_name"]');
        if (loginForm) {
          setEkpLoginStatus(false);
          // 检测到登录页面，询问是否执行 SSO 登录
          addSystemMessage('⚠️ 检测到 EKP 系统需要登录。\n\n您可以选择：\n1. 点击"自动登录"按钮，我将尝试通过 SSO 自动登录\n2. 或直接在左侧 iframe 中输入 EKP 账号密码\n3. 或点击"切换到 API 提交模式"跳过登录');
        } else {
          // 检查是否已成功登录（SSO 后跳转到了目标表单）
          const currentSrc = iframeRef.current?.src || '';
          if (currentSessionId && currentSrc.includes('login_auto.jsp')) {
            // SSO 登录后仍在 login_auto.jsp，说明登录失败
            addSystemMessage('⚠️ SSO 登录可能未成功。请直接在 iframe 中手动登录 EKP 账号。');
            setEkpLoginStatus(false);
          } else if (currentSrc.includes(formUrl?.split('?')[0] || '')) {
            // 已跳转到目标表单，说明登录成功
            setEkpLoginStatus(true);
            setCurrentSessionId(null); // 清除 sessionId
            addSystemMessage('✅ EKP SSO 登录成功！表单已加载完成，您可以用自然语言描述要填写的内容。');
          } else {
            // 其他情况，假设已登录
            setEkpLoginStatus(true);
            addSystemMessage('✅ EKP 表单已加载完成，您可以用自然语言描述要填写的内容。');
          }
        }
      }
    } catch (error) {
      // 跨域访问失败（使用代理后应该不会失败），使用默认状态
      setEkpLoginStatus(null);
      addSystemMessage('表单已加载。现在您可以在 EKP 表单中填写信息了。我会帮您解析自然语言并指导填表。');
    }
  }, [addSystemMessage, currentSessionId, formUrl]);

  // 确认已登录（刷新 iframe 状态检测）
  const handleConfirmLogin = useCallback(() => {
    setIsFormReady(false); // 重置加载状态以触发重新检测
    addSystemMessage('正在检测登录状态...');
    // 重新加载 iframe
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }, [addSystemMessage]);

  // 执行 SSO 自动登录
  const performSSOLogin = useCallback(async () => {
    if (!userId || !formUrl || isSSOLoading) return;

    setIsSSOLoading(true);
    addSystemMessage('正在执行 SSO 自动登录...');

    try {
      // 调用 SSO API 获取 sessionId
      const response = await fetch('/api/ekp/sso/get-session-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          targetUrl: formUrl, // 登录后跳转的目标页面
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.sessionId) {
        const sessionId = result.data.sessionId;
        setCurrentSessionId(sessionId);

        // 通过 iframe 执行 SSO 登录
        if (iframeRef.current) {
          const ssoUrl = `/api/ekp-proxy/sys/authentication/sso/login_auto.jsp?sessionId=${encodeURIComponent(sessionId)}&target=${encodeURIComponent(formUrl)}`;
          iframeRef.current.src = ssoUrl;
          addSystemMessage('✅ SSO 登录请求已发送，正在验证登录状态...');
        }
      } else {
        addSystemMessage(`⚠️ SSO 登录失败：${result.error || '未知错误'}。\n\n您可以：\n1. 点击"手动登录"按钮直接在 iframe 中输入账号密码\n2. 或切换到 API 提交模式`);
        setEkpLoginStatus(false);
      }
    } catch (error) {
      console.error('[AIFormConsole] SSO 登录失败:', error);
      addSystemMessage('⚠️ SSO 登录请求失败。请直接在 iframe 中手动登录。');
      setEkpLoginStatus(false);
    } finally {
      setIsSSOLoading(false);
    }
  }, [userId, formUrl, isSSOLoading, addSystemMessage]);

  // 手动登录提示
  const handleManualLogin = useCallback(() => {
    addSystemMessage('请在左侧 iframe 中手动输入您的 EKP 账号密码进行登录。登录成功后，表单将自动更新。');
  }, [addSystemMessage]);

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: FormMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 调用 AI 接口解析自然语言并填表
      const result = await processNaturalLanguage(
        inputValue.trim(),
        businessType || '',
        formFields,
        fieldMappings,
        userId
      );

      // 添加 AI 回复
      const aiMessage: FormMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
        formData: result.formData,
        isAction: result.isAction,
        actionType: result.actionType,
      };

      setMessages(prev => [...prev, aiMessage]);

      // 如果有表单数据更新
      if (result.formData) {
        setFormFields(prev => ({ ...prev, ...result.formData }));
        
        // 通过 iframe 填表
        if (iframeRef.current?.contentWindow && isFormReady) {
          fillFormInIframe(result.formData);
        }

        // 通知表单变化
        onFormChange?.({ ...formFields, ...result.formData });
      }

      // 如果是提交操作
      if (result.actionType === 'submit') {
        setSubmitStatus('loading');
        try {
          await submitForm({ ...formFields, ...result.formData });
          setSubmitStatus('success');
          addSystemMessage('表单已提交成功！');
          onSubmit?.({ ...formFields, ...result.formData });
        } catch (error) {
          setSubmitStatus('error');
          addSystemMessage(`提交失败：${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    } catch (error) {
      addSystemMessage(`处理失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, businessType, formFields, fieldMappings, userId, isFormReady, onFormChange, onSubmit, addSystemMessage]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // 在 iframe 中填表
  const fillFormInIframe = useCallback((data: Record<string, unknown>) => {
    if (!iframeRef.current?.contentWindow) return;

    // 通过 postMessage 发送填表指令
    iframeRef.current.contentWindow.postMessage({
      type: 'AI_FILL_FIELDS',
      data,
    }, '*');

    // 同时尝试直接操作（如果同域）
    try {
      const iframeDoc = iframeRef.current.contentDocument;
      if (iframeDoc) {
        for (const [fieldName, value] of Object.entries(data)) {
          // 尝试多种选择器
          const selectors = [
            `[name="${fieldName}"]`,
            `[id="${fieldName}"]`,
            `[data-field="${fieldName}"]`,
          ];

          for (const selector of selectors) {
            const input = iframeDoc.querySelector(selector) as HTMLInputElement | HTMLSelectElement | null;
            if (input) {
              if (input.tagName === 'SELECT') {
                const select = input as HTMLSelectElement;
                const option = Array.from(select.options).find(
                  opt => opt.text.includes(String(value)) || opt.value === String(value)
                );
                if (option) {
                  select.value = option.value;
                  select.dispatchEvent(new Event('change', { bubbles: true }));
                }
              } else {
                input.value = String(value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('blur', { bubbles: true }));
              }
              break;
            }
          }
        }
      }
    } catch (error) {
      // 跨域访问失败是正常的，使用 postMessage
      console.log('[AIFormConsole] 跨域访问 iframe 失败，使用 postMessage');
    }
  }, []);

  // 提交表单
  const submitForm = useCallback(async (data: Record<string, unknown>) => {
    // 调用后端 API 发起流程
    const response = await fetch('/api/ekp/flow/launch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId,
      },
      body: JSON.stringify({
        businessType,
        formValues: data,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '提交失败');
    }

    return result;
  }, [businessType, userId]);

  // 获取欢迎消息
  const getWelcomeMessage = (type: string): string => {
    const messages: Record<string, string> = {
      leave: '我已为您打开请假申请表单。请用自然语言告诉我您的请假信息，例如：\n\n• "请事假3天，明天开始"\n• "开始时间后天"\n• "原因：家中有事"\n\n我会自动帮您填写表单。',
      expense: '我已为您打开费用报销表单。请用自然语言告诉我报销信息，例如：\n\n• "报销差旅费1000元"\n• "日期今天"\n• "说明：广州出差"',
      purchase: '我已为您打开采购申请表单。请用自然语言告诉我采购信息，例如：\n\n• "采购办公用品"\n• "总金额500元"',
    };

    return messages[type] || '我已为您打开表单。请用自然语言描述您要填写的内容，我会自动帮您填表。';
  };

  return (
    <div className={cn(
      'flex flex-col h-full bg-background',
      fullscreen ? 'fixed inset-0 z-50' : '',
      className
    )}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-sm">AI 流程操控台</h2>
            {businessType && (
              <p className="text-xs text-muted-foreground">
                {getBusinessTypeName(businessType)}
              </p>
            )}
          </div>
          <Badge variant="outline" className="ml-2">
            {isFormReady ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                表单就绪
              </>
            ) : (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                加载中
              </>
            )}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFormFields({});
              setMessages([{
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '表单已重置，请重新描述要填写的内容。',
                timestamp: new Date(),
              }]);
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              关闭
            </Button>
          )}
        </div>
      </div>

      {/* 主体内容 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：表单 iframe */}
        {showSidebar && (
          <div className="w-1/2 border-r flex flex-col">
            <div className="flex-1 relative bg-muted/30">
              {/* 代理模式：使用 /api/ekp-proxy/ 前缀访问 EKP */}
              {/* 例如：/api/ekp-proxy/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=xxx */}
              {formUrl ? (
                <iframe
                  ref={iframeRef}
                  src={(() => {
                    // 解析 formUrl，提取路径和查询参数
                    let path: string;
                    let query: string = '';
                    
                    if (formUrl.startsWith('http://') || formUrl.startsWith('https://')) {
                      // 完整 URL，提取路径和查询参数
                      const url = new URL(formUrl);
                      path = url.pathname;
                      query = url.search;
                    } else {
                      // 只有路径
                      const [urlPath, urlQuery] = formUrl.split('?');
                      path = urlPath;
                      query = urlQuery ? `?${urlQuery}` : '';
                    }
                    
                    // 清理路径中的双斜杠
                    path = path.replace(/\/+/g, '/').replace(/^\//, '');
                    
                    // 构建代理 URL
                    return `/api/ekp-proxy/${path}${query}`;
                  })()}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                  onLoad={handleIframeLoad}
                  title="EKP 表单"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Card className="w-80">
                    <CardHeader>
                      <CardTitle className="text-center">表单预览</CardTitle>
                      <CardDescription className="text-center">
                        请先选择一个流程模板
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              )}

              {/* 表单加载遮罩 */}
              {!isFormReady && formUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="flex flex-col items-center gap-2">
                    <Spinner />
                    <p className="text-sm text-muted-foreground">正在加载表单...</p>
                  </div>
                </div>
              )}

              {/* API 提交模式提示（当隐藏侧边栏时显示） */}
              {!showSidebar && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                  <Card className="w-80 mx-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-primary" />
                        API 提交模式
                      </CardTitle>
                      <CardDescription>
                        您已切换到 API 直接提交模式，无需登录 EKP 系统。
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-3 text-sm">
                        <p className="font-medium mb-2">功能说明：</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>直接通过 EKP REST API 提交申请</li>
                          <li>无需登录 iframe 表单</li>
                          <li>请在右侧用自然语言描述您的申请内容</li>
                        </ul>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mt-3">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          💡 <strong>注意：</strong>API 提交模式可能无法自动填充 EKP 表单某些字段，如有需要建议使用 iframe 模式登录 EKP。
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setShowSidebar(true);
                          addSystemMessage('已切换回 iframe 模式。请在左侧 EKP 表单中手动登录，登录成功后即可自动填表。');
                        }}
                      >
                        切换回 iframe 模式
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )}
            </div>

            {/* 字段预览 */}
            <div className="p-3 border-t bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">已填写字段</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(formFields).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {String(value)}
                  </Badge>
                ))}
                {Object.keys(formFields).length === 0 && (
                  <span className="text-xs text-muted-foreground">暂无</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 右侧：AI 对话 */}
        <div className="flex-1 flex flex-col">
          {/* 消息列表 */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'rounded-lg px-4 py-3 max-w-[80%]',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {message.isAction && message.actionType === 'fill_field' && (
                      <div className="mt-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-xs opacity-80">已自动填表</span>
                      </div>
                    )}

                    {message.isAction && message.actionType === 'submit' && (
                      <div className="mt-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-xs opacity-80">表单已提交</span>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="text-xs text-primary-foreground font-medium">
                        {message.content.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {/* 加载指示器 */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">AI 正在处理...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* 提交状态 */}
          {submitStatus !== 'idle' && (
            <div className={cn(
              'px-4 py-2 border-t text-sm',
              submitStatus === 'loading' && 'bg-blue-50 text-blue-600',
              submitStatus === 'success' && 'bg-green-50 text-green-600',
              submitStatus === 'error' && 'bg-red-50 text-red-600',
            )}>
              {submitStatus === 'loading' && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在提交表单...
                </div>
              )}
              {submitStatus === 'success' && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  表单提交成功！
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  提交失败，请重试
                </div>
              )}
            </div>
          )}

          {/* 输入框 */}
          <div className="p-4 border-t">
            {/* SSO 登录提示（当检测到未登录时显示） */}
            {ekpLoginStatus === false && !isSSOLoading && (
              <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-amber-800 dark:text-amber-200">
                      检测到 EKP 需要登录
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowSidebar(false)}
                      title="切换到 API 提交模式，无需登录"
                    >
                      API 模式
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleManualLogin}
                    >
                      手动登录
                    </Button>
                    <Button 
                      size="sm"
                      onClick={performSSOLogin}
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      自动登录
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* SSO 登录中状态 */}
            {isSSOLoading && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  正在执行 SSO 自动登录...
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={ekpLoginStatus === false ? "请先登录 EKP 后再输入..." : "用自然语言描述要填写的内容..."}
                disabled={isLoading || !isFormReady || ekpLoginStatus === false}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading || !isFormReady || ekpLoginStatus === false}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                例如："请事假3天，明天开始，原因家中有事"
              </p>
              {showSidebar && (
                <button
                  type="button"
                  className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
                  onClick={() => {
                    setShowSidebar(false);
                    addSystemMessage('已切换到 API 提交模式。请在右侧用自然语言描述您的申请内容，我会通过 EKP API 直接帮您提交。');
                  }}
                >
                  切换到 API 提交模式
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 辅助函数
// ============================================

function getBusinessTypeName(type: string): string {
  const names: Record<string, string> = {
    leave: '请假申请',
    expense: '费用报销',
    purchase: '采购申请',
    travel: '出差申请',
    vehicle: '用车申请',
    reception: '接待申请',
    loan: '借款申请',
  };
  return names[type] || type;
}

/**
 * 处理自然语言输入
 * 这里可以调用 LLM 进行更智能的解析
 */
async function processNaturalLanguage(
  text: string,
  businessType: string,
  currentData: Record<string, unknown>,
  fieldMappings: Record<string, string>,
  userId: string
): Promise<{
  message: string;
  formData?: Record<string, unknown>;
  isAction?: boolean;
  actionType?: 'fill_field' | 'submit' | 'validate';
}> {
  // 调用后端 API 进行解析
  try {
    const response = await fetch('/api/ekp/ai/process-form-input', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        businessType,
        currentData,
        fieldMappings,
        userId,
      }),
    });

    const result = await response.json();

    if (result.success) {
      return result.data;
    }

    throw new Error(result.error || '处理失败');
  } catch (error) {
    // 如果 API 调用失败，使用本地解析
    return parseLocally(text, businessType);
  }
}

/**
 * 本地解析（降级方案）
 */
function parseLocally(
  text: string,
  businessType: string
): {
  message: string;
  formData?: Record<string, unknown>;
  isAction?: boolean;
  actionType?: 'fill_field' | 'submit' | 'validate';
} {
  const lowerText = text.toLowerCase();
  const formData: Record<string, unknown> = {};

  // 请假相关
  if (businessType === 'leave') {
    // 提取请假类型
    if (lowerText.includes('事假')) formData.leaveType = '01';
    else if (lowerText.includes('病假')) formData.leaveType = '02';
    else if (lowerText.includes('年假')) formData.leaveType = '03';
    else if (lowerText.includes('婚假')) formData.leaveType = '04';
    else if (lowerText.includes('产假')) formData.leaveType = '05';

    // 提取天数
    const daysMatch = text.match(/(\d+)\s*(?:天|日)/);
    if (daysMatch) formData.days = parseInt(daysMatch[1]);

    // 提取日期
    const today = new Date();
    if (lowerText.includes('明天') || lowerText.includes('明日')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      formData.startTime = tomorrow.toISOString().split('T')[0];
    } else if (lowerText.includes('后天')) {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      formData.startTime = dayAfter.toISOString().split('T')[0];
    }

    // 提取原因
    const reasonMatch = text.match(/(?:原因|reason)[:：]?\s*(.+?)(?:\s+|$)/i);
    if (reasonMatch) formData.reason = reasonMatch[1];
  }

  // 检查是否是提交
  const isSubmit = lowerText.includes('提交');

  if (Object.keys(formData).length === 0) {
    return {
      message: '抱歉，我没有理解您的意思。请用更具体的描述，例如：\n\n"请事假3天，明天开始"\n"原因：家中有事"',
    };
  }

  const fields = Object.keys(formData).map(k => `"${k}"`).join('、');

  return {
    message: `已为您填写：${fields}`,
    formData,
    isAction: true,
    actionType: isSubmit ? 'submit' : 'fill_field',
  };
}

// ============================================
// 导出
// ============================================

// AIFormConsole 已在函数定义处使用 export 导出
// 类型 AIFormConsoleProps 已在接口定义处使用 export 导出
