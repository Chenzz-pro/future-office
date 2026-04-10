-- ============================================
-- EKP 流程映射表
-- 用于管理业务类型到 EKP 流程模板的映射关系
-- ============================================

-- 创建流程映射表
CREATE TABLE IF NOT EXISTS ekp_flow_mappings (
    id VARCHAR(36) PRIMARY KEY COMMENT '映射ID',
    business_type VARCHAR(50) NOT NULL COMMENT '业务类型（唯一标识）',
    business_type_name VARCHAR(100) NOT NULL COMMENT '业务类型名称（中文）',
    business_keywords JSON COMMENT '关键词列表（用于AI识别）',
    flow_template_id VARCHAR(100) COMMENT 'EKP流程模板ID',
    flow_template_name VARCHAR(200) COMMENT 'EKP流程模板名称',
    launch_endpoint VARCHAR(500) COMMENT '发起流程接口路径',
    form_url VARCHAR(500) COMMENT 'EKP表单URL（iframe嵌入用）',
    form_code VARCHAR(100) COMMENT '表单编码',
    form_version VARCHAR(20) COMMENT '表单版本',
    field_mappings JSON COMMENT '字段映射（AI字段名 → EKP字段名）',
    category VARCHAR(50) COMMENT '分类（hr/finance/office等）',
    enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用（1=启用，0=禁用）',
    is_system TINYINT(1) DEFAULT 0 COMMENT '是否系统预置（1=系统，0=自定义）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(36) COMMENT '创建人',
    updated_by VARCHAR(36) COMMENT '更新人',
    UNIQUE KEY uk_business_type (business_type),
    INDEX idx_category (category),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP流程映射表';

-- ============================================
-- 插入默认映射数据
-- ============================================

-- 请假申请
INSERT INTO ekp_flow_mappings (
    id, business_type, business_type_name, business_keywords,
    flow_template_id, flow_template_name, launch_endpoint,
    form_url, form_code, field_mappings, category, enabled, is_system
) VALUES (
    UUID(), 'leave', '请假申请',
    '["请假", "休假", "事假", "病假", "年假", "婚假", "产假", "丧假", "调休"]',
    '17cba859d4a22f589b8cc4b482bb6898',
    '请假申请流程',
    '/km/review/restservice/kmReviewRestService/launch',
    'https://oa.fjhxrl.com/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=17cba859d4a22f589b8cc4b482bb6898',
    'leave_form',
    '{"leaveType": "fd_leave_type", "startTime": "fd_start_time", "endTime": "fd_end_time", "days": "fd_days", "reason": "fd_reason"}',
    'hr', 1, 1
);

-- 费用报销
INSERT INTO ekp_flow_mappings (
    id, business_type, business_type_name, business_keywords,
    flow_template_name, launch_endpoint,
    form_code, field_mappings, category, enabled, is_system
) VALUES (
    UUID(), 'expense', '费用报销',
    '["报销", "报销单", "差旅报销", "费用"]',
    '费用报销流程',
    '/km/review/restservice/kmReviewRestService/launch',
    'expense_form',
    '{"expenseType": "fd_expense_type", "amount": "fd_amount", "expenseDate": "fd_expense_date", "description": "fd_description"}',
    'finance', 1, 1
);

-- 采购申请
INSERT INTO ekp_flow_mappings (
    id, business_type, business_type_name, business_keywords,
    flow_template_name, launch_endpoint,
    form_code, field_mappings, category, enabled, is_system
) VALUES (
    UUID(), 'purchase', '采购申请',
    '["采购", "采购单", "物资采购"]',
    '采购申请流程',
    '/km/review/restservice/kmReviewRestService/launch',
    'purchase_form',
    '{"purchaseType": "fd_purchase_type", "items": "fd_items", "totalAmount": "fd_total_amount", "reason": "fd_reason"}',
    'procurement', 1, 1
);

-- 出差申请
INSERT INTO ekp_flow_mappings (
    id, business_type, business_type_name, business_keywords,
    flow_template_name, launch_endpoint,
    form_code, category, enabled, is_system
) VALUES (
    UUID(), 'travel', '出差申请',
    '["出差", "出差申请", "外出"]',
    '出差申请流程',
    '/km/review/restservice/kmReviewRestService/launch',
    'travel_form',
    'office', 1, 1
);

-- 用车申请
INSERT INTO ekp_flow_mappings (
    id, business_type, business_type_name, business_keywords,
    flow_template_name, launch_endpoint,
    form_code, category, enabled, is_system
) VALUES (
    UUID(), 'vehicle', '用车申请',
    '["用车", "用车申请", "车辆"]',
    '用车申请流程',
    '/km/review/restservice/kmReviewRestService/launch',
    'vehicle_form',
    'office', 1, 1
);
