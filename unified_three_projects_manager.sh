#!/bin/bash

# 三项目统一管理脚本
# 管理 NanoBanana、Admin、OrientDirector 三个项目
# 创建时间: 2025年9月23日

# 颜色定义
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
PURPLE='\\033[0;35m'
CYAN='\\033[0;36m'
WHITE='\\033[1;37m'
NC='\\033[0m' # No Color

# 项目配置
NANOBANANA_DIR="/home/ec2-user/nanobanana"
ADMIN_DIR="/home/ec2-user/admin"
ORIENT_DIR="/home/ec2-user/OrientDirector"

# 端口配置
NANOBANANA_BACKEND_PORT=3002
NANOBANANA_FRONTEND_PORT=8889
ADMIN_BACKEND_PORT=8000
ADMIN_FRONTEND_PORT=9527
ORIENT_BACKEND_PORT=8001
ORIENT_FRONTEND_PORT=3003

# 日志文件
LOG_DIR="/home/ec2-user/logs"
mkdir -p $LOG_DIR
UNIFIED_LOG="$LOG_DIR/unified_manager.log"

# 记录日志函数
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $UNIFIED_LOG
    echo -e "$1"
}

# 检查端口占用
check_port() {
    local port=$1
    local service_name=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $service_name (端口 $port) 正在运行"
        return 0
    else
        echo -e "${RED}✗${NC} $service_name (端口 $port) 未运行"
        return 1
    fi
}

# 强制停止端口进程
kill_port_process() {
    local port=$1
    local service_name=$2
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}🔄${NC} 停止 $service_name (端口 $port)..."
        echo $pids | xargs kill -9 2>/dev/null
        sleep 2
        log_message "已停止 $service_name (端口 $port)"
    fi
}

# 启动 NanoBanana 项目
start_nanobanana() {
    echo -e "${CYAN}🚀 启动 NanoBanana 项目...${NC}"
    log_message "开始启动 NanoBanana 项目"
    
    cd $NANOBANANA_DIR
    if [ -f "start-server.sh" ]; then
        nohup ./start-server.sh > $LOG_DIR/nanobanana.log 2>&1 &
        sleep 3
        log_message "NanoBanana 启动脚本已执行"
    else
        echo -e "${RED}❌ NanoBanana 启动脚本不存在${NC}"
        return 1
    fi
}

# 启动 Admin 项目
start_admin() {
    echo -e "${PURPLE}🚀 启动 Admin 项目...${NC}"
    log_message "开始启动 Admin 项目"
    
    cd $ADMIN_DIR
    if [ -f "admin_start_all.sh" ]; then
        nohup ./admin_start_all.sh > $LOG_DIR/admin.log 2>&1 &
        sleep 3
        log_message "Admin 启动脚本已执行"
    else
        echo -e "${RED}❌ Admin 启动脚本不存在${NC}"
        return 1
    fi
}

# 启动 OrientDirector 项目
start_orient() {
    echo -e "${BLUE}🚀 启动 OrientDirector 项目...${NC}"
    log_message "开始启动 OrientDirector 项目"
    
    cd $ORIENT_DIR
    # 激活conda环境
    source /home/ec2-user/miniconda3/etc/profile.d/conda.sh
    conda activate orient
    
    if [ -f "restart_production.sh" ]; then
        nohup ./restart_production.sh > $LOG_DIR/orient.log 2>&1 &
        sleep 3
        log_message "OrientDirector 启动脚本已执行"
    else
        echo -e "${RED}❌ OrientDirector 启动脚本不存在${NC}"
        return 1
    fi
}

# 停止 NanoBanana 项目
stop_nanobanana() {
    echo -e "${CYAN}🛑 停止 NanoBanana 项目...${NC}"
    kill_port_process $NANOBANANA_BACKEND_PORT "NanoBanana Backend"
    kill_port_process $NANOBANANA_FRONTEND_PORT "NanoBanana Frontend"
    log_message "NanoBanana 项目已停止"
}

