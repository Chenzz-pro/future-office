/**
 * 密码工具库
 * 提供密码加密、验证和强度检查功能
 */

import * as bcrypt from 'bcryptjs';

/**
 * 密码强度级别
 */
export enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

/**
 * 密码强度检查结果
 */
export interface PasswordCheckResult {
  valid: boolean;
  strength: PasswordStrength;
  score: number;
  errors: string[];
}

/**
 * 密码强度检查规则
 */
const PASSWORD_RULES = {
  minLength: 6,
  minNumbers: 1,
  minSpecialChars: 0,
  minLowercase: 1,
  minUppercase: 0,
};

/**
 * 加密密码
 * @param plainPassword 明文密码
 * @param saltRounds 盐值轮数（默认 10）
 * @returns 加密后的密码
 */
export async function hashPassword(
  plainPassword: string,
  saltRounds: number = 10
): Promise<string> {
  return bcrypt.hash(plainPassword, saltRounds);
}

/**
 * 验证密码
 * @param plainPassword 明文密码
 * @param hashedPassword 加密后的密码
 * @returns 是否匹配
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    // 先尝试 bcrypt 验证
    const bcryptValid = await bcrypt.compare(plainPassword, hashedPassword);
    if (bcryptValid) {
      return true;
    }

    // 如果 bcrypt 验证失败，尝试 base64 验证（向后兼容）
    const base64Valid = Buffer.from(plainPassword).toString('base64') === hashedPassword;
    if (base64Valid) {
      console.warn('[Password] 检测到 base64 编码的密码，建议重新设置密码');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Password] 密码验证失败:', error);
    return false;
  }
}

/**
 * 检查密码强度
 * @param password 密码
 * @returns 密码强度检查结果
 */
export function checkPasswordStrength(password: string): PasswordCheckResult {
  const errors: string[] = [];
  let score = 0;

  // 检查长度
  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`密码长度至少需要 ${PASSWORD_RULES.minLength} 位`);
  } else {
    score += 1;
  }

  // 检查数字
  if (!/\d/.test(password)) {
    errors.push('密码需要包含至少 1 个数字');
  } else {
    score += 1;
  }

  // 检查小写字母
  if (!/[a-z]/.test(password)) {
    errors.push('密码需要包含至少 1 个小写字母');
  } else {
    score += 1;
  }

  // 检查大写字母
  if (PASSWORD_RULES.minUppercase > 0) {
    if (!/[A-Z]/.test(password)) {
      errors.push('密码需要包含至少 1 个大写字母');
    } else {
      score += 1;
    }
  }

  // 检查特殊字符
  if (PASSWORD_RULES.minSpecialChars > 0) {
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密码需要包含至少 1 个特殊字符');
    } else {
      score += 1;
    }
  }

  // 额外加分项
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1; // 大写字母加分
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1; // 特殊字符加分

  // 计算强度级别
  let strength: PasswordStrength;
  if (score <= 2) {
    strength = PasswordStrength.WEAK;
  } else if (score <= 4) {
    strength = PasswordStrength.MEDIUM;
  } else if (score <= 6) {
    strength = PasswordStrength.STRONG;
  } else {
    strength = PasswordStrength.VERY_STRONG;
  }

  return {
    valid: errors.length === 0,
    strength,
    score,
    errors,
  };
}

/**
 * 生成随机密码
 * @param length 密码长度（默认 12）
 * @param options 选项
 * @returns 随机密码
 */
export function generateRandomPassword(
  length: number = 12,
  options: {
    includeNumbers?: boolean;
    includeSpecialChars?: boolean;
    includeUppercase?: boolean;
  } = {}
): string {
  const {
    includeNumbers = true,
    includeSpecialChars = true,
    includeUppercase = true,
  } = options;

  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let chars = lowercaseChars;
  if (includeNumbers) chars += numberChars;
  if (includeSpecialChars) chars += specialChars;
  if (includeUppercase) chars += uppercaseChars;

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }

  return password;
}

/**
 * 检查密码是否需要更新（例如从 base64 迁移到 bcrypt）
 * @param hashedPassword 加密后的密码
 * @returns 是否需要更新
 */
export function needPasswordUpdate(hashedPassword: string): boolean {
  // bcrypt 密码以 $2a$、$2b$ 或 $2y$ 开头
  return !hashedPassword.startsWith('$2');
}
