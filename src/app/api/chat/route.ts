import { NextRequest } from 'next/server';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  model: string;
  apiKey: string;
  baseUrl: string;
  provider: 'openai' | 'claude' | 'deepseek' | 'doubao' | 'custom';
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, model, apiKey, baseUrl, provider } = body;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: '请先配置 API 密钥' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: '消息不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 根据 provider 选择处理方式
    switch (provider) {
      case 'claude':
        return handleClaudeRequest(messages, model, apiKey, baseUrl);
      case 'doubao':
        return handleDoubaoRequest(messages, model, apiKey, baseUrl);
      case 'deepseek':
      case 'openai':
      case 'custom':
      default:
        return handleOpenAICompatibleRequest(messages, model, apiKey, baseUrl, provider);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: '请求失败，请检查 API 配置' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 处理 OpenAI 兼容的 API 请求
async function handleOpenAICompatibleRequest(
  messages: Message[],
  model: string,
  apiKey: string,
  baseUrl: string,
  provider: string
) {
  const url = `${baseUrl}/chat/completions`;
  
  const requestBody = {
    model,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('API error:', response.status, error);
      return new Response(
        JSON.stringify({ error: `API 请求失败 (${response.status}): ${error.slice(0, 200)}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 流式响应
    return handleStreamResponse(response);
  } catch (error) {
    console.error('Request error:', error);
    return new Response(
      JSON.stringify({ error: '网络请求失败，请检查 Base URL 是否正确' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 处理 Claude API 请求
async function handleClaudeRequest(
  messages: Message[],
  model: string,
  apiKey: string,
  baseUrl: string
) {
  const url = `${baseUrl}/messages`;
  
  // 转换消息格式
  const claudeMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role,
      content: m.content,
    }));

  const systemPrompt = messages.find(m => m.role === 'system')?.content || '';

  const requestBody = {
    model,
    messages: claudeMessages,
    system: systemPrompt,
    stream: true,
    max_tokens: 4096,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return new Response(
        JSON.stringify({ error: `Claude API 请求失败 (${response.status})` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return handleStreamResponse(response, 'claude');
  } catch (error) {
    console.error('Claude request error:', error);
    return new Response(
      JSON.stringify({ error: '网络请求失败，请检查 Base URL 是否正确' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 处理豆包/火山引擎方舟 API 请求
async function handleDoubaoRequest(
  messages: Message[],
  model: string,
  apiKey: string,
  baseUrl: string
) {
  // 豆包/火山引擎方舟 API 端点
  const url = baseUrl.includes('volces.com') 
    ? `${baseUrl}/chat/completions`
    : `${baseUrl}/api/v3/chat/completions`;
  
  const requestBody = {
    model,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('豆包 API error:', response.status, error);
      return new Response(
        JSON.stringify({ error: `豆包 API 请求失败 (${response.status}): ${error.slice(0, 200)}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return handleStreamResponse(response);
  } catch (error) {
    console.error('豆包请求 error:', error);
    return new Response(
      JSON.stringify({ error: '网络请求失败，请检查 Base URL 是否正确' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 统一的流式响应处理
function handleStreamResponse(response: Response, type: 'openai' | 'claude' = 'openai') {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '' || trimmed === 'data: [DONE]') continue;
            
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              try {
                const data = JSON.parse(jsonStr);
                let content = '';

                if (type === 'claude') {
                  // Claude 格式
                  if (data.type === 'content_block_delta' && data.delta?.text) {
                    content = data.delta.text;
                  }
                } else {
                  // OpenAI 兼容格式
                  content = data.choices?.[0]?.delta?.content;
                }

                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        console.error('Stream error:', err);
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
