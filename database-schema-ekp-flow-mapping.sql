-- =====================================================
-- EKP 流程映射表
-- 用于管理业务类型到 EKP 表单模板的映射关系
-- =====================================================

-- 创建流程映射表
CREATE TABLE IF NOT EXISTS ekp_flow_mappings (
  id VARCHAR(64) PRIMARY KEY COMMENT '主键ID',
  business_type VARCHAR(64) NOT NULL COMMENT '业务类型编码',
  business_name VARCHAR(128) NOT NULL COMMENT '业务类型名称',
  form_url VARCHAR(512) NOT NULL COMMENT '表单URL',
  template_id VARCHAR(128) DEFAULT '' COMMENT '模板ID',
  enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用：1-启用，0-禁用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_business_type (business_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP流程映射表';

-- 插入默认流程映射
INSERT INTO ekp_flow_mappings (id, business_type, business_name, form_url, template_id, enabled) VALUES
('flow_leave', 'leave', '请假申请', '/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=17cba859d4a22f589b8cc4b482bb6898', '17cba859d4a22f589b8cc4b482bb6898', 1),
('flow_expense', 'expense', '费用报销', '/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=expense_template_id', 'expense_template_id', 1),
('flow_trip', 'trip', '出差申请', '/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=trip_template_id', 'trip_template_id', 1),
('flow_purchase', 'purchase', '采购申请', '/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=purchase_template_id', 'purchase_template_id', 1),
('flow_vehicle', 'vehicle', '用车申请', '/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=vehicle_template_id', 'vehicle_template_id', 1),
('flow_reception', 'reception', '接待申请', '/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=reception_template_id', 'reception_template_id', 1)
ON DUPLICATE KEY UPDATE 
  business_name = VALUES(business_name),
  form_url = VALUES(form_url),
  template_id = VALUES(template_id);

-- =====================================================
-- 更新 ekp_configs 表，添加 SSO 和代理配置字段
-- =====================================================

-- 检查并添加 SSO 配置字段
ALTER TABLE ekp_configs 
  ADD COLUMN IF NOT EXISTS sso_enabled TINYINT(1) DEFAULT 1 COMMENT 'SSO是否启用' AFTER enabled,
  ADD COLUMN IF NOT EXISTS sso_service_id VARCHAR(128) DEFAULT 'loginWebserviceService' COMMENT 'SSO服务标识' AFTER sso_enabled,
  ADD COLUMN IF NOT EXISTS sso_webservice_path VARCHAR(256) DEFAULT '/sys/webserviceservice/' COMMENT 'SSO WebService地址' AFTER sso_service_id,
  ADD COLUMN IF NOT EXISTS sso_login_path VARCHAR(256) DEFAULT '/sys/authentication/sso/login_auto.jsp' COMMENT 'SSO登录页面路径' AFTER sso_webservice_path,
  ADD COLUMN IF NOT EXISTS sso_session_verify_path VARCHAR(256) DEFAULT '/sys/org/sys-inf/sysInfo.do?method=currentUser' COMMENT 'SSO Session验证路径' AFTER sso_login_path;

-- 检查并添加代理配置字段
ALTER TABLE ekp_configs 
  ADD COLUMN IF NOT EXISTS proxy_enabled TINYINT(1) DEFAULT 1 COMMENT '代理是否启用' AFTER sso_session_verify_path,
  ADD COLUMN IF NOT EXISTS proxy_path VARCHAR(128) DEFAULT '/api/ekp-proxy' COMMENT '代理路径前缀' AFTER proxy_enabled;

-- 检查并添加表单模板配置字段
ALTER TABLE ekp_configs 
  ADD COLUMN IF NOT EXISTS leave_template_id VARCHAR(128) DEFAULT '' COMMENT '请假申请模板ID' AFTER proxy_path,
  ADD COLUMN IF NOT EXISTS expense_template_id VARCHAR(128) DEFAULT '' COMMENT '费用报销模板ID' AFTER leave_template_id,
  ADD COLUMN IF NOT EXISTS trip_template_id VARCHAR(128) DEFAULT '' COMMENT '出差申请模板ID' AFTER expense_template_id,
  ADD COLUMN IF NOT EXISTS purchase_template_id VARCHAR(128) DEFAULT '' COMMENT '采购申请模板ID' AFTER trip_template_id;
