#!/bin/bash

# ================================================
# AI 智能审批系统接口测试脚本
# 测试所有 10 个技能接口和完整审批流程
# ================================================

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
BASE_URL="http://localhost:5000"
TEST_USER_ID="test-user-001"
TEST_DEPT_ID="dept-001"

# 统计变量
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 打印函数
print_test() {
    echo -e "${YELLOW}测试 ${TOTAL_TESTS}: $1${NC}"
    ((TOTAL_TESTS++))
}

print_success() {
    echo -e "${GREEN}✅ 通过: $1${NC}"
    ((PASSED_TESTS++))
}

print_error() {
    echo -e "${RED}❌ 失败: $1${NC}"
    ((FAILED_TESTS++))
}

# 测试函数
test_api() {
    local test_name=$1
    local endpoint=$2
    local method=$3
    local data=$4
    local expected_field=$5

    print_test "$test_name"

    local response
    if [ "$method" = "GET" ]; then
        response=$(curl -s -X GET "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -X POST "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    # 检查响应
    if echo "$response" | grep -q "$expected_field"; then
        print_success "$test_name"
        echo "  响应: $(echo "$response" | head -c 100)..."
    else
        print_error "$test_name"
        echo "  响应: $response"
    fi
    echo ""
}

# ================================================
# 开始测试
# ================================================
echo "=============================================="
echo "  AI 智能审批系统接口测试"
echo "  基础URL: $BASE_URL"
echo "=============================================="
echo ""

# ================================================
# 阶段1：测试基础接口（3个）
# ================================================
echo "【阶段1】测试基础接口"
echo "----------------------------------------------"

# 1. 测试生成审批表单
test_api \
    "生成审批表单（请假）" \
    "/api/approval/form/generate" \
    "POST" \
    "{\"approval_type\":\"leave\",\"userId\":\"${TEST_USER_ID}\",\"deptId\":\"${TEST_DEPT_ID}\",\"reason\":\"因事请假\",\"days\":2}" \
    "success"

# 2. 测试匹配审批流程
test_api \
    "匹配审批流程（请假）" \
    "/api/approval/flow/match" \
    "POST" \
    "{\"approval_type\":\"leave\",\"deptId\":\"${TEST_DEPT_ID}\"}" \
    "success"

# 3. 测试发起审批
test_api \
    "发起审批（请假）" \
    "/api/approval/launch" \
    "POST" \
    "{\"formData\":{\"applicantId\":\"${TEST_USER_ID}\"},\"flowNodes\":[\"dept_manager\"],\"userId\":\"${TEST_USER_ID}\"}" \
    "requestId"

echo ""

# ================================================
# 阶段2：测试自动审批接口（2个）
# ================================================
echo "【阶段2】测试自动审批接口"
echo "----------------------------------------------"

# 4. 测试检查自动审批规则
test_api \
    "检查自动审批规则（允许）" \
    "/api/approval/auto-approve/check" \
    "POST" \
    "{\"autoApproveConfig\":{\"enable\":true,\"allowTypes\":[\"leave\",\"reimbursement\",\"purchase\"],\"maxAmount\":5000},\"approval_type\":\"leave\",\"amount\":1000}" \
    "canAutoApprove"

# 5. 测试执行自动审批
test_api \
    "执行自动审批" \
    "/api/approval/auto-approve/execute" \
    "POST" \
    "{\"requestId\":\"REQ_TEST_001\",\"userId\":\"${TEST_USER_ID}\"}" \
    "status"

echo ""

# ================================================
# 阶段3：测试进度跟踪接口（2个）
# ================================================
echo "【阶段3】测试进度跟踪接口"
echo "----------------------------------------------"

# 6. 测试跟踪审批进度
test_api \
    "跟踪审批进度" \
    "/api/approval/progress/track" \
    "POST" \
    "{\"requestId\":\"REQ_TEST_001\",\"userId\":\"${TEST_USER_ID}\"}" \
    "currentNode"

# 7. 测试发送催办提醒
test_api \
    "发送催办提醒" \
    "/api/approval/reminder/send" \
    "POST" \
    "{\"nodes\":[{\"nodeId\":\"node1\",\"userId\":\"user1\"}],\"userId\":\"${TEST_USER_ID}\"}" \
    "success"

echo ""

# ================================================
# 阶段4：测试辅助功能接口（3个）
# ================================================
echo "【阶段4】测试辅助功能接口"
echo "----------------------------------------------"

# 8. 测试生成审批纪要
test_api \
    "生成审批纪要" \
    "/api/approval/minutes/generate" \
    "POST" \
    "{\"requestId\":\"REQ_TEST_001\"}" \
    "content"

# 9. 测试同步OA数据
test_api \
    "同步OA数据" \
    "/api/approval/data/sync" \
    "POST" \
    "{\"requestId\":\"REQ_TEST_001\",\"approval_type\":\"reimbursement\"}" \
    "syncStatus"

# 10. 测试语音转文字
test_api \
    "语音转文字" \
    "/api/approval/voice/transcribe" \
    "POST" \
    "{\"audioUrl\":\"https://example.com/audio.mp3\"}" \
    "text"

echo ""

# ================================================
# 测试结果统计
# ================================================
echo "=============================================="
echo "  测试结果统计"
echo "=============================================="
echo -e "总测试数: ${YELLOW}${TOTAL_TESTS}${NC}"
echo -e "通过数: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "失败数: ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有 ${FAILED_TESTS} 个测试失败，请检查！${NC}"
    exit 1
fi