# 停止 Admin 项目
stop_admin() {
    echo -e "${PURPLE}🛑 停止 Admin 项目...${NC}"
    cd $ADMIN_DIR
    if [ -f "admin_server_stop.sh" ]; then
        ./admin_server_stop.sh
    fi
    kill_port_process $ADMIN_BACKEND_PORT "Admin Backend"
    kill_port_process $ADMIN_FRONTEND_PORT "Admin Frontend"
    log_message "Admin 项目已停止"
}

# 停止 OrientDirector 项目
stop_orient() {
    echo -e "${BLUE}🛑 停止 OrientDirector 项目...${NC}"
    cd $ORIENT_DIR
    if [ -f "stop_production.sh" ]; then
        ./stop_production.sh
    fi
    kill_port_process $ORIENT_BACKEND_PORT "OrientDirector Backend"
    kill_port_process $ORIENT_FRONTEND_PORT "OrientDirector Frontend"
    log_message "OrientDirector 项目已停止"
}

# 检查所有服务状态
check_all_status() {
    echo -e "${WHITE}📊 三项目服务状态检查${NC}"
    echo "=================================="
    
    echo -e "${CYAN}NanoBanana 项目:${NC}"
    check_port $NANOBANANA_BACKEND_PORT "NanoBanana Backend"
    check_port $NANOBANANA_FRONTEND_PORT "NanoBanana Frontend"
    
    echo -e "${PURPLE}Admin 项目:${NC}"
    check_port $ADMIN_BACKEND_PORT "Admin Backend"
    check_port $ADMIN_FRONTEND_PORT "Admin Frontend"
    
    echo -e "${BLUE}OrientDirector 项目:${NC}"
    check_port $ORIENT_BACKEND_PORT "OrientDirector Backend"
    check_port $ORIENT_FRONTEND_PORT "OrientDirector Frontend"
    
    echo "=================================="
    echo -e "${WHITE}访问地址:${NC}"
    echo -e "${CYAN}🌐 NanoBanana: https://nanobanana.gitagent.io${NC}"
    echo -e "${PURPLE}🌐 Admin: http://98.90.28.95:9527${NC}"
    echo -e "${BLUE}🌐 OrientDirector: https://spot.gitagent.io${NC}"
    
    # 检查 Nginx 状态
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓${NC} Nginx 服务正常运行"
    else
        echo -e "${RED}✗${NC} Nginx 服务未运行"
    fi
}

# 启动所有项目
start_all() {
    echo -e "${WHITE}🚀 启动所有三个项目${NC}"
    log_message "开始启动所有三个项目"
    
    start_nanobanana
    sleep 2
    start_admin
    sleep 2
    start_orient
    sleep 5
    
    echo -e "${GREEN}✅ 所有项目启动完成！${NC}"
    check_all_status
}

# 停止所有项目
stop_all() {
    echo -e "${WHITE}🛑 停止所有三个项目${NC}"
    log_message "开始停止所有三个项目"
    
    stop_orient
    sleep 2
    stop_admin
    sleep 2
    stop_nanobanana
    
    echo -e "${GREEN}✅ 所有项目已停止！${NC}"
}

# 重启所有项目
restart_all() {
    echo -e "${WHITE}🔄 重启所有三个项目${NC}"
    log_message "开始重启所有三个项目"
    
    stop_all
    sleep 5
    start_all
}

# 显示帮助信息
show_help() {
    echo -e "${WHITE}三项目统一管理脚本${NC}"
    echo "=================================="
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start     启动所有三个项目"
    echo "  stop      停止所有三个项目"
    echo "  restart   重启所有三个项目"
    echo "  status    检查所有项目状态"
    echo "  help      显示此帮助信息"
    echo ""
    echo "项目信息:"
    echo "  NanoBanana    - 后端:3002, 前端:8889"
    echo "  Admin         - 后端:8000, 前端:9527"
    echo "  OrientDirector- 后端:8001, 前端:3003"
    echo ""
    echo "默认操作: 如果不提供参数，将执行重启操作"
}

# 主逻辑
case "${1:-restart}" in
    "start")
        start_all
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        restart_all
        ;;
    "status")
        check_all_status
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}❌ 未知命令: $1${NC}"
        show_help
        exit 1
        ;;
esac

log_message "脚本执行完成: $1"
