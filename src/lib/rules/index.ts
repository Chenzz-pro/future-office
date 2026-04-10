/**
 * 规则模块统一导出
 * 
 * 提供权限规则和业务规则的统一访问接口
 */

// 导出规则引擎
export { RuleEngine, ruleEngine } from './rule-engine';

// 导出规则配置
export {
  // TypeScript 规则配置
  permissionRules,
  businessRules,
  defaultPermissionRules,
  defaultBusinessRules,
  
  // 辅助函数
  getMatchingPermissionRules,
  getPermissionRuleById,
  getBusinessRuleById,
  getMatchingBusinessRules,
} from './business-permission-rules';

// 导出 JSON 格式的规则配置（用于前端配置）
import permissionRulesJson from './business-permission-rules.json';
import businessRulesJson from './business-permission-rules.json';

export { permissionRulesJson, businessRulesJson };

// 重新导出类型
export type { BusinessRuleStep, BusinessRuleConfig } from './rule-engine';
