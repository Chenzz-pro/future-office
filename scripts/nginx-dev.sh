#!/bin/bash
# Nginx + Next.js 开发环境启动脚本
# 支持热更新

set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
NGINX_PORT="${NGINX_PORT:-5000}"
NEXTJS_PORT="${NEXTJS_PORT:-5001}"

echo "========================================"
echo "  Nginx 反向代理 + Next.js 开发环境"
echo "========================================"
echo "  Nginx 端口: ${NGINX_PORT}"
echo "  Next.js 端口: ${NEXTJS_PORT}"
echo "========================================"

# 清理函数
cleanup() {
    echo "正在停止服务..."
    [[ -f /var/run/nginx.pid ]] && nginx -s quit 2>/dev/null || true
    [[ -n "${NEXTJS_PID:-}" ]] && kill "${NEXTJS_PID}" 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# 检查 Nginx 配置
echo "[1/4] 检查 Nginx 配置..."
nginx -t -c "${COZE_WORKSPACE_PATH}/nginx/nginx.conf" 2>&1 || {
    echo "ERROR: Nginx 配置验证失败"
    exit 1
}
echo "  ✓ Nginx 配置验证通过"

# 停止现有进程
echo "[2/4] 停止现有进程..."
pkill -9 nginx 2>/dev/null || true
sleep 1

# 启动 Nginx
echo "[3/4] 启动 Nginx 反向代理..."
nginx -c "${COZE_WORKSPACE_PATH}/nginx/nginx.conf" -g "daemon off;" &
NGINX_PID=$!
echo "  ✓ Nginx 已启动 (PID: ${NGINX_PID})"

sleep 2

# 启动 Next.js 开发服务器（带热更新）
echo "[4/4] 启动 Next.js 开发服务器..."
cd "${COZE_WORKSPACE_PATH}"
PORT=${NEXTJS_PORT} pnpm dev &
NEXTJS_PID=$!
echo "  ✓ Next.js 开发服务器已启动 (PID: ${NEXTJS_PID})"

sleep 5

echo ""
echo "========================================"
echo "  开发环境启动完成！"
echo "========================================"
echo "  访问地址:"
echo "  - 主系统: http://localhost:${NGINX_PORT}"
echo "  - EKP 代理: http://localhost:${NGINX_PORT}/ekp/sys/form/main.jsp"
echo "  - Next.js: http://localhost:${NEXTJS_PORT}"
echo "========================================"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo ""

# 等待所有进程
wait
