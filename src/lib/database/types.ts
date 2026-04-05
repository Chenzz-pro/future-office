// 数据库配置类型定义

export interface DatabaseConfig {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql';
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseConnectionOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  waitForConnections?: boolean;
  connectionLimit?: number;
  queueLimit?: number;
}

export interface QueryResult<T = unknown> {
  rows: T[];
  affectedRows?: number;
  insertId?: string | number;
}
