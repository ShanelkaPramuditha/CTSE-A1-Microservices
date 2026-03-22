#!/bin/bash

# Define services based on the package.json scripts
SERVICES=("api-gateway" "user-service" "order-service" "product-service" "payment-service")
SERVICE_PORTS=(3000 4001 4002 4003 4004 4005)
LOCAL_HOST="127.0.0.1"

kill_service_ports() {
    echo "Ensuring service ports are freed"
    local pids
    pids=$(lsof -tiTCP:3000,4001,4002,4003,4004,4005 -sTCP:LISTEN)

    if [ -n "$pids" ]; then
        echo "$pids" | xargs -r kill -9
    fi
}

start_services() {
    echo "Starting all services in development mode..."
    echo "Using local service discovery host: $LOCAL_HOST"
    mkdir -p logs

    for service in "${SERVICES[@]}"; do
        case $service in
            api-gateway) script="start:dev:gateway" ;;
            user-service) script="start:dev:user" ;;
            product-service) script="start:dev:product" ;;
            order-service) script="start:dev:order" ;;
            payment-service) script="start:dev:payment" ;;
        esac
        
        echo "Starting $service..."
        nohup env \
            USER_SERVICE_HOST="$LOCAL_HOST" \
            PRODUCT_SERVICE_HOST="$LOCAL_HOST" \
            ORDER_SERVICE_HOST="$LOCAL_HOST" \
            PAYMENT_SERVICE_HOST="$LOCAL_HOST" \
            pnpm run "$script" > "logs/$service.log" 2>&1 &
        echo $! > "logs/$service.pid"
    done
    
    echo "All services are starting up! Check logs in the 'logs' folder."
    echo "Run './manage-services.sh logs' to tail all logs."
}

stop_services() {
    echo "Stopping all services..."
    if [ ! -d "logs" ]; then
        echo "Logs directory not found. Are services running?"
        kill_service_ports
        return
    fi
    for service in "${SERVICES[@]}"; do
        if [ -f "logs/$service.pid" ]; then
            pid=$(cat "logs/$service.pid")
            echo "Stopping $service (PID: $pid)..."
            # Kill process and its tree
            pkill -P $pid 2>/dev/null || :
            kill $pid 2>/dev/null || :
            rm "logs/$service.pid"
        else
            echo "No PID file found for $service"
        fi
    done

    kill_service_ports
    echo "All services stopped."
}

status_services() {
    echo "Service Status:"
    for service in "${SERVICES[@]}"; do
        if [ -f "logs/$service.pid" ]; then
            pid=$(cat "logs/$service.pid")
            if ps -p $pid > /dev/null; then
                echo -e "  ✅ [RUNNING] $service (PID: $pid)"
            else
                echo -e "  ❌ [STOPPED] $service (PID $pid found, but process is dead)"
            fi
        else
            echo -e "  ❌ [STOPPED] $service"
        fi
    done
}

case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    status)
        status_services
        ;;
    restart)
        stop_services
        sleep 2
        start_services
        ;;
    logs)
        if ls logs/*.log 1> /dev/null 2>&1; then
            tail -f logs/*.log
        else
            echo "No logs found."
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo "Examples:"
        echo "  $0 start    - Starts all microservices in the background"
        echo "  $0 stop     - Stops all running microservices"
        echo "  $0 status   - Shows the status of all microservices"
        echo "  $0 logs     - Tails the logs of all microservices"
        exit 1
esac
