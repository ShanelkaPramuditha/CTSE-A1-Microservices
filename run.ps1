param(
    [string]$Action
)

$SERVICES = @(
    @{ Name = "api-gateway"; Script = "start:dev:gateway"; Port = 3000 },
    @{ Name = "user-service"; Script = "start:dev:user"; Port = 4001 },
    @{ Name = "order-service"; Script = "start:dev:order"; Port = 4002 },
    @{ Name = "product-service"; Script = "start:dev:product"; Port = 4003 },
    @{ Name = "payment-service"; Script = "start:dev:payment"; Port = 4004 }
)

$LOCAL_HOST = "127.0.0.1"

function Kill-ServicePorts {
    Write-Host "Ensuring service ports are freed..."

    foreach ($service in $SERVICES) {
        $port = $service.Port
        $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

        foreach ($conn in $connections) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

function Start-Services {
    Write-Host "Starting all services in development mode..."
    Write-Host "Using local service discovery host: $LOCAL_HOST"

    if (!(Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" | Out-Null
    }

    foreach ($service in $SERVICES) {
        Write-Host "Starting $($service.Name)..."

        $env:USER_SERVICE_HOST = $LOCAL_HOST
        $env:PRODUCT_SERVICE_HOST = $LOCAL_HOST
        $env:ORDER_SERVICE_HOST = $LOCAL_HOST
        $env:PAYMENT_SERVICE_HOST = $LOCAL_HOST

        $process = Start-Process powershell `
            -ArgumentList "-NoExit", "-Command", "pnpm run $($service.Script)" `
            -PassThru

        $process.Id | Out-File "logs/$($service.Name).pid"
    }

    Write-Host "All services are starting!"
}

function Stop-Services {
    Write-Host "Stopping all services..."

    foreach ($service in $SERVICES) {
        $pidFile = "logs/$($service.Name).pid"

        if (Test-Path $pidFile) {
            $pidValue = Get-Content $pidFile
            Write-Host "Stopping $($service.Name) PID: $pidValue"

            Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
            Remove-Item $pidFile -Force
        }
    }

    Kill-ServicePorts
    Write-Host "All services stopped."
}

function Status-Services {
    Write-Host "Service Status:"

    foreach ($service in $SERVICES) {
        $pidFile = "logs/$($service.Name).pid"

        if (Test-Path $pidFile) {
            $pidValue = Get-Content $pidFile
            $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue

            if ($process) {
                Write-Host "✅ [RUNNING] $($service.Name) PID: $pidValue"
            } else {
                Write-Host "❌ [STOPPED] $($service.Name)"
            }
        } else {
            Write-Host "❌ [STOPPED] $($service.Name)"
        }
    }
}

switch ($Action) {
    "start" { Start-Services }
    "stop" { Stop-Services }
    "restart" { Stop-Services; Start-Sleep -Seconds 2; Start-Services }
    "status" { Status-Services }
    default {
        Write-Host "Usage: .\run.ps1 {start|stop|restart|status}"
    }
}