#!/bin/bash

# Medical Device Regulatory Assistant - Production Setup Script
# This script helps set up the production environment

set -e

echo "🏥 Medical Device Regulatory Assistant - Production Setup"
echo "======================================================="

# Check if required tools are installed
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        echo "❌ pnpm is not installed. Installing pnpm..."
        npm install -g pnpm
    fi
    
    echo "✅ Dependencies check passed"
}

# Generate NextAuth secret
generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32
    elif command -v node &> /dev/null; then
        node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    else
        echo "Please generate a 32+ character random string manually"
    fi
}

# Setup environment file
setup_environment() {
    echo "🔧 Setting up environment configuration..."
    
    if [ ! -f .env.production ]; then
        echo "📝 Creating .env.production file..."
        
        # Generate a secure secret
        SECRET=$(generate_secret)
        
        cat > .env.production << EOF
# Production Environment Configuration
ENVIRONMENT=production

# NextAuth.js Configuration (REQUIRED)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${SECRET}

# Google OAuth Configuration (REQUIRED - UPDATE THESE)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Database Configuration
DATABASE_URL=sqlite+aiosqlite:///./medical_device_assistant.db

# FDA API Configuration (OPTIONAL but recommended)
FDA_API_KEY=your-fda-api-key

# Redis Configuration (OPTIONAL - for caching)
REDIS_URL=redis://localhost:6379

# Logging Configuration
LOG_LEVEL=INFO
LOG_TO_FILE=true

# Security Settings
DEBUG=false
AUTO_SEED_ON_STARTUP=false
CLEAR_BEFORE_SEED=false
EOF
        
        echo "✅ Created .env.production with generated secret"
        echo "⚠️  IMPORTANT: Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before running in production!"
    else
        echo "✅ .env.production already exists"
    fi
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    pnpm install
    echo "✅ Dependencies installed"
}

# Build application
build_application() {
    echo "🔨 Building application for production..."
    pnpm build
    echo "✅ Application built successfully"
}

# Create PM2 ecosystem file
create_pm2_config() {
    echo "⚙️  Creating PM2 configuration..."
    
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'medical-device-assistant',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '$(pwd)',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '.env.production',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G'
    }
  ]
};
EOF
    
    # Create logs directory
    mkdir -p logs
    
    echo "✅ PM2 configuration created"
}

# Main setup function
main() {
    echo "Starting production setup..."
    
    check_dependencies
    setup_environment
    install_dependencies
    build_application
    create_pm2_config
    
    echo ""
    echo "🎉 Production setup completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Update .env.production with your actual Google OAuth credentials"
    echo "2. Set NEXTAUTH_URL to your production domain"
    echo "3. Optionally add FDA_API_KEY for better rate limits"
    echo ""
    echo "🚀 To start the application:"
    echo "   Option 1 (Simple): pnpm start"
    echo "   Option 2 (PM2):    pm2 start ecosystem.config.js"
    echo ""
    echo "📖 For detailed instructions, see docs/PRODUCTION_DEPLOYMENT.md"
}

# Run main function
main "$@"