/**
 * 审批响应格式化工具
 * 内网格式化，绝对不调用 LLM
 */

export interface FormatResult {
  text: string;
  summary?: string;
  details?: Record<string, unknown>;
}

/**
 * 格式化审批响应
 * 根据不同的 action 返回不同格式的文本
 */
export function formatApprovalResponse(action: string, data: any): string {
  switch (action) {
    case 'launch_approval':
      return formatLaunchApproval(data);

    case 'track_progress':
      return formatTrackProgress(data);

    case 'auto_approve':
      return formatAutoApprove(data);

    case 'generate_approval_form':
      return formatGenerateForm(data);

    case 'match_approval_flow':
      return formatMatchFlow(data);

    case 'ekp_launch_approval':
      return formatLaunchEKP(data);

    case 'run_auto_approve_rules':
      return formatAutoApproveCheck(data);

    case 'ekp_auto_approve':
      return formatEKPAutoApprove(data);

    case 'track_approval_progress':
      return formatTrackProgress(data);

    case 'send_approval_reminder':
      return formatSendReminder(data);

    case 'generate_approval_minutes':
      return formatGenerateMinutes(data);

    case 'sync_oa_data':
      return formatSyncData(data);

    case 'voice_to_text':
      return formatVoiceToText(data);

    default:
      return '操作成功';
  }
}

/**
 * 格式化发起审批响应
 */
function formatLaunchApproval(data: any): string {
  if (!data) return '发起审批失败';

  const { requestId, status, autoApproved } = data;

  if (autoApproved || status === 'auto_approved') {
    return `✅ 已自动发起并通过审批，单号：${requestId}`;
  } else if (status === 'pending') {
    return `📋 已成功发起审批，单号：${requestId}，等待审批`;
  } else {
    return `📝 审批已发起，单号：${requestId}，状态：${status}`;
  }
}

/**
 * 格式化进度跟踪响应
 */
function formatTrackProgress(data: any): string {
  if (!data) return '查询进度失败';

  const { currentNode, status, timeoutNodes } = data;

  if (timeoutNodes && timeoutNodes.length > 0) {
    return `⚠️ 当前进度：${currentNode}，发现 ${timeoutNodes.length} 个超时节点，已发送催办`;
  }

  return `📊 当前进度：${currentNode}`;
}

/**
 * 格式化自动审批响应
 */
function formatAutoApprove(data: any): string {
  if (!data) return '自动审批失败';

  const { status, requestId } = data;

  if (status === 'auto_approved') {
    return `✅ 已自动审批通过，单号：${requestId}`;
  } else {
    return `⏳ 自动审批处理中，单号：${requestId}`;
  }
}

/**
 * 格式化生成表单响应
 */
function formatGenerateForm(data: any): string {
  if (!data) return '生成表单失败';

  const { templateId } = data;
  return `📝 已生成审批表单，模板ID：${templateId}`;
}

/**
 * 格式化匹配流程响应
 */
function formatMatchFlow(data: any): string {
  if (!data) return '匹配流程失败';

  const { flowCode, nodes } = data;
  return `🔄 已匹配审批流程，流程编码：${flowCode}，审批节点：${nodes.join(' → ')}`;
}

/**
 * 格式化发起EKP响应
 */
function formatLaunchEKP(data: any): string {
  if (!data) return '发起EKP审批失败';

  const { requestId, status } = data;
  return `📤 EKP审批已发起，单号：${requestId}，状态：${status}`;
}

/**
 * 格式化自动审批检查响应
 */
function formatAutoApproveCheck(data: any): string {
  if (!data) return '检查自动审批规则失败';

  const { canAutoApprove } = data;

  if (canAutoApprove) {
    return '✅ 符合自动审批条件，将自动审批';
  } else {
    return '❌ 不符合自动审批条件，需要人工审批';
  }
}

/**
 * 格式化EKP自动审批响应
 */
function formatEKPAutoApprove(data: any): string {
  if (!data) return 'EKP自动审批失败';

  const { requestId, status, approvedAt } = data;

  if (status === 'auto_approved') {
    return `✅ EKP已自动审批通过，单号：${requestId}，审批时间：${approvedAt}`;
  } else {
    return `⏳ EKP自动审批处理中，单号：${requestId}`;
  }
}

/**
 * 格式化发送提醒响应
 */
function formatSendReminder(data: any): string {
  if (!data) return '发送提醒失败';

  const { success, message, sentCount } = data;

  if (success) {
    return `🔔 ${message}，已发送 ${sentCount} 条提醒`;
  } else {
    return `❌ 发送提醒失败：${message}`;
  }
}

/**
 * 格式化生成纪要响应
 */
function formatGenerateMinutes(data: any): string {
  if (!data) return '生成审批纪要失败';

  const { requestId, content, summary } = data;
  return `📄 审批纪要已生成，单号：${requestId}\n摘要：${summary}`;
}

/**
 * 格式化同步数据响应
 */
function formatSyncData(data: any): string {
  if (!data) return '同步OA数据失败';

  const { requestId, syncStatus, syncedAt } = data;

  if (syncStatus === 'done') {
    return `🔄 OA数据同步完成，单号：${requestId}，同步时间：${syncedAt}`;
  } else {
    return `⏳ OA数据同步中，单号：${requestId}`;
  }
}

/**
 * 格式化语音转文字响应
 */
function formatVoiceToText(data: any): string {
  if (!data) return '语音转文字失败';

  const { text, confidence } = data;

  return `🎤 语音识别结果：${text}（置信度：${Math.round(confidence * 100)}%）`;
}
