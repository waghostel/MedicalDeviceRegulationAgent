# Production Deployment Guide

This guide covers how to build and deploy the Medical Device Regulatory Assistant application in production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Building for Production](#building-for-production)
4. [Running in Production](#running-in-production)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Security Considerations](#security-considerations)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying to production, ensure you have:

- Node.js 18+ installed
- pnpm package manager installed
- Python 3.9+ (for backend services)
- Poetry (for Python dependency management)
- Access to required external services (Google OAuth, FDA API)

## Environment Configuration

### 1. Create Production Environment File

Create a `.env.production` file in the project root:

```bash
cp .env.example .env.production
```

### 2. Configure Required Variables

Edit `.env.production` with your production values:

```env
# Application Environment
ENVIRONMENT=production

# NextAuth.js Configuration (REQUIRED)
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secure-random-string-at-least-32-characters

# Google OAuth Configuration (REQUIRED for authentication)
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
```

## Building for Production

### 1. Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install backend dependencies
cd backend
poetry install --only=main
cd ..
```

### 2. Build the Application

```bash
# Build the Next.js application
pnpm build
```

This will create an optimized production build in the `.next` directory.

### 3. Verify Build Success

Check that the build completed successfully:

```bash
# You should see output like:
# ✓ Compiled successfully
# ✓ Collecting page data
# ✓ Generating static pages
# ✓ Finalizing page optimization
```

## Running in Production

### Option 1: Using Next.js Start Command

```bash
# Start the production server
pnpm start
```

The application will be available at `http://localhost:3000` by default.

### Option 2: Using PM2 (Recommended for Production)

Install PM2 for process management:

```bash
npm install -g pm2
```

Create a PM2 ecosystem file (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: 'medical-device-assistant',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './medical-device-regulatory-assistant',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
```

Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 3: Using Docker (Advanced)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t medical-device-assistant .
docker run -p 3000:3000 --env-file .env.production medical-device-assistant
```

## Environment Variables Reference

### Required Variables

| Variable               | Description                                 | Example                                    |
| ---------------------- | ------------------------------------------- | ------------------------------------------ |
| `NEXTAUTH_URL`         | Full URL of your application                | `https://your-domain.com`                  |
| `NEXTAUTH_SECRET`      | Secret key for NextAuth.js (32+ characters) | `your-super-secure-random-string`          |
| `GOOGLE_CLIENT_ID`     | Google OAuth Client ID                      | `123456789-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret                  | `GOCSPX-your-secret`                       |

### Optional Variables

| Variable       | Description                | Default     | Notes                            |
| -------------- | -------------------------- | ----------- | -------------------------------- |
| `FDA_API_KEY`  | FDA API access key         | None        | Improves rate limits             |
| `REDIS_URL`    | Redis connection string    | None        | For caching                      |
| `DATABASE_URL` | Database connection string | SQLite file | Can use PostgreSQL in production |
| `LOG_LEVEL`    | Logging verbosity          | `INFO`      | `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `DEBUG`        | Enable debug mode          | `false`     | Should be `false` in production  |

### How to Obtain Required Keys

**📖 For comprehensive step-by-step instructions on generating all keys and secrets, see:**

- **[Environment Setup Guide](./ENVIRONMENT_SETUP_GUIDE.md)** - Complete guide covering all platforms, cloud providers, and Docker configurations

#### Quick Reference

- **Google OAuth Setup**: Google Cloud Console → APIs & Services → Credentials
- **FDA API Key**: [openFDA Authentication](https://open.fda.gov/apis/authentication/) (optional, increases rate limits)
- **NextAuth Secret**: Generate with `openssl rand -base64 32` (minimum 32 characters)

## Security Considerations

### 1. Environment Variables Security

- **Never commit** `.env.production` to version control
- Use environment variable injection in your deployment platform
- Rotate secrets regularly
- Use different secrets for different environments

### 2. HTTPS Configuration

Always use HTTPS in production:

```env
NEXTAUTH_URL=https://your-domain.com  # Not http://
```

### 3. Database Security

For production, consider upgrading from SQLite:

```env
# PostgreSQL example
DATABASE_URL=postgresql://user:password@localhost:5432/medical_device_db

# MySQL example
DATABASE_URL=mysql://user:password@localhost:3306/medical_device_db
```

### 4. CORS Configuration

Ensure your API endpoints have proper CORS settings for your domain.

## Troubleshooting

### Common Issues

#### 1. NextAuth Secret Error

```
Error [MissingSecretError]: Please define a `secret` in production.
```

**Solution**: Ensure `NEXTAUTH_SECRET` is set in your environment variables.

#### 2. Google OAuth Error

```
Error: Configuration error: Google OAuth not configured
```

**Solution**: Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correctly set.

#### 3. Database Connection Error

```
Error: Database connection failed
```

**Solution**: Check `DATABASE_URL` format and ensure database server is running.

#### 4. Build Errors

```
Error: Build failed due to TypeScript errors
```

**Solution**: Run type checking before building:

```bash
pnpm type-check
pnpm lint
pnpm build
```

### Performance Optimization

#### 1. Enable Compression

Add compression middleware or configure your reverse proxy (nginx/Apache) to compress responses.

#### 2. CDN Configuration

Serve static assets through a CDN for better performance.

#### 3. Database Optimization

- Use connection pooling
- Add appropriate indexes
- Consider read replicas for high traffic

### Monitoring and Logging

#### 1. Application Monitoring

Consider integrating with monitoring services:

- Sentry for error tracking
- DataDog or New Relic for performance monitoring
- LogRocket for user session recording

#### 2. Health Checks

The application includes health check endpoints:

- `/api/health` - Basic health check
- Monitor database connectivity
- Check external service availability

### Backup and Recovery

#### 1. Database Backups

```bash
# SQLite backup
cp medical_device_assistant.db backup_$(date +%Y%m%d_%H%M%S).db

# PostgreSQL backup
pg_dump medical_device_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 2. Application State

- Backup uploaded documents
- Export user projects and data
- Maintain configuration backups

## Deployment Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Google OAuth setup and tested
- [ ] Database properly configured
- [ ] HTTPS certificate installed
- [ ] Domain DNS configured
- [ ] Monitoring and logging setup
- [ ] Backup strategy implemented
- [ ] Security headers configured
- [ ] Performance testing completed
- [ ] Error handling tested
- [ ] User acceptance testing passed

## Support

For deployment issues:

1. Check the application logs
2. Verify environment variable configuration
3. Test external service connectivity
4. Review the troubleshooting section above
5. Consult the project documentation

Remember: This application handles medical device regulatory information. Ensure compliance with your organization's security and regulatory requirements before deploying to production.