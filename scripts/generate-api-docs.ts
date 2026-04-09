/**
 * 生成接口文档 Excel 文件
 */

import * as XLSX from 'xlsx';
import { API_DOCS } from './api-docs.js';

function generateExcel() {
  // 创建一个新的工作簿
  const workbook = XLSX.utils.book_new();

  // ========== 工作表1: 接口总览 ==========
  const overviewData = [
    ['序号', '模块', '路径', '方法', '功能说明', '备注'],
  ];

  API_DOCS.forEach((api, index) => {
    overviewData.push([
      String(index + 1),
      api.category,
      api.path,
      api.method,
      api.description,
      api.notes || '',
    ]);
  });

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);

  // 设置列宽
  overviewSheet['!cols'] = [
    { wch: 6 },    // 序号
    { wch: 18 },   // 模块
    { wch: 40 },   // 路径
    { wch: 8 },    // 方法
    { wch: 50 },   // 功能说明
    { wch: 30 },   // 备注
  ];

  XLSX.utils.book_append_sheet(workbook, overviewSheet, '接口总览');

  // ========== 工作表2: 详细接口文档 ==========
  const detailData = [
    ['序号', '模块', '路径', '方法', '功能说明', '参数名称', '参数类型', '是否必填', '参数说明', '返回字段', '字段类型', '字段说明', '备注'],
  ];

  let detailIndex = 0;
  API_DOCS.forEach((api) => {
    // 找出最大的参数数量和返回数量
    const maxParams = Math.max(api.params.length, 1);
    const maxReturns = Math.max(api.returns.length, 1);

    for (let i = 0; i < Math.max(maxParams, maxReturns); i++) {
      detailIndex++;
      const param = api.params[i] || { name: '', type: '', required: false, description: '' };
      const ret = api.returns[i] || { field: '', type: '', description: '' };

      detailData.push([
        String(detailIndex),
        api.category,
        api.path,
        api.method,
        api.description,
        param.name,
        param.type,
        param.required ? '是' : '否',
        param.description,
        ret.field,
        ret.type,
        ret.description,
        i === 0 ? (api.notes || '') : '',
      ]);
    }
  });

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);

  // 设置列宽
  detailSheet['!cols'] = [
    { wch: 6 },    // 序号
    { wch: 18 },   // 模块
    { wch: 35 },   // 路径
    { wch: 8 },    // 方法
    { wch: 40 },   // 功能说明
    { wch: 18 },   // 参数名称
    { wch: 12 },   // 参数类型
    { wch: 8 },    // 是否必填
    { wch: 30 },   // 参数说明
    { wch: 20 },   // 返回字段
    { wch: 12 },   // 字段类型
    { wch: 30 },   // 字段说明
    { wch: 30 },   // 备注
  ];

  XLSX.utils.book_append_sheet(workbook, detailSheet, '详细接口文档');

  // ========== 工作表3: 按模块分类 ==========
  const categories = [...new Set(API_DOCS.map(api => api.category))];
  const categorySheets: { [key: string]: any[][] } = {};

  categories.forEach(cat => {
    const catData = [
      ['序号', '路径', '方法', '功能说明', '请求参数', '返回参数', '备注'],
    ];

    API_DOCS.filter(api => api.category === cat).forEach((api, index) => {
      const paramsStr = api.params
        .map(p => `${p.name}(${p.type}${p.required ? ',必填' : ',选填'}): ${p.description}`)
        .join('\n');

      const returnsStr = api.returns
        .map(r => `${r.field}(${r.type}): ${r.description}`)
        .join('\n');

      catData.push([
        String(index + 1),
        api.path,
        api.method,
        api.description,
        paramsStr,
        returnsStr,
        api.notes || '',
      ]);
    });

    categorySheets[cat] = catData;
  });

  // 添加每个分类的工作表
  Object.entries(categorySheets).forEach(([cat, data]) => {
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = [
      { wch: 6 },    // 序号
      { wch: 40 },   // 路径
      { wch: 8 },    // 方法
      { wch: 35 },   // 功能说明
      { wch: 50 },   // 请求参数
      { wch: 50 },   // 返回参数
      { wch: 25 },   // 备注
    ];
    // 工作表名称限制为31个字符
    const sheetName = cat.length > 28 ? cat.substring(0, 28) : cat;
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  });

  // ========== 工作表4: EKP同步接口专用文档 ==========
  const ekpSyncData = [
    ['EKP组织架构同步接口说明'],
    [],
    ['接口名称', 'getUpdatedElements - 获取需要更新的组织架构信息'],
    ['功能说明', '获取蓝凌EKP组织架构全量/增量数据，这是组织架构同步的主接口'],
    ['接口路径', '/api/sys-organization/sysSynchroGetOrg/getUpdatedElements'],
    ['认证方式', 'Basic Auth'],
    ['Content-Type', 'application/json'],
    [],
    ['请求参数'],
    ['参数名', '类型', '必填', '说明'],
    ['returnOrgType', 'string(JSON数组)', '否', '组织类型过滤，如：[{"type":"org"},{"type":"dept"},{"type":"person"}]，可选值：org/dept/group/post/person'],
    ['count', 'int', '是', '每次获取的条目数，建议500'],
    ['beginTimeStamp', 'string', '否', '开始时间戳，格式：yyyy-MM-dd HH:mm:ss.SSS，用于增量同步'],
    [],
    ['返回参数'],
    ['字段名', '类型', '说明'],
    ['returnState', 'int', '返回状态：0未操作 1失败 2成功'],
    ['message', 'string/array', '返回的组织架构信息JSON数组'],
    ['count', 'int', '本次返回的条目数'],
    ['timeStamp', 'string', '本次调用后的时间戳（用于继续分页获取）'],
    [],
    ['message数组元素字段'],
    ['字段名', '类型', '说明'],
    ['id', 'string', '唯一标识'],
    ['lunid', 'string', '唯一标示（可作为数据主键）'],
    ['name', 'string', '名称'],
    ['type', 'string', '组织架构类型：org/dept/group/post/person'],
    ['no', 'string', '编号'],
    ['order', 'string', '排序号'],
    ['keyword', 'string', '关键字'],
    ['memo', 'string', '说明'],
    ['isAvailable', 'boolean', '是否有效（决定是否删除）'],
    ['parent', 'string', '父部门ID（org/dept/post/person类型有）'],
    ['thisLeader', 'string', '部门领导（org/dept/post类型有）'],
    ['superLeader', 'string', '上级领导（org/dept类型有）'],
    ['loginName', 'string', '登录名（person类型有）'],
    ['mobileNo', 'string', '手机号（person类型有）'],
    ['email', 'string', '邮箱（person类型有）'],
    ['rtx', 'string', 'RTX账号（person类型有）'],
    [],
    ['分页逻辑'],
    ['说明', '当返回的count >= 请求的count时，表示还有更多数据，需要继续调用'],
    ['继续获取', '使用上次返回的timeStamp作为新的beginTimeStamp继续调用，直到count < 请求count'],
    [],
    ['相关接口'],
    ['接口名称', '路径', '说明'],
    ['getElementsBaseInfo', '/api/sys-organization/sysSynchroGetOrg/getElementsBaseInfo', '获取所有组织架构基本信息（用于异构系统对应）'],
    ['getUpdatedElementsByToken', '/api/sys-organization/sysSynchroGetOrg/getUpdatedElementsByToken', '分页获取（按token分页，适合大批量更新）'],
    [],
    ['系统内部使用'],
    ['接口路径', '/api/organization/sync?source=ekp'],
    ['说明', '这是本系统的组织架构同步入口，内部调用上述EKP接口'],
  ];

  const ekpSyncSheet = XLSX.utils.aoa_to_sheet(ekpSyncData);
  ekpSyncSheet['!cols'] = [
    { wch: 20 },
    { wch: 80 },
  ];

  XLSX.utils.book_append_sheet(workbook, ekpSyncSheet, 'EKP同步接口说明');

  // 保存文件
  XLSX.writeFile(workbook, '系统接口文档.xlsx');
  console.log('Excel文档已生成: 系统接口文档.xlsx');
}

generateExcel();
