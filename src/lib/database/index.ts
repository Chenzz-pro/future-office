// 数据库层统一导出

// 类型定义
export * from './types';

// 连接管理器
export { dbManager, DatabaseManager, getOneAPIConfigRepository } from './manager';

// Repository 层
export { userRepository, UserRepository } from './repositories/user.repository';
export { apiKeyRepository, ApiKeyRepository } from './repositories/apikey.repository';
export { chatSessionRepository, ChatSessionRepository } from './repositories/chatsession.repository';
export { customSkillRepository, CustomSkillRepository } from './repositories/customskill.repository';
export { ekpConfigRepository, EkpConfigRepository } from './repositories/ekpconfig.repository';
export { databaseConfigRepository, DatabaseConfigRepository } from './repositories/databaseconfig.repository';
export { OneAPIConfigRepository } from './repositories/oneapi-config.repository';

// 实体类型
export type { User } from './repositories/user.repository';
export type { ApiKey } from './repositories/apikey.repository';
export type { ChatSession, ChatMessage } from './repositories/chatsession.repository';
export type { CustomSkill } from './repositories/customskill.repository';
export type { EkpConfig } from './repositories/ekpconfig.repository';
export type { DatabaseConfig } from './repositories/databaseconfig.repository';
export type { OneAPIConfig, CreateOneAPIConfigParams, UpdateOneAPIConfigParams } from './repositories/oneapi-config.repository';
