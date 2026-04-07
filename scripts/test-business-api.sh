#!/bin/bash

# 未来办公系统 - 业务接口测试脚本
# 用于测试标准化的业务接口

set -e

# 配置
API_BASE_URL="http://localhost:5000"
USER_ID="00000000-0000-0000-0000-000000000001"
USER_ROLE="admin"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印函数
print_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_test() {
    echo ""
    echo -e "${YELLOW}测试: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 打印响应
print_response() {
    echo ""
    echo "响应:"
    echo "$1" | jq '.' 2>/dev/null || echo "$1"
    echo ""
}

# ========================================
# 测试 1: EKP 待办查询接口
# ========================================
print_section "测试 EKP 待办查询接口"

print_test "查询所有待办"
RESPONSE=$(curl -s -X GET \
  "${API_BASE_URL}/api/ekp/todo/list?page=1&pageSize=20&todoType=0" \
  -H 'Content-Type: application/json' \
  -H "X-User-ID: ${USER_ID}" \
  -H "X-User-Role: ${USER_ROLE}")

if echo "$RESPONSE" | jq -e '.code == "200"' > /dev/null; then
    print_success "查询成功"
    print_response "$RESPONSE"
else
    print_error "查询失败"
    print_response "$RESPONSE"
fi

print_test "查询审批类待办"
RESPONSE=$(curl -s -X GET \
  "${API_BASE_URL}/api/ekp/todo/list?page=1&pageSize=20&todoType=1" \
  -H 'Content-Type: application/json' \
  -H "X-User-ID: ${USER_ID}" \
  -H "X-User-Role: ${USER_ROLE}")

if echo "$RESPONSE" | jq -e '.code == "200"' > /dev/null; then
    print_success "查询成功"
    print_response "$RESPONSE"
else
    print_error "查询失败"
    print_response "$RESPONSE"
fi

# ========================================
# 测试 2: EKP 待办审批接口
# ========================================
print_section "测试 EKP 待办审批接口"

print_test "审批待办（使用测试ID）"
RESPONSE=$(curl -s -X POST \
  "${API_BASE_URL}/api/ekp/todo/test-123/approve" \
  -H 'Content-Type: application/json' \
  -H "X-User-ID: ${USER_ID}" \
  -H "X-User-Role: ${USER_ROLE}" \
  -d '{
    "data": {
      "comment": "同意"
    },
    "remark": "审批通过"
  }')

# 注意：这个可能会失败，因为测试ID可能不存在
print_response "$RESPONSE"

# ========================================
# 测试 3: 会议创建接口
# ========================================
print_section "测试会议创建接口"

print_test "创建会议"
RESPONSE=$(curl -s -X POST \
  "${API_BASE_URL}/api/meeting/create" \
  -H 'Content-Type: application/json' \
  -H "X-User-ID: ${USER_ID}" \
  -H "X-User-Role: ${USER_ROLE}" \
  -d '{
    "data": {
      "title": "项目周会",
      "startTime": "2024-12-25 14:00:00",
      "endTime": "2024-12-25 16:00:00",
      "location": "会议室A",
      "participants": ["user1", "user2"],
      "description": "每周例行会议",
      "reminder": true
    },
    "remark": "每周例行会议"
  }')

if echo "$RESPONSE" | jq -e '.code == "200"' > /dev/null; then
    print_success "创建成功"
    MEETING_ID=$(echo "$RESPONSE" | jq -r '.data.meetingId')
    print_response "$RESPONSE"

    # 测试时间冲突
    print_test "创建冲突会议（测试时间冲突）"
    RESPONSE=$(curl -s -X POST \
      "${API_BASE_URL}/api/meeting/create" \
      -H 'Content-Type: application/json' \
      -H "X-User-ID: ${USER_ID}" \
      -H "X-User-Role: ${USER_ROLE}" \
      -d '{
        "data": {
          "title": "冲突会议",
          "startTime": "2024-12-25 15:00:00",
          "endTime": "2024-12-25 15:30:00",
          "location": "会议室A",
          "participants": ["user1"]
        }
      }')

    if echo "$RESPONSE" | jq -e '.code == "409"' > /dev/null; then
        print_success "时间冲突检测正常"
        print_response "$RESPONSE"
    else
        print_error "时间冲突检测失败"
        print_response "$RESPONSE"
    fi
else
    print_error "创建失败"
    print_response "$RESPONSE"
fi

# ========================================
# 测试 4: 权限测试
# ========================================
print_section "测试权限校验"

print_test "未登录用户访问"
RESPONSE=$(curl -s -X GET \
  "${API_BASE_URL}/api/ekp/todo/list" \
  -H 'Content-Type: application/json')

if echo "$RESPONSE" | jq -e '.code == "403"' > /dev/null; then
    print_success "权限拦截正常"
    print_response "$RESPONSE"
else
    print_error "权限拦截失败"
    print_response "$RESPONSE"
fi

# ========================================
# 测试 5: 错误处理测试
# ========================================
print_section "测试错误处理"

print_test "缺少必填参数"
RESPONSE=$(curl -s -X POST \
  "${API_BASE_URL}/api/meeting/create" \
  -H 'Content-Type: application/json' \
  -H "X-User-ID: ${USER_ID}" \
  -H "X-User-Role: ${USER_ROLE}" \
  -d '{
    "data": {
      "title": "缺少参数会议"
    }
  }')

if echo "$RESPONSE" | jq -e '.code == "400"' > /dev/null; then
    print_success "参数校验正常"
    print_response "$RESPONSE"
else
    print_error "参数校验失败"
    print_response "$RESPONSE"
fi

print_test "时间参数错误"
RESPONSE=$(curl -s -X POST \
  "${API_BASE_URL}/api/meeting/create" \
  -H 'Content-Type: application/json' \
  -H "X-User-ID: ${USER_ID}" \
  -H "X-User-Role: ${USER_ROLE}" \
  -d '{
    "data": {
      "title": "时间错误会议",
      "startTime": "2024-12-25 16:00:00",
      "endTime": "2024-12-25 14:00:00",
      "location": "会议室B"
    }
  }')

if echo "$RESPONSE" | jq -e '.code == "400"' > /dev/null; then
    print_success "时间校验正常"
    print_response "$RESPONSE"
else
    print_error "时间校验失败"
    print_response "$RESPONSE"
fi

# ========================================
# 完成
# ========================================
print_section "测试完成"
echo "所有测试执行完毕"
