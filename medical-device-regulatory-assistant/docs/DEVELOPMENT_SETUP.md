# Development Setup Guide

Quick guide to get the Medical Device Regulatory Assistant running in development mode.

## Quick Start

### 1. Install Dependencies

```bash
# Install frontend dependencies
pnpm install
```

### 2. Setup Environment

```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your development settings
```

### 3. Run Development Server

```bash
# Start the development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Environment Variables for Development

For development, you only need minimal configuration in `.env.local`:

```env
# Development Environment
ENVIRONMENT=development

# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-key-at-least-32-characters

# Google OAuth (Optional for development)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DATABASE_URL=sqlite+aiosqlite:///./medical_device_assistant.db

# Development Settings
DEBUG=true
AUTO_SEED_ON_STARTUP=true
CLEAR_BEFORE_SEED=false
```

## Development Commands

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type checking
pnpm type-check

# Build for production (testing)
pnpm build

# Start production build locally
pnpm start
```

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Environment File | `.env.local` | `.env.production` |
| NextAuth Secret | Can be simple | Must be secure (32+ chars) |
| Google OAuth | Optional | Required |
| Debug Mode | `true` | `false` |
| Auto Seeding | `true` | `false` |
| Hot Reload | Enabled | Disabled |
| Source Maps | Enabled | Disabled |
| Minification | Disabled | Enabled |

## Troubleshooting Development Issues

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 pnpm dev
```

### Clear Next.js Cache

```bash
# Remove .next directory and reinstall
rm -rf .next
pnpm install
pnpm dev
```

### Database Issues

```bash
# Remove database file to reset
rm medical_device_assistant.db
pnpm dev  # Will recreate with seed data
```