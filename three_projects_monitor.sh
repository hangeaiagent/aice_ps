#!/bin/bash

# 三项目智能监控脚本
# 监控 NanoBanana、Admin、OrientDirector 三个项目
# 创建时间: 2025年9月23日

# 颜色定义
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m'

# 项目配置
NANOBANANA_BACKEND_PORT=3002
NANOBANANA_FRONTEND_PORT=8889
ADMIN_BACKEND_PORT=8000
ADMIN_FRONTEND_PORT=9527
ORIENT_BACKEND_PORT=8001
ORIENT_FRONTEND_PORT=3003

# 项目目录
NANOBANANA_DIR="/home/ec2-user/nanobanana"
ADMIN_DIR="/home/ec2-user/admin"
ORIENT_DIR="/home/ec2-user/OrientDirector"

# 日志配置
LOG_DIR="/home/ec2-user/logs"
mkdir -p $LOG_DIR
MONITOR_LOG="$LOG_DIR/three_projects_monitor.log"

# 记录日志
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $MONITOR_LOG
}

# 检查端口是否运行
check_port() {
    local port=$1
    lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
    return $?
}

# 检查URL是否可访问
check_url() {
    local url=$1
    local timeout=10
    curl -s -o /dev/null -w "%{http_code}" --connect-timeout $timeout "$url" | grep -q "200\|301\|302"
    return $?
}

# 重启特定项目
restart_project() {
    local project=$1
    log_message "检测到 $project 项目异常，正在重启..."
    
    case $project in
        "nanobanana")
            cd $NANOBANANA_DIR
            pkill -f "node.*server" 2>/dev/null
            sleep 2
            nohup ./start-server.sh > $LOG_DIR/nanobanana_restart.log 2>&1 &
            ;;
        "admin")
            cd $ADMIN_DIR
            pkill -f "python.*simple_main.py" 2>/dev/null
            pkill -f "python3.*app.py" 2>/dev/null
            sleep 2
            nohup ./admin_start_all_server.sh > $LOG_DIR/admin_restart.log 2>&1 &
            ;;
        "orient")
            cd $ORIENT_DIR
            source /home/ec2-user/miniconda3/etc/profile.d/conda.sh
            conda activate orient
            pkill -f "uvicorn.*main:app" 2>/dev/null
            pkill -f "python.*start_frontend" 2>/dev/null
            sleep 2
            nohup ./restart_production.sh > $LOG_DIR/orient_restart.log 2>&1 &
            ;;
    esac
    
    sleep 5
    log_message "$project 项目重启完成"
}

# 监控 NanoBanana 项目
monitor_nanobanana() {
    local issues=0
    
    # 检查后端端口
    if ! check_port $NANOBANANA_BACKEND_PORT; then
        log_message "❌ NanoBanana Backend (端口 $NANOBANANA_BACKEND_PORT) 未运行"
        issues=$((issues + 1))
    fi
    
    # 检查前端端口
    if ! check_port $NANOBANANA_FRONTEND_PORT; then
        log_message "❌ NanoBanana Frontend (端口 $NANOBANANA_FRONTEND_PORT) 未运行"
        issues=$((issues + 1))
    fi
    
    # 检查网站可访问性
    if ! check_url "https://nanobanana.gitagent.io/api/templates"; then
        log_message "❌ NanoBanana API 不可访问"
        issues=$((issues + 1))
    fi
    
    if [ $issues -gt 0 ]; then
        restart_project "nanobanana"
        return 1
    fi
    
    return 0
}

# 监控 Admin 项目
monitor_admin() {
    local issues=0
    
    # 检查后端端口
    if ! check_port $ADMIN_BACKEND_PORT; then
        log_message "❌ Admin Backend (端口 $ADMIN_BACKEND_PORT) 未运行"
        issues=$((issues + 1))
    fi
    
    # 检查前端端口
    if ! check_port $ADMIN_FRONTEND_PORT; then
        log_message "❌ Admin Frontend (端口 $ADMIN_FRONTEND_PORT) 未运行"
        issues=$((issues + 1))
    fi
    
    if [ $issues -gt 0 ]; then
        restart_project "admin"
        return 1
    fi
    
    return 0
}

# 监控 OrientDirector 项目
monitor_orient() {
    local issues=0
    
    # 检查后端端口
    if ! check_port $ORIENT_BACKEND_PORT; then
        log_message "❌ OrientDirector Backend (端口 $ORIENT_BACKEND_PORT) 未运行"
        issues=$((issues + 1))
    fi
    
    # 检查前端端口
    if ! check_port $ORIENT_FRONTEND_PORT; then
        log_message "❌ OrientDirector Frontend (端口 $ORIENT_FRONTEND_PORT) 未运行"
        issues=$((issues + 1))
    fi
    
    # 检查网站可访问性
    if ! check_url "https://doro.gitagent.io/api/health"; then
        log_message "❌ OrientDirector API 不可访问"
        issues=$((issues + 1))
    fi
    
    if [ $issues -gt 0 ]; then
        restart_project "orient"
        return 1
    fi
    
    return 0
}

# 主监控函数
main_monitor() {
    log_message "开始三项目监控检查"
    
    local total_issues=0
    
    # 监控各个项目
    if ! monitor_nanobanana; then
        total_issues=$((total_issues + 1))
    fi
    
    if ! monitor_admin; then
        total_issues=$((total_issues + 1))
    fi
    
    if ! monitor_orient; then
        total_issues=$((total_issues + 1))
    fi
    
    # 检查 Nginx 状态
    if ! systemctl is-active --quiet nginx; then
        log_message "❌ Nginx 服务未运行，正在重启..."
        sudo systemctl start nginx
        total_issues=$((total_issues + 1))
    fi
    
    if [ $total_issues -eq 0 ]; then
        log_message "✅ 所有三个项目运行正常"
    else
        log_message "⚠️ 发现 $total_issues 个项目存在问题，已自动修复"
    fi
    
    return $total_issues
}

# 执行监控
main_monitor

# 输出简要状态（用于 cron 任务）
if [ $? -eq 0 ]; then
    echo "$(date) - 所有项目正常运行"
else
    echo "$(date) - 发现并修复了一些问题"
fi
