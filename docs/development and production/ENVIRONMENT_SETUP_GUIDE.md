# Environment Variables Setup Guide

This comprehensive guide covers how to generate, configure, and manage all environment variables required for the Medical Device Regulatory Assistant application across different platforms and deployment scenarios.

## Table of Contents

1. [Environment Variables Overview](#environment-variables-overview)
2. [Key Generation Methods](#key-generation-methods)
3. [Google OAuth Setup](#google-oauth-setup)
4. [NextAuth Configuration](#nextauth-configuration)
5. [Database Configuration](#database-configuration)
6. [Platform-Specific Instructions](#platform-specific-instructions)
7. [Cloud Platform Setup](#cloud-platform-setup)
8. [Docker Container Configuration](#docker-container-configuration)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

## Environment Variables Overview

The application uses different environment files for different stages:

- **`.env.local`** - Development environment (local machine)
- **`.env.production`** - Production environment
- **`.env.example`** - Template with all available variables

### Core Environment Variables Explained

```env
# Application Environment
ENVIRONMENT=development
# Controls application behavior, logging, and feature flags
# Values: development, testing, production

# NextAuth.js Configuration (REQUIRED)
NEXTAUTH_URL=http://localhost:3000
# The canonical URL of your application
# Development: http://localhost:3000
# Production: https://your-domain.com

NEXTAUTH_SECRET=development-secret-key-at-least-32-characters
# Cryptographic secret for JWT token signing and encryption
# MUST be at least 32 characters long
# MUST be different between environments

# Google OAuth Configuration (REQUIRED for authentication)
GOOGLE_CLIENT_ID=your-google-client-id
# Public identifier for your Google OAuth application
# Format: 123456789-abcdefghijklmnop.apps.googleusercontent.com

GOOGLE_CLIENT_SECRET=your-google-client-secret
# Private secret for your Google OAuth application
# Format: GOCSPX-your-secret-string

# Database Configuration
DATABASE_URL=sqlite+aiosqlite:///./medical_device_assistant.db
# Database connection string
# SQLite (development): sqlite+aiosqlite:///./database.db
# PostgreSQL (production): postgresql://user:password@host:port/database

# Development Settings
DEBUG=true
# Enables detailed logging and error messages
# Values: true (development), false (production)

AUTO_SEED_ON_STARTUP=true
# Automatically populate database with sample data on startup
# Values: true (development), false (production)

CLEAR_BEFORE_SEED=false
# Clear existing data before seeding
# Values: true (reset data), false (preserve data)

# Optional: FDA API Configuration
FDA_API_KEY=your-fda-api-key
# Increases rate limits from 240 to 1000 requests/minute
# Get from: https://open.fda.gov/apis/authentication/

# Optional: Redis Configuration
REDIS_URL=redis://localhost:6379
# For caching and session storage
# Local: redis://localhost:6379
# Cloud: redis://username:password@host:port
```

## Key Generation Methods

### NEXTAUTH_SECRET Generation

The `NEXTAUTH_SECRET` must be a cryptographically secure random string of at least 32 characters.

#### macOS/Linux

```bash
# Method 1: Using OpenSSL (recommended)
openssl rand -base64 32

# Method 2: Using /dev/urandom
head -c 32 /dev/urandom | base64

# Method 3: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Method 4: Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### Windows

```powershell
# PowerShell - Method 1: Using .NET Crypto
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# PowerShell - Method 2: Using Node.js (if installed)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Command Prompt - Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Online Generators (Use with caution)

For development only (never use for production):

- https://generate-secret.vercel.app/32
- https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx

**⚠️ Security Warning**: Never use online generators for production secrets. Always generate secrets locally on secure machines.

### Example Generated Secrets

```bash
# Example NEXTAUTH_SECRET (32 bytes, base64 encoded)
NEXTAUTH_SECRET=Kx8jN2mP9qR5sT7vW1xY3zA6bC8dE0fG2hI4jK6lM8nO

# For production, generate a new one:
openssl rand -base64 32
# Output: 7yX9mN2pQ5rS8tV1wY4zA7bC0dE3fG6hI9jK2lM5nO8P
```

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create New Project**
   
   ```
   Click "Select a project" → "New Project"
   Project Name: Medical Device Regulatory Assistant
   Organization: (your organization or leave blank)
   Click "Create"
   ```

3. **Enable Required APIs**
   
   ```
   Navigation Menu → APIs & Services → Library
   Search for "People API" → Enable
   ```
   
   **Note**: The "Google+ API" is deprecated and no longer required. The "People API" is used by NextAuth.js to fetch user profile information (like name and profile picture). In many modern Google Cloud projects, this API is enabled by default when you create OAuth credentials.

### Step 2: Configure OAuth Consent Screen

1. **Setup Consent Screen**
   
   ```
   APIs & Services → OAuth consent screen
   User Type: External (for public use) or Internal (for organization only)
   Click "Create"
   ```

2. **Fill Required Information**
   
   ```
   App name: Medical Device Regulatory Assistant
   User support email: your-email@domain.com
   Developer contact information: your-email@domain.com
   ```

3. **Add Scopes (Optional)**
   
   ```
   Add or Remove Scopes → Add:
   - .../auth/userinfo.email
   - .../auth/userinfo.profile
   - openid
   ```

4. **Add Test Users (for development)**
   
   ```
   Test users → Add users
   Add email addresses that can test the application
   ```

### Step 3: Create OAuth Credentials

1. **Create Credentials**
   
   ```
   APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs
   ```

2. **Configure Application Type**
   
   ```
   Application type: Web application
   Name: Medical Device Assistant Web Client
   ```

3. **Set Authorized URLs**
   
   **For Development:**
   
   ```
   Authorized JavaScript origins:
   - http://localhost:3000
   - http://localhost:3001 (if using different port)
   
   Authorized redirect URIs:
   - http://localhost:3000/api/auth/callback/google
   - http://localhost:3001/api/auth/callback/google
   ```
   
   **For Production:**
   
   ```
   Authorized JavaScript origins:
   - https://your-domain.com
   - https://www.your-domain.com
   
   Authorized redirect URIs:
   - https://your-domain.com/api/auth/callback/google
   - https://www.your-domain.com/api/auth/callback/google
   ```

4. **Save and Copy Credentials**
   
   ```
   Click "Create"
   Copy the Client ID and Client Secret
   Store them securely
   ```

### Step 4: Environment Configuration

```env
# Copy these values from Google Cloud Console
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-actual-secret-from-google
```

## NextAuth Configuration

### Development Configuration

```env
# Development settings
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-development-secret-32-chars-min
```

### Production Configuration

```env
# Production settings (HTTPS required)
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-production-secret-different-from-dev
```

### NextAuth Callback URLs

NextAuth automatically handles these callback patterns:

- **Google OAuth**: `{NEXTAUTH_URL}/api/auth/callback/google`
- **Sign In**: `{NEXTAUTH_URL}/api/auth/signin`
- **Sign Out**: `{NEXTAUTH_URL}/api/auth/signout`

## Database Configuration

### SQLite (Development)

```env
# Local SQLite database
DATABASE_URL=sqlite+aiosqlite:///./medical_device_assistant.db

# Absolute path (if needed)
DATABASE_URL=sqlite+aiosqlite:////absolute/path/to/database.db
```

### PostgreSQL (Production)

```env
# Local PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/medical_device_db

# Cloud PostgreSQL (example: AWS RDS)
DATABASE_URL=postgresql://username:password@your-db-host.amazonaws.com:5432/medical_device_db

# With SSL (recommended for production)
DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require
```

### MySQL (Alternative)

```env
# MySQL configuration
DATABASE_URL=mysql://username:password@localhost:3306/medical_device_db
```

## Platform-Specific Instructions

### macOS Setup

1. **Install Prerequisites**
   
   ```bash
   # Install Homebrew (if not installed)
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Install Node.js and pnpm
   brew install node
   npm install -g pnpm
   
   # Install Python and Poetry
   brew install python@3.11
   curl -sSL https://install.python-poetry.org | python3 -
   ```

2. **Generate Secrets**
   
   ```bash
   # Generate NEXTAUTH_SECRET
   openssl rand -base64 32
   
   # Create .env.local
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

### Linux Setup

1. **Install Prerequisites (Ubuntu/Debian)**
   
   ```bash
   # Update package list
   sudo apt update
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install pnpm
   npm install -g pnpm
   
   # Install Python and pip
   sudo apt install python3.11 python3-pip
   
   # Install Poetry
   curl -sSL https://install.python-poetry.org | python3 -
   ```

2. **Generate Secrets**
   
   ```bash
   # Generate NEXTAUTH_SECRET
   openssl rand -base64 32
   
   # Create environment file
   cp .env.example .env.local
   nano .env.local  # Edit with your values
   ```

### Windows Setup

1. **Install Prerequisites**
   
   ```powershell
   # Install Node.js from https://nodejs.org/
   # Or use Chocolatey
   choco install nodejs
   
   # Install pnpm
   npm install -g pnpm
   
   # Install Python from https://python.org/
   # Or use Chocolatey
   choco install python
   
   # Install Poetry
   (Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
   ```

2. **Generate Secrets**
   
   ```powershell
   # Generate NEXTAUTH_SECRET
   ```

   [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Create environment file

   Copy-Item .env.example .env.local
   notepad .env.local  # Edit with your values

```
## Cloud Platform Setup

### Amazon Web Services (AWS)

#### Using AWS Systems Manager Parameter Store

1. **Store Secrets in Parameter Store**
```bash
# Install AWS CLI
aws configure

# Store secrets
aws ssm put-parameter --name "/medical-device-app/nextauth-secret" --value "your-secret" --type "SecureString"
aws ssm put-parameter --name "/medical-device-app/google-client-id" --value "your-client-id" --type "String"
aws ssm put-parameter --name "/medical-device-app/google-client-secret" --value "your-client-secret" --type "SecureString"
```

2. **Retrieve in Application**
   
   ```javascript
   // In your application startup
   const AWS = require('aws-sdk');
   const ssm = new AWS.SSM();
   
   const getParameter = async (name) => {
     const result = await ssm.getParameter({ Name: name, WithDecryption: true }).promise();
     return result.Parameter.Value;
   };
   ```

#### Using AWS Secrets Manager

```bash
# Create secret
aws secretsmanager create-secret --name "medical-device-app/env" --secret-string '{
  "NEXTAUTH_SECRET": "your-secret",
  "GOOGLE_CLIENT_ID": "your-client-id",
  "GOOGLE_CLIENT_SECRET": "your-client-secret"
}'
```

#### Environment Variables for AWS Lambda

```yaml
# serverless.yml or CloudFormation
environment:
  NEXTAUTH_URL: https://your-domain.com
  NEXTAUTH_SECRET: ${ssm:/medical-device-app/nextauth-secret}
  GOOGLE_CLIENT_ID: ${ssm:/medical-device-app/google-client-id}
  GOOGLE_CLIENT_SECRET: ${ssm:/medical-device-app/google-client-secret}
```

### Google Cloud Platform (GCP)

#### Using Secret Manager

1. **Enable Secret Manager API**
   
   ```bash
   gcloud services enable secretmanager.googleapis.com
   ```

2. **Create Secrets**
   
   ```bash
   # Create secrets
   echo "your-nextauth-secret" | gcloud secrets create nextauth-secret --data-file=-
   echo "your-google-client-id" | gcloud secrets create google-client-id --data-file=-
   echo "your-google-client-secret" | gcloud secrets create google-client-secret --data-file=-
   ```

3. **Access in Application**
   
   ```javascript
   const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
   const client = new SecretManagerServiceClient();
   
   async function getSecret(secretName) {
     const [version] = await client.accessSecretVersion({
       name: `projects/your-project-id/secrets/${secretName}/versions/latest`,
     });
     return version.payload.data.toString();
   }
   ```

#### Environment Variables for Cloud Run

```yaml
# cloud-run.yaml
apiVersion: serving.knative.dev/v1
kind: Service
spec:
  template:
    spec:
      containers:
      - image: gcr.io/your-project/medical-device-app
        env:
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: nextauth-secret
              key: latest
```

### Vercel Platform

#### Using Vercel Environment Variables

1. **Via Vercel Dashboard**
   
   ```
   1. Go to your project dashboard
   2. Settings → Environment Variables
   3. Add variables:
      - NEXTAUTH_URL: https://your-app.vercel.app
      - NEXTAUTH_SECRET: [generate new secret]
      - GOOGLE_CLIENT_ID: [your client id]
      - GOOGLE_CLIENT_SECRET: [your client secret]
   ```

2. **Via Vercel CLI**
   
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Login and link project
   vercel login
   vercel link
   
   # Add environment variables
   vercel env add NEXTAUTH_SECRET
   vercel env add GOOGLE_CLIENT_ID
   vercel env add GOOGLE_CLIENT_SECRET
   ```

3. **Environment-Specific Variables**
   
   ```bash
   # Production only
   vercel env add NEXTAUTH_SECRET production
   
   # Preview and Development
   vercel env add NEXTAUTH_SECRET preview development
   ```

#### Vercel-Specific Configuration

```env
# Vercel automatically sets NEXTAUTH_URL for you
# But you can override it:
NEXTAUTH_URL=https://your-custom-domain.com

# For preview deployments, use:
NEXTAUTH_URL=https://your-app-git-branch.vercel.app
```

## Docker Container Configuration

### Development with Docker

#### Dockerfile Environment Setup

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "start"]
```

#### Docker Compose with Environment Files

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/app/data  # For SQLite database persistence

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

#### Environment File for Docker

```env
# .env.docker
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=docker-development-secret-32-characters-minimum
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
DATABASE_URL=sqlite+aiosqlite:///./data/medical_device_assistant.db
REDIS_URL=redis://redis:6379
```

### Production Docker Deployment

#### Multi-stage Dockerfile

```dockerfile
# Multi-stage production Dockerfile
FROM node:18-alpine AS base
RUN npm install -g pnpm

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Docker Secrets (Docker Swarm)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: medical-device-app:latest
    secrets:
      - nextauth_secret
      - google_client_secret
    environment:
      - NEXTAUTH_URL=https://your-domain.com
      - NEXTAUTH_SECRET_FILE=/run/secrets/nextauth_secret
      - GOOGLE_CLIENT_ID=your-client-id
      - GOOGLE_CLIENT_SECRET_FILE=/run/secrets/google_client_secret

secrets:
  nextauth_secret:
    external: true
  google_client_secret:
    external: true
```

#### Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: medical-device-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: medical-device-app
  template:
    metadata:
      labels:
        app: medical-device-app
    spec:
      containers:
      - name: app
        image: medical-device-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXTAUTH_URL
          value: "https://your-domain.com"
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: nextauth-secret
        - name: GOOGLE_CLIENT_ID
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: google-client-id
        - name: GOOGLE_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: google-client-secret
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  nextauth-secret: <base64-encoded-secret>
  google-client-secret: <base64-encoded-secret>
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  google-client-id: "your-google-client-id"
```

## Security Best Practices

### Secret Management

1. **Never Commit Secrets to Version Control**
   
   ```bash
   # Add to .gitignore
   echo ".env.local" >> .gitignore
   echo ".env.production" >> .gitignore
   echo "*.env" >> .gitignore
   ```

2. **Use Different Secrets for Different Environments**
   
   ```env
   # Development
   NEXTAUTH_SECRET=dev-secret-32-chars-minimum
   
   # Staging
   NEXTAUTH_SECRET=staging-secret-different-from-dev
   
   # Production
   NEXTAUTH_SECRET=prod-secret-different-from-all-others
   ```

3. **Rotate Secrets Regularly**
   
   ```bash
   # Generate new secret
   NEW_SECRET=$(openssl rand -base64 32)
   echo "New NEXTAUTH_SECRET: $NEW_SECRET"
   
   # Update in all environments
   # Test thoroughly before deploying
   ```

### Environment-Specific Security

#### Development Security

```env
# Development - More permissive for debugging
DEBUG=true
NEXTAUTH_URL=http://localhost:3000  # HTTP OK for local dev
AUTO_SEED_ON_STARTUP=true  # Convenient for development
```

#### Production Security

```env
# Production - Strict security
DEBUG=false  # Never enable debug in production
NEXTAUTH_URL=https://your-domain.com  # HTTPS required
AUTO_SEED_ON_STARTUP=false  # Never auto-seed in production
CLEAR_BEFORE_SEED=false  # Prevent accidental data loss
```

### Access Control

1. **Limit Environment Variable Access**
   
   ```bash
   # Set proper file permissions
   chmod 600 .env.production
   chown app:app .env.production
   ```

2. **Use Principle of Least Privilege**
   
   - Only give applications access to secrets they need
   - Use separate service accounts for different environments
   - Regularly audit access logs

### Monitoring and Auditing

1. **Log Secret Access (without exposing values)**
   
   ```javascript
   // Log when secrets are accessed
   console.log('NEXTAUTH_SECRET accessed at:', new Date().toISOString());
   // Never log the actual secret value
   ```

2. **Monitor for Secret Exposure**
   
   - Set up alerts for secrets in logs
   - Use tools like GitLeaks to scan for exposed secrets
   - Regularly rotate secrets as a precaution

## Troubleshooting

### Common Issues and Solutions

#### 1. NextAuth Secret Too Short

**Error:**

```
[next-auth][error][NO_SECRET] Please define a `secret` in production.
```

**Solution:**

```bash
# Generate a proper secret (32+ characters)
openssl rand -base64 32

# Update your environment file
NEXTAUTH_SECRET=your-new-32-plus-character-secret
```

#### 2. Google OAuth Redirect URI Mismatch

**Error:**

```
Error 400: redirect_uri_mismatch
```

**Solution:**

1. Check Google Cloud Console → Credentials

2. Ensure redirect URIs match exactly:
   
   ```
   Development: http://localhost:3000/api/auth/callback/google
   Production: https://your-domain.com/api/auth/callback/google
   ```

3. No trailing slashes, exact protocol match

#### 3. Database Connection Issues

**Error:**

```
Error: Database connection failed
```

**Solutions:**

```env
# Check DATABASE_URL format
# SQLite (correct)
DATABASE_URL=sqlite+aiosqlite:///./medical_device_assistant.db

# PostgreSQL (correct)
DATABASE_URL=postgresql://user:password@host:5432/database

# Common mistakes to avoid:
# Missing protocol: user:password@host:5432/database ❌
# Wrong protocol: mysql://... for PostgreSQL ❌
# Missing file path: sqlite+aiosqlite:// ❌
```

#### 4. Environment Variables Not Loading

**Debugging Steps:**

```javascript
// Add to your application for debugging
console.log('Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('Has NEXTAUTH_SECRET:', !!process.env.NEXTAUTH_SECRET);
console.log('Has GOOGLE_CLIENT_ID:', !!process.env.GOOGLE_CLIENT_ID);
// Never log actual secret values
```

**Common Causes:**

- Wrong file name (`.env.local` vs `.env.development`)
- File not in correct directory
- Syntax errors in environment file
- Missing quotes around values with spaces

#### 5. Docker Environment Issues

**Problem:** Environment variables not available in container

**Solution:**

```yaml
# docker-compose.yml
services:
  app:
    build: .
    env_file:
      - .env.local  # Make sure file exists
    environment:
      - NODE_ENV=development  # Override specific variables
```

**Problem:** Secrets not secure in Docker

**Solution:**

```yaml
# Use Docker secrets instead of environment variables
services:
  app:
    secrets:
      - nextauth_secret
    environment:
      - NEXTAUTH_SECRET_FILE=/run/secrets/nextauth_secret

secrets:
  nextauth_secret:
    file: ./secrets/nextauth_secret.txt
```

### Validation Scripts

#### Environment Validation Script

```bash
#!/bin/bash
# validate-env.sh

echo "🔍 Validating environment configuration..."

# Check required variables
REQUIRED_VARS=("NEXTAUTH_URL" "NEXTAUTH_SECRET" "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET")

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required variable: $var"
        exit 1
    else
        echo "✅ $var is set"
    fi
done

# Validate NEXTAUTH_SECRET length
if [ ${#NEXTAUTH_SECRET} -lt 32 ]; then
    echo "❌ NEXTAUTH_SECRET must be at least 32 characters long"
    exit 1
else
    echo "✅ NEXTAUTH_SECRET length is sufficient"
fi

# Validate NEXTAUTH_URL format
if [[ ! $NEXTAUTH_URL =~ ^https?:// ]]; then
    echo "❌ NEXTAUTH_URL must start with http:// or https://"
    exit 1
else
    echo "✅ NEXTAUTH_URL format is valid"
fi

echo "🎉 Environment validation passed!"
```

#### Google OAuth Test Script

```javascript
// test-oauth.js
const https = require('https');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    console.error('❌ Missing Google OAuth credentials');
    process.exit(1);
}

// Test Google OAuth endpoint
const testUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=test`;

console.log('🧪 Testing Google OAuth configuration...');
console.log('✅ Client ID format:', clientId.includes('.apps.googleusercontent.com'));
console.log('✅ Client Secret format:', clientSecret.startsWith('GOCSPX-'));

if (clientId.includes('.apps.googleusercontent.com') && clientSecret.startsWith('GOCSPX-')) {
    console.log('🎉 Google OAuth credentials format is correct');
} else {
    console.log('❌ Google OAuth credentials format appears incorrect');
}
```

### Getting Help

If you encounter issues not covered in this guide:

1. **Check Application Logs**
   
   ```bash
   # Development
   pnpm dev
   
   # Production
   pm2 logs medical-device-assistant
   ```

2. **Verify Environment Loading**
   
   ```javascript
   // Add temporary debug code
   console.log('Loaded environment variables:', Object.keys(process.env).filter(key => key.startsWith('NEXTAUTH_') || key.startsWith('GOOGLE_')));
   ```

3. **Test Individual Components**
   
   - Test database connection separately
   - Test Google OAuth with a simple request
   - Verify NextAuth configuration with a test login

4. **Community Resources**
   
   - NextAuth.js Documentation: https://next-auth.js.org/
   - Google OAuth Documentation: https://developers.google.com/identity/protocols/oauth2
   - Next.js Environment Variables: https://nextjs.org/docs/basic-features/environment-variables

Remember: When asking for help, never share actual secret values. Share only the configuration structure and error messages.