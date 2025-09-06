# Redis Installation and Configuration Guide

## Overview

Redis is an optional caching service for the Medical Device Regulatory Assistant. The application will work perfectly without Redis, but having it installed can improve performance by caching FDA API responses and other frequently accessed data.

## System Requirements

- Windows 10/11 (64-bit)
- Administrator privileges for installation
- At least 100MB free disk space

## Installation Options

### Option 1: Using Windows Subsystem for Linux (WSL) - Recommended

This is the most reliable method for running Redis on Windows.

#### Step 1: Install WSL2

1. Open PowerShell as Administrator
2. Run the following commands:

```powershell
# Enable WSL feature
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Enable Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Restart your computer
Restart-Computer
```

3. After restart, download and install the WSL2 Linux kernel update:
   - Download from: https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi
   - Run the installer

4. Set WSL2 as default:
```powershell
wsl --set-default-version 2
```

#### Step 2: Install Ubuntu

1. Open Microsoft Store
2. Search for "Ubuntu" and install "Ubuntu 22.04 LTS"
3. Launch Ubuntu and complete the initial setup (create username/password)

#### Step 3: Install Redis in Ubuntu

```bash
# Update package list
sudo apt update

# Install Redis
sudo apt install redis-server -y

# Start Redis service
sudo service redis-server start

# Enable Redis to start automatically
sudo systemctl enable redis-server

# Test Redis installation
redis-cli ping
# Should return: PONG
```

#### Step 4: Configure Redis for External Access

1. Edit Redis configuration:
```bash
sudo nano /etc/redis/redis.conf
```

2. Find and modify these lines:
```
# Change bind to allow connections from Windows
bind 127.0.0.1 0.0.0.0

# Set a password (optional but recommended)
requirepass your_secure_password_here

# Disable protected mode for development
protected-mode no
```

3. Restart Redis:
```bash
sudo service redis-server restart
```

#### Step 5: Access Redis from Windows

Redis will be available at `localhost:6379` from your Windows applications.

### Option 2: Using Docker Desktop - Alternative

If you prefer Docker:

#### Step 1: Install Docker Desktop

1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
2. Install and restart your computer
3. Start Docker Desktop

#### Step 2: Run Redis Container

```powershell
# Pull and run Redis container
docker run -d --name redis-dev -p 6379:6379 redis:7-alpine

# Test connection
docker exec -it redis-dev redis-cli ping
# Should return: PONG
```

#### Step 3: Auto-start Redis Container

Create a batch file to start Redis automatically:

```batch
@echo off
echo Starting Redis container...
docker start redis-dev
echo Redis is now running on localhost:6379
pause
```

### Option 3: Native Windows Installation - Not Recommended

Redis doesn't officially support Windows, but there are unofficial builds available. This method is not recommended for production use.

## Configuration for Medical Device Assistant

### Environment Variables

Add these to your `.env` file in the backend directory:

```env
# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379
# If you set a password:
# REDIS_URL=redis://:your_password@localhost:6379
```

### Testing Redis Connection

Use this script to test your Redis connection:

```python
# test_redis_connection.py
import asyncio
import redis.asyncio as redis
import os

async def test_redis():
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        client = redis.from_url(redis_url)
        
        # Test connection
        await client.ping()
        print("✅ Redis connection successful!")
        
        # Test basic operations
        await client.set("test_key", "test_value")
        value = await client.get("test_key")
        print(f"✅ Redis operations working: {value.decode()}")
        
        # Clean up
        await client.delete("test_key")
        await client.close()
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("💡 The application will work without Redis")

if __name__ == "__main__":
    asyncio.run(test_redis())
```

Run the test:
```powershell
cd medical-device-regulatory-assistant/backend
poetry run python test_redis_connection.py
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused Error

**Error**: `ConnectionRefusedError: [WinError 1225] The remote computer refused the network connection`

**Solutions**:
- Ensure Redis server is running
- Check if Redis is listening on the correct port (6379)
- Verify firewall settings

#### 2. WSL Redis Not Accessible from Windows

**Error**: Cannot connect to Redis from Windows application

**Solutions**:
- Ensure Redis is bound to `0.0.0.0` not just `127.0.0.1`
- Check WSL2 networking configuration
- Try using the WSL2 IP address instead of localhost

#### 3. Docker Redis Container Not Starting

**Error**: Docker container fails to start

**Solutions**:
- Ensure Docker Desktop is running
- Check if port 6379 is already in use
- Try using a different port: `docker run -d --name redis-dev -p 6380:6379 redis:7-alpine`

### Health Check Commands

```bash
# Check if Redis is running (WSL/Linux)
sudo service redis-server status

# Check Redis logs (WSL/Linux)
sudo tail -f /var/log/redis/redis-server.log

# Check Docker container status
docker ps | grep redis

# Check Docker container logs
docker logs redis-dev
```

## Performance Tuning (Optional)

For development, the default Redis configuration is sufficient. For production, consider these optimizations:

### Memory Configuration

```
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Persistence Configuration

```
# Disable persistence for development (faster)
save ""
appendonly no

# Enable persistence for production
save 900 1
save 300 10
save 60 10000
appendonly yes
```

## Graceful Degradation

The Medical Device Regulatory Assistant is designed to work without Redis. When Redis is not available:

- ✅ All core functionality remains available
- ✅ FDA API calls work normally (without caching)
- ✅ Health checks report Redis as "not_available" but system remains healthy
- ⚠️ Performance may be slower due to lack of caching
- ⚠️ No session persistence across server restarts

## Security Considerations

### Development Environment

- Use default configuration for local development
- No password required for localhost-only access
- Bind to localhost only if not sharing across network

### Production Environment

- Always set a strong password with `requirepass`
- Use TLS encryption for network connections
- Bind only to specific interfaces, not `0.0.0.0`
- Enable protected mode
- Regular security updates

## Monitoring Redis

### Basic Monitoring Commands

```bash
# Connect to Redis CLI
redis-cli

# Check server info
INFO

# Monitor commands in real-time
MONITOR

# Check memory usage
INFO memory

# List all keys (development only)
KEYS *
```

### Integration with Application

The application provides Redis monitoring through health checks:

```bash
# Check Redis health via API
curl http://localhost:8000/api/health/redis

# Expected responses:
# - "status": "connected" - Redis is working
# - "status": "not_available" - Redis not running (OK)
# - "status": "error" - Configuration issue
```

## Uninstallation

### WSL Redis
```bash
sudo apt remove redis-server -y
sudo apt autoremove -y
```

### Docker Redis
```powershell
docker stop redis-dev
docker rm redis-dev
docker rmi redis:7-alpine
```

## Support

If you encounter issues with Redis setup:

1. Check the application logs for Redis-related errors
2. Verify Redis is running with health check endpoints
3. Remember that the application works without Redis
4. For development, focus on core functionality first

The application will automatically detect Redis availability and adapt accordingly.