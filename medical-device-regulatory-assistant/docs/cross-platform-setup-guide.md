# Cross-Platform Setup Guide

## Overview

The Medical Device Regulatory Assistant is designed to work across Windows, Linux, and macOS. This guide provides platform-specific setup instructions and troubleshooting information.

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores, 2.0 GHz
- **RAM**: 4 GB (8 GB recommended)
- **Storage**: 2 GB free space
- **Network**: Internet connection for FDA API access

### Software Requirements
- **Node.js**: 18.0 or higher
- **Python**: 3.8 or higher
- **Git**: Latest version

## Platform-Specific Setup

### Windows Setup

#### Prerequisites
1. **Install Node.js**
   ```powershell
   # Download from https://nodejs.org/
   # Or use Chocolatey
   choco install nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

2. **Install Python**
   ```powershell
   # Download from https://python.org/
   # Or use Chocolatey
   choco install python
   
   # Verify installation
   python --version
   pip --version
   ```

3. **Install Poetry**
   ```powershell
   # Using pip
   pip install poetry
   
   # Or using the official installer
   (Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
   
   # Verify installation
   poetry --version
   ```

4. **Install pnpm**
   ```powershell
   npm install -g pnpm
   pnpm --version
   ```

#### Running the Application
```powershell
# Start both services
.\start-dev.ps1

# Start individual services
.\start-backend.ps1
.\start-frontend.ps1

# With custom ports
.\start-backend.ps1 -Port 8001
.\start-frontend.ps1 -Port 3001
```

#### Windows-Specific Features
- PowerShell scripts with advanced error handling
- Windows Service integration support
- Windows Task Scheduler integration
- Windows Event Log integration

### Linux Setup (Ubuntu/Debian)

#### Prerequisites
1. **Update system packages**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js**
   ```bash
   # Using NodeSource repository
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

3. **Install Python and pip**
   ```bash
   sudo apt install python3 python3-pip python3-venv -y
   
   # Verify installation
   python3 --version
   pip3 --version
   ```

4. **Install Poetry**
   ```bash
   # Using the official installer
   curl -sSL https://install.python-poetry.org | python3 -
   
   # Add to PATH (add to ~/.bashrc or ~/.zshrc)
   export PATH="$HOME/.local/bin:$PATH"
   
   # Verify installation
   poetry --version
   ```

5. **Install pnpm**
   ```bash
   npm install -g pnpm
   pnpm --version
   ```

#### Running the Application
```bash
# Make scripts executable
chmod +x start-dev.sh start-backend.sh start-frontend.sh

# Start both services
./start-dev.sh

# Start individual services
./start-backend.sh
./start-frontend.sh

# With custom ports
./start-backend.sh --port 8001
./start-frontend.sh --port 3001
```

#### Linux-Specific Features
- Systemd service integration
- Cron job scheduling
- Linux process management
- Better resource monitoring

### macOS Setup

#### Prerequisites
1. **Install Homebrew** (recommended)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Node.js**
   ```bash
   # Using Homebrew
   brew install node
   
   # Or download from https://nodejs.org/
   
   # Verify installation
   node --version
   npm --version
   ```

3. **Install Python**
   ```bash
   # Using Homebrew
   brew install python
   
   # Verify installation
   python3 --version
   pip3 --version
   ```

4. **Install Poetry**
   ```bash
   # Using Homebrew
   brew install poetry
   
   # Or using the official installer
   curl -sSL https://install.python-poetry.org | python3 -
   
   # Verify installation
   poetry --version
   ```

5. **Install pnpm**
   ```bash
   npm install -g pnpm
   pnpm --version
   ```

#### Running the Application
```bash
# Make scripts executable
chmod +x start-dev.sh start-backend.sh start-frontend.sh

# Start both services
./start-dev.sh

# Start individual services
./start-backend.sh
./start-frontend.sh

# With custom ports
./start-backend.sh --port 8001
./start-frontend.sh --port 3001
```

#### macOS-Specific Features
- LaunchDaemon integration
- macOS notification support
- Keychain integration potential
- Better memory management

## Script Comparison

### Windows PowerShell Scripts
- `start-dev.ps1` - Main development startup script
- `start-backend.ps1` - Backend-only startup
- `start-frontend.ps1` - Frontend-only startup
- Advanced error handling and logging
- Windows-specific port checking
- PowerShell-native features

### Linux/macOS Bash Scripts
- `start-dev.sh` - Main development startup script
- `start-backend.sh` - Backend-only startup
- `start-frontend.sh` - Frontend-only startup
- POSIX-compliant shell scripting
- Unix-style process management
- Cross-platform compatibility

## Environment Variables

### Common Environment Variables
```bash
# Backend Configuration
DATABASE_URL=sqlite:./medical_device_assistant.db
FDA_API_KEY=your_fda_api_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here

# Optional Services
REDIS_URL=redis://localhost:6379
LOG_LEVEL=INFO
DEBUG=false

# Development Settings
NODE_ENV=development
PYTHONPATH=.
```

### Platform-Specific Environment Files

#### Windows (.env.windows)
```env
# Windows-specific paths
DATABASE_URL=sqlite:C:\path\to\medical_device_assistant.db
LOG_FILE=C:\logs\medical_device_assistant.log

# Windows service settings
WINDOWS_SERVICE_NAME=MedicalDeviceAssistant
```

#### Linux (.env.linux)
```env
# Linux-specific paths
DATABASE_URL=sqlite:/var/lib/medical-device-assistant/database.db
LOG_FILE=/var/log/medical-device-assistant/app.log

# Linux service settings
SYSTEMD_SERVICE_NAME=medical-device-assistant
```

#### macOS (.env.macos)
```env
# macOS-specific paths
DATABASE_URL=sqlite:~/Library/Application Support/MedicalDeviceAssistant/database.db
LOG_FILE=~/Library/Logs/MedicalDeviceAssistant/app.log

# macOS service settings
LAUNCHD_SERVICE_NAME=com.medicaldevice.assistant
```

## Port Configuration

### Default Ports
- **Frontend**: 3000
- **Backend**: 8000
- **Redis** (optional): 6379

### Port Conflict Resolution

#### Windows
```powershell
# Check what's using a port
netstat -ano | findstr :3000

# Kill process by PID
taskkill /PID <PID> /F
```

#### Linux/macOS
```bash
# Check what's using a port
lsof -i :3000
netstat -tulpn | grep :3000

# Kill process by PID
kill -9 <PID>

# Kill process by port
sudo fuser -k 3000/tcp
```

## Database Setup

### SQLite Database Location

#### Windows
- Default: `medical-device-regulatory-assistant\backend\medical_device_assistant.db`
- Recommended: `%APPDATA%\MedicalDeviceAssistant\database.db`

#### Linux
- Default: `medical-device-regulatory-assistant/backend/medical_device_assistant.db`
- Recommended: `/var/lib/medical-device-assistant/database.db`

#### macOS
- Default: `medical-device-regulatory-assistant/backend/medical_device_assistant.db`
- Recommended: `~/Library/Application Support/MedicalDeviceAssistant/database.db`

### Database Permissions

#### Windows
```powershell
# Set proper permissions
icacls "medical_device_assistant.db" /grant Users:F
```

#### Linux/macOS
```bash
# Set proper permissions
chmod 644 medical_device_assistant.db
chown $USER:$USER medical_device_assistant.db
```

## Service Management

### Windows Services

#### Create Windows Service
```powershell
# Using NSSM (Non-Sucking Service Manager)
nssm install MedicalDeviceAssistant "C:\path\to\start-dev.ps1"
nssm set MedicalDeviceAssistant Start SERVICE_AUTO_START
nssm start MedicalDeviceAssistant
```

#### PowerShell Service Script
```powershell
# service-install.ps1
$serviceName = "MedicalDeviceAssistant"
$serviceDisplayName = "Medical Device Regulatory Assistant"
$servicePath = "C:\path\to\start-dev.ps1"

New-Service -Name $serviceName -DisplayName $serviceDisplayName -BinaryPathName "powershell.exe -File $servicePath" -StartupType Automatic
```

### Linux Systemd Services

#### Create Systemd Service
```bash
# /etc/systemd/system/medical-device-assistant.service
[Unit]
Description=Medical Device Regulatory Assistant
After=network.target

[Service]
Type=simple
User=medicaldevice
WorkingDirectory=/opt/medical-device-assistant
ExecStart=/opt/medical-device-assistant/start-dev.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Enable and Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable medical-device-assistant
sudo systemctl start medical-device-assistant
sudo systemctl status medical-device-assistant
```

### macOS LaunchDaemon

#### Create LaunchDaemon
```xml
<!-- /Library/LaunchDaemons/com.medicaldevice.assistant.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.medicaldevice.assistant</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/medical-device-assistant/start-dev.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/opt/medical-device-assistant</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

#### Load LaunchDaemon
```bash
sudo launchctl load /Library/LaunchDaemons/com.medicaldevice.assistant.plist
sudo launchctl start com.medicaldevice.assistant
```

## Troubleshooting

### Common Issues

#### Permission Denied Errors

**Windows**
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Fix file permissions
icacls "start-dev.ps1" /grant Users:RX
```

**Linux/macOS**
```bash
# Make scripts executable
chmod +x *.sh

# Fix ownership
sudo chown -R $USER:$USER .
```

#### Port Already in Use

**Windows**
```powershell
# Find and kill process
$process = Get-NetTCPConnection -LocalPort 3000 -State Listen
Stop-Process -Id $process.OwningProcess -Force
```

**Linux/macOS**
```bash
# Find and kill process
sudo lsof -ti:3000 | xargs kill -9
```

#### Python/Node.js Version Issues

**All Platforms**
```bash
# Check versions
node --version  # Should be 18+
python --version  # Should be 3.8+

# Update if needed
# Windows: Use installers or package managers
# Linux: Use package manager (apt, yum, etc.)
# macOS: Use Homebrew or installers
```

#### Database Connection Issues

**Windows**
```powershell
# Check database file
Test-Path "medical_device_assistant.db"
Get-Acl "medical_device_assistant.db"
```

**Linux/macOS**
```bash
# Check database file
ls -la medical_device_assistant.db
file medical_device_assistant.db
```

### Platform-Specific Debugging

#### Windows Debugging
```powershell
# Enable verbose logging
$VerbosePreference = "Continue"

# Check Windows Event Log
Get-EventLog -LogName Application -Source "Medical Device Assistant"

# Monitor performance
Get-Counter "\Process(node)\% Processor Time"
```

#### Linux Debugging
```bash
# Check system logs
journalctl -u medical-device-assistant -f

# Monitor resources
htop
iostat -x 1

# Check network connections
ss -tulpn | grep -E ':(3000|8000)'
```

#### macOS Debugging
```bash
# Check system logs
log show --predicate 'subsystem == "com.medicaldevice.assistant"' --info

# Monitor resources
top -pid $(pgrep -f "medical-device")

# Check network connections
netstat -an | grep -E ':(3000|8000)'
```

## Performance Optimization

### Platform-Specific Optimizations

#### Windows
- Use Windows Performance Toolkit for profiling
- Enable Windows Defender exclusions for project directory
- Use Windows Subsystem for Linux (WSL) for better performance
- Configure Windows power settings for high performance

#### Linux
- Use `systemd-analyze` for boot performance
- Configure kernel parameters for better networking
- Use `perf` for application profiling
- Optimize file system (ext4, btrfs) settings

#### macOS
- Use Instruments for profiling
- Configure Energy Saver settings
- Use `fs_usage` for file system monitoring
- Optimize Spotlight indexing exclusions

## Security Considerations

### Platform-Specific Security

#### Windows
- Use Windows Defender or third-party antivirus
- Configure Windows Firewall rules
- Use Windows Security Center
- Enable Windows Update automatic installation

#### Linux
- Configure iptables/ufw firewall
- Use SELinux or AppArmor
- Keep system packages updated
- Use fail2ban for intrusion prevention

#### macOS
- Use built-in macOS security features
- Configure Application Firewall
- Use Gatekeeper for application security
- Enable FileVault for disk encryption

This cross-platform guide ensures the Medical Device Regulatory Assistant can be deployed and maintained across different operating systems while maintaining consistent functionality and performance.