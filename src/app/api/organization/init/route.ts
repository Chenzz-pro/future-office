/**
 * 组织架构数据库初始化 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'init') {
      // 创建组织架构相关表
      const tables = [
        // 组织元素表（机构/部门/岗位）
        `
        CREATE TABLE IF NOT EXISTS sys_org_element (
          fd_id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
          fd_org_type INT NOT NULL COMMENT '类型：1=机构，2=部门，3=岗位',
          fd_name VARCHAR(200) NOT NULL COMMENT '名称',
          fd_order INT DEFAULT 0 COMMENT '排序号',
          fd_no VARCHAR(100) COMMENT '编号',
          fd_keyword VARCHAR(100) COMMENT '关键字',
          fd_is_available TINYINT(1) DEFAULT 1 COMMENT '是否有效',
          fd_is_business TINYINT(1) DEFAULT 0 COMMENT '是否业务相关',
          fd_import_info VARCHAR(200) COMMENT '导入的数据的对应键值',
          fd_org_email VARCHAR(450) COMMENT '邮件地址',
          fd_persons_number INT DEFAULT 0 COMMENT '人员总数',
          fd_memo TEXT COMMENT '备注',
          fd_hierarchy_id VARCHAR(450) COMMENT '层级ID',
          fd_create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          fd_alter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
          fd_is_external TINYINT(1) DEFAULT 0 COMMENT '是否外部组织',
          fd_this_leaderid VARCHAR(36) COMMENT '本级领导',
          fd_super_leaderid VARCHAR(36) COMMENT '上级领导',
          fd_parentorgid VARCHAR(36) COMMENT '父机构ID',
          fd_parentid VARCHAR(36) COMMENT '上级部门ID',
          fd_name_pinyin VARCHAR(400) COMMENT '拼音名称',
          fd_name_simple_pinyin VARCHAR(100) COMMENT '名称简拼',
          fd_is_abandon TINYINT(1) DEFAULT 0 COMMENT '是否废弃',
          fd_flag_deleted VARCHAR(200) COMMENT 'OMS导入字段',
          fd_ldap_dn VARCHAR(450) COMMENT 'OMS导入字段',
          fd_pre_dept_id VARCHAR(36) COMMENT '上一个部门ID',
          fd_pre_post_ids VARCHAR(2000) COMMENT '上一个岗位ID',
          fd_creator_id VARCHAR(36) COMMENT '创建者ID',
          INDEX idx_org_type (fd_org_type),
          INDEX idx_parentid (fd_parentid),
          INDEX idx_parentorgid (fd_parentorgid),
          INDEX idx_hierarchy_id (fd_hierarchy_id),
          INDEX fd_name_pinyin (fd_name_pinyin),
          INDEX fd_name_simple_pinyin (fd_name_simple_pinyin)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,

        // 人员表
        `
        CREATE TABLE IF NOT EXISTS sys_org_person (
          fd_id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
          fd_name VARCHAR(100) NOT NULL COMMENT '姓名',
          fd_nickname VARCHAR(100) COMMENT '昵称',
          fd_no VARCHAR(50) COMMENT '编号',
          fd_dept_id VARCHAR(36) COMMENT '所在部门ID',
          fd_email VARCHAR(200) COMMENT '邮件地址',
          fd_mobile VARCHAR(50) COMMENT '手机号码',
          fd_office_phone VARCHAR(50) COMMENT '办公电话',
          fd_login_name VARCHAR(100) NOT NULL UNIQUE COMMENT '登录名',
          fd_password VARCHAR(255) COMMENT '密码',
          fd_default_language VARCHAR(50) DEFAULT 'zh-CN' COMMENT '默认语言',
          fd_keyword VARCHAR(200) COMMENT '关键字',
          fd_order INT DEFAULT 0 COMMENT '排序号',
          fd_position VARCHAR(100) COMMENT '职务',
          fd_post_id VARCHAR(36) COMMENT '所属岗位ID',
          fd_rtx_account VARCHAR(100) COMMENT 'RTX帐号',
          fd_dynamic_password VARCHAR(100) COMMENT '动态密码卡',
          fd_gender TINYINT(1) DEFAULT 1 COMMENT '性别：1=男，2=女',
          fd_wechat VARCHAR(100) COMMENT '微信号',
          fd_short_no VARCHAR(50) COMMENT '短号',
          fd_double_validation TINYINT(1) DEFAULT 0 COMMENT '双因子验证',
          fd_is_business_related TINYINT(1) DEFAULT 1 COMMENT '是否业务相关',
          fd_is_login_enabled TINYINT(1) DEFAULT 1 COMMENT '是否登录系统',
          fd_memo TEXT COMMENT '备注',
          fd_create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          fd_alter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
          fd_creator_id VARCHAR(36) COMMENT '创建者ID',
          fd_lock_time TIMESTAMP NULL COMMENT '上锁时间',
          fd_staffing_level_id VARCHAR(36) COMMENT '员工级别ID',
          fd_user_type VARCHAR(50) DEFAULT 'internal' COMMENT '用户类型',
          fd_person_to_more_dept INT DEFAULT 0 COMMENT '是否是一人多部门',
          INDEX idx_dept_id (fd_dept_id),
          INDEX idx_post_id (fd_post_id),
          INDEX idx_login_name (fd_login_name),
          INDEX fd_name (fd_name),
          FOREIGN KEY (fd_dept_id) REFERENCES sys_org_element(fd_id) ON DELETE SET NULL,
          FOREIGN KEY (fd_post_id) REFERENCES sys_org_element(fd_id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,

        // 岗位人员关联表
        `
        CREATE TABLE IF NOT EXISTS sys_org_post_person (
          fd_id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
          fd_post_id VARCHAR(36) NOT NULL COMMENT '岗位ID',
          fd_person_id VARCHAR(36) NOT NULL COMMENT '人员ID',
          fd_create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          fd_creator_id VARCHAR(36) COMMENT '创建者ID',
          INDEX idx_post_id (fd_post_id),
          INDEX idx_person_id (fd_person_id),
          UNIQUE KEY uk_post_person (fd_post_id, fd_person_id),
          FOREIGN KEY (fd_post_id) REFERENCES sys_org_element(fd_id) ON DELETE CASCADE,
          FOREIGN KEY (fd_person_id) REFERENCES sys_org_person(fd_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `,

        // 职务级别表
        `
        CREATE TABLE IF NOT EXISTS sys_org_staffing_level (
          fd_id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
          fd_name VARCHAR(200) NOT NULL COMMENT '职务名称',
          fd_level INT NOT NULL COMMENT '职务级别',
          fd_description VARCHAR(1500) COMMENT '描述',
          fd_is_default TINYINT(1) DEFAULT 0 COMMENT '是否默认',
          fd_is_available TINYINT(1) DEFAULT 1 COMMENT '是否有效',
          doc_create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          doc_alter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
          doc_creator_id VARCHAR(36) COMMENT '创建者ID',
          fd_import_info VARCHAR(200) COMMENT '导入的数据的对应键值',
          INDEX idx_level (fd_level)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `
      ];

      // 执行表创建
      const results: string[] = [];
      for (const sql of tables) {
        try {
          await dbManager.query(sql);
          results.push('成功');
        } catch (error: any) {
          results.push(`失败: ${error.message}`);
        }
      }

      // 插入初始化数据
      try {
        // 插入根机构
        await dbManager.query(`
          INSERT IGNORE INTO sys_org_element (fd_id, fd_org_type, fd_name, fd_order, fd_no, fd_is_available, fd_is_business, fd_memo)
          VALUES (?, 1, ?, 0, ?, 1, 1, ?)
        `, [crypto.randomUUID(), '未来办公集团', 'ORG001', '根机构']);

        // 插入职务级别
        const levels = ['普通员工', '组长', '主管', '经理', '总监', '副总经理', '总经理'];
        for (let i = 0; i < levels.length; i++) {
          await dbManager.query(`
            INSERT IGNORE INTO sys_org_staffing_level (fd_id, fd_name, fd_level, fd_is_default, fd_is_available)
            VALUES (?, ?, ?, ?, 1)
          `, [crypto.randomUUID(), levels[i], i + 1, i === 0 ? 1 : 0]);
        }

        results.push('初始化数据成功');
      } catch (error: any) {
        results.push(`初始化数据失败: ${error.message}`);
      }

      return NextResponse.json({
        success: true,
        message: '数据库初始化完成',
        results
      });
    }

    return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
  } catch (error: any) {
    console.error('数据库初始化错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}
