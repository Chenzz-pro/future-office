import { NextRequest, NextResponse } from 'next/server';
import {
  userRepository,
  apiKeyRepository,
  chatSessionRepository,
  customSkillRepository,
  ekpConfigRepository,
} from '@/lib/database';
import { dbManager } from '@/lib/database/manager';

/**
 * 数据迁移结果
 */
interface MigrationResult {
  success: boolean;
  message: string;
  details: {
    users: { migrated: number; skipped: number };
    apiKeys: { migrated: number; skipped: number };
    chatSessions: { migrated: number; skipped: number };
    customSkills: { migrated: number; skipped: number };
    ekpConfigs: { migrated: number; skipped: number };
  };
}

/**
 * POST /api/database/migrate
 * 将 localStorage 数据迁移到 MySQL
 */
export async function POST(request: NextRequest) {
  try {
    // 检查数据库连接
    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接，请先配置并连接数据库' },
        { status: 400 }
      );
    }

    const result: MigrationResult = {
      success: true,
      message: '数据迁移成功',
      details: {
        users: { migrated: 0, skipped: 0 },
        apiKeys: { migrated: 0, skipped: 0 },
        chatSessions: { migrated: 0, skipped: 0 },
        customSkills: { migrated: 0, skipped: 0 },
        ekpConfigs: { migrated: 0, skipped: 0 },
      },
    };

    // 迁移用户数据
    const usersData = localStorage.getItem('users');
    if (usersData) {
      try {
        const users = JSON.parse(usersData);
        for (const user of users) {
          try {
            // 检查是否已存在
            const existing = await userRepository.findByUsername(user.username);
            if (!existing) {
              await userRepository.create({
                username: user.username,
                password: user.password,
                email: user.email || `${user.username}@example.com`,
                role: user.role || 'user',
                avatarUrl: user.avatarUrl,
                status: user.status || 'active',
                lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined,
              });
              result.details.users.migrated++;
            } else {
              result.details.users.skipped++;
            }
          } catch (err) {
            console.error('迁移用户失败:', user, err);
            result.details.users.skipped++;
          }
        }
      } catch (err) {
        console.error('解析用户数据失败:', err);
      }
    }

    // 迁移 API Keys
    const apiKeysData = localStorage.getItem('ai-api-keys');
    if (apiKeysData) {
      try {
        const apiKeys = JSON.parse(apiKeysData);
        // apiKeys 可能是对象格式 { provider: key }
        const userId = '1'; // 默认管理员用户ID
        for (const [provider, key] of Object.entries(apiKeys)) {
          if (typeof key === 'string') {
            try {
              await apiKeyRepository.create({
                userId,
                name: `${provider} API Key`,
                provider: provider as 'openai' | 'claude' | 'deepseek' | 'doubao' | 'custom',
                apiKey: key,
                isActive: true,
              });
              result.details.apiKeys.migrated++;
            } catch (err) {
              console.error('迁移 API Key 失败:', provider, err);
              result.details.apiKeys.skipped++;
            }
          }
        }
      } catch (err) {
        console.error('解析 API Keys 数据失败:', err);
      }
    }

    // 迁移对话会话
    const chatSessionsData = localStorage.getItem('chat-sessions');
    if (chatSessionsData) {
      try {
        const sessions = JSON.parse(chatSessionsData);
        const userId = '1'; // 默认管理员用户ID
        for (const session of sessions) {
          try {
            // 检查会话是否已存在
            const existing = await chatSessionRepository.findById(session.id);
            if (!existing) {
              const sessionId = await chatSessionRepository.create({
                id: session.id,
                userId,
                title: session.title || '未命名会话',
                agentId: session.agentId,
              });

              // 迁移消息
              if (session.messages && Array.isArray(session.messages)) {
                for (const msg of session.messages) {
                  try {
                    await chatSessionRepository.addMessage({
                      sessionId,
                      role: msg.role,
                      content: msg.content,
                      metadata: msg.metadata,
                    });
                  } catch (err) {
                    console.error('迁移消息失败:', msg, err);
                  }
                }
              }
              result.details.chatSessions.migrated++;
            } else {
              result.details.chatSessions.skipped++;
            }
          } catch (err) {
            console.error('迁移会话失败:', session, err);
            result.details.chatSessions.skipped++;
          }
        }
      } catch (err) {
        console.error('解析对话数据失败:', err);
      }
    }

    // 迁移自定义技能
    const customSkillsData = localStorage.getItem('custom-skills');
    if (customSkillsData) {
      try {
        const skills = JSON.parse(customSkillsData);
        const userId = '1'; // 默认管理员用户ID
        for (const skill of skills) {
          try {
            await customSkillRepository.create({
              id: skill.id,
              userId,
              name: skill.name,
              description: skill.description,
              icon: skill.icon,
              category: skill.category,
              enabled: skill.enabled !== false,
              apiConfig: skill.apiConfig,
              authConfig: skill.authConfig,
              requestParams: skill.requestParams,
              bodyTemplate: skill.bodyTemplate,
              responseParsing: skill.responseParsing,
            });
            result.details.customSkills.migrated++;
          } catch (err) {
            console.error('迁移技能失败:', skill, err);
            result.details.customSkills.skipped++;
          }
        }
      } catch (err) {
        console.error('解析技能数据失败:', err);
      }
    }

    // 迁移 EKP 配置
    const ekpConfigData = localStorage.getItem('ekp_config');
    if (ekpConfigData) {
      try {
        const ekpConfig = JSON.parse(ekpConfigData);
        const userId = '1'; // 默认管理员用户ID
        try {
          await ekpConfigRepository.create({
            id: crypto.randomUUID(),
            userId,
            ekpAddress: ekpConfig.ekpAddress,
            username: ekpConfig.username,
            password: ekpConfig.password,
            authType: ekpConfig.authType || 'basic',
            config: ekpConfig,
          });
          result.details.ekpConfigs.migrated++;
        } catch (err) {
          console.error('迁移 EKP 配置失败:', err);
          result.details.ekpConfigs.skipped++;
        }
      } catch (err) {
        console.error('解析 EKP 配置数据失败:', err);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('数据迁移失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/database/migrate
 * 获取迁移预览信息
 */
export async function GET() {
  try {
    const preview = {
      users: localStorage.getItem('users') ? JSON.parse(localStorage.getItem('users')!).length : 0,
      apiKeys: localStorage.getItem('ai-api-keys') ? Object.keys(JSON.parse(localStorage.getItem('ai-api-keys')!)).length : 0,
      chatSessions: localStorage.getItem('chat-sessions') ? JSON.parse(localStorage.getItem('chat-sessions')!).length : 0,
      customSkills: localStorage.getItem('custom-skills') ? JSON.parse(localStorage.getItem('custom-skills')!).length : 0,
      ekpConfigs: localStorage.getItem('ekp_config') ? 1 : 0,
    };

    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    console.error('获取迁移预览失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
