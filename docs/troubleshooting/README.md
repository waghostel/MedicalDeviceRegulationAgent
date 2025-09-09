# Troubleshooting Guide - Medical Device Regulatory Assistant

## Overview

This comprehensive troubleshooting guide helps users and developers resolve common issues with the Medical Device Regulatory Assistant project management system. It covers frontend issues, backend problems, database concerns, API connectivity, and performance optimization.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Authentication Issues](#authentication-issues)
3. [Project Management Issues](#project-management-issues)
4. [Database Problems](#database-problems)
5. [API Connectivity Issues](#api-connectivity-issues)
6. [Performance Problems](#performance-problems)
7. [Data Export and Import Issues](#data-export-and-import-issues)
8. [Real-time Updates Problems](#real-time-updates-problems)
9. [Development Environment Issues](#development-environment-issues)
10. [Production Deployment Issues](#production-deployment-issues)
11. [Error Code Reference](#error-code-reference)
12. [System Health Monitoring](#system-health-monitoring)

## Quick Diagnostics

### System Status Check

Before diving into specific issues, perform these quick checks:

**1. Service Status**:
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check if frontend is accessible
curl http://localhost:3000

# Check database connectivity
curl http://localhost:8000/api/projects
```

**2. Browser Console**:
- Open browser developer tools (F12)
- Check Console tab for JavaScript errors
- Check Network tab for failed requests
- Check Application tab for authentication tokens

**3. Server Logs**:
```bash
# Backend logs
cd medical-device-regulatory-assistant/backend
poetry run uvicorn main:app --reload --log-level debug

# Frontend logs
cd medical-device-regulatory-assistant
pnpm dev
```

### Common Quick Fixes

**Clear Browser Cache**:
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "All time" and check all boxes
3. Click "Clear data"

**Restart Services**:
```bash
# Stop all services
pkill -f uvicorn
pkill -f next

# Restart backend
cd backend && poetry run uvicorn main:app --reload

# Restart frontend
cd .. && pnpm dev
```

**Reset Database**:
```bash
cd medical-device-regulatory-assistant/backend
poetry run alembic downgrade base
poetry run alembic upgrade head
poetry run python database/integrated_seeder.py --config mock_data/comprehensive_mock_data_config.json --clear
```

## Authentication Issues

### Google OAuth Login Problems

**Issue**: Cannot sign in with Google
**Symptoms**:
- "Sign in with Google" button doesn't work
- Redirect loop after Google authentication
- "Invalid client" error message

**Solutions**:

1. **Check Google OAuth Configuration**:
```bash
# Verify environment variables
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $NEXTAUTH_URL
```

2. **Verify OAuth Redirect URIs**:
- Go to Google Cloud Console
- Navigate to APIs & Services > Credentials
- Check authorized redirect URIs include:
  - `http://localhost:3000/api/auth/callback/google` (development)
  - `https://yourdomain.com/api/auth/callback/google` (production)

3. **Clear Authentication State**:
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
// Then refresh the page
```

4. **Check Browser Settings**:
- Disable ad blockers temporarily
- Allow third-party cookies
- Try incognito/private browsing mode

### JWT Token Issues

**Issue**: "Unauthorized" errors after login
**Symptoms**:
- API requests return 401 status
- User gets logged out frequently
- "Invalid token" error messages

**Solutions**:

1. **Check Token Expiration**:
```javascript
// In browser console
const token = localStorage.getItem('auth-token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token expires:', new Date(payload.exp * 1000));
  console.log('Current time:', new Date());
}
```

2. **Verify Token Format**:
```bash
# Check JWT token structure
curl -H "Authorization: Bearer <your-token>" http://localhost:8000/api/projects
```

3. **Reset Authentication**:
- Sign out completely
- Clear browser storage
- Sign in again

### Session Management Problems

**Issue**: User session not persisting
**Symptoms**:
- User gets logged out on page refresh
- Session expires too quickly
- Multiple login prompts

**Solutions**:

1. **Check Session Configuration**:
```typescript
// In NextAuth configuration
export default NextAuth({
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  }
});
```

2. **Verify Cookie Settings**:
- Check if cookies are being set
- Verify domain and path settings
- Ensure secure flag is appropriate for environment

## Project Management Issues

### Project Creation Problems

**Issue**: Cannot create new projects
**Symptoms**:
- "Create Project" button doesn't work
- Form validation errors
- Projects not appearing in list

**Solutions**:

1. **Check Form Validation**:
```typescript
// Verify required fields
const projectData = {
  name: "Test Project", // Required, 1-255 characters
  description: "Optional description", // Optional, max 2000 characters
  device_type: "Medical Device", // Optional, max 255 characters
  intended_use: "Test indication", // Optional, max 5000 characters
  priority: "medium", // Optional: high, medium, low
  tags: ["test", "device"] // Optional, max 10 tags
};
```

2. **Test API Endpoint Directly**:
```bash
curl -X POST http://localhost:8000/api/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "Test description"
  }'
```

3. **Check Database Constraints**:
```sql
-- Verify user exists
SELECT * FROM users WHERE google_id = 'your-google-id';

-- Check project constraints
PRAGMA table_info(projects);
```

### Project Loading Issues

**Issue**: Projects not loading or displaying incorrectly
**Symptoms**:
- Empty project list
- Loading spinner never stops
- Partial project data displayed

**Solutions**:

1. **Check API Response**:
```bash
# Test projects endpoint
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/projects
```

2. **Verify Database Data**:
```sql
-- Check if projects exist
SELECT COUNT(*) FROM projects;

-- Check user's projects
SELECT * FROM projects WHERE user_id = (
  SELECT id FROM users WHERE google_id = 'your-google-id'
);
```

3. **Check Frontend State**:
```javascript
// In browser console
console.log('Project store state:', useProjectStore.getState());
```

### Search and Filtering Problems

**Issue**: Search functionality not working
**Symptoms**:
- Search returns no results
- Filters not applying correctly
- Search is case-sensitive when it shouldn't be

**Solutions**:

1. **Test Search API**:
```bash
# Test search endpoint
curl "http://localhost:8000/api/projects?search=test&limit=10" \
  -H "Authorization: Bearer <token>"
```

2. **Check Database Indexes**:
```sql
-- Verify search indexes exist
.indexes projects

-- Test search query directly
SELECT * FROM projects 
WHERE name LIKE '%test%' 
   OR description LIKE '%test%' 
   OR device_type LIKE '%test%';
```

3. **Debug Frontend Search**:
```typescript
// Add logging to search function
const handleSearch = (searchTerm: string) => {
  console.log('Searching for:', searchTerm);
  setFilters({ ...filters, search: searchTerm });
};
```

## Database Problems

### Database Connection Issues

**Issue**: Cannot connect to database
**Symptoms**:
- "Database connection failed" errors
- SQLite file not found
- Permission denied errors

**Solutions**:

1. **Check Database File**:
```bash
# Verify database file exists and has correct permissions
ls -la medical_device_assistant.db
chmod 664 medical_device_assistant.db
```

2. **Test Database Connection**:
```python
# Test connection script
import sqlite3
try:
    conn = sqlite3.connect('medical_device_assistant.db')
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM projects')
    print('Connection successful, projects count:', cursor.fetchone()[0])
    conn.close()
except Exception as e:
    print('Connection failed:', e)
```

3. **Reset Database**:
```bash
# Backup existing data
cp medical_device_assistant.db medical_device_assistant.db.backup

# Reset database
rm medical_device_assistant.db
poetry run alembic upgrade head
```

### Migration Issues

**Issue**: Database migration failures
**Symptoms**:
- "Migration failed" errors
- Schema version conflicts
- Missing tables or columns

**Solutions**:

1. **Check Migration Status**:
```bash
poetry run alembic current
poetry run alembic history
```

2. **Fix Migration Conflicts**:
```bash
# Reset to base and reapply
poetry run alembic downgrade base
poetry run alembic upgrade head
```

3. **Manual Schema Fix**:
```sql
-- Check table structure
.schema projects

-- Add missing columns manually if needed
ALTER TABLE projects ADD COLUMN priority TEXT;
ALTER TABLE projects ADD COLUMN tags TEXT;
```

### Data Integrity Issues

**Issue**: Corrupted or inconsistent data
**Symptoms**:
- Foreign key constraint errors
- Orphaned records
- Data validation failures

**Solutions**:

1. **Check Data Integrity**:
```sql
-- Check for orphaned projects
SELECT p.* FROM projects p 
LEFT JOIN users u ON p.user_id = u.id 
WHERE u.id IS NULL;

-- Check for invalid statuses
SELECT * FROM projects WHERE status NOT IN ('draft', 'in_progress', 'completed');
```

2. **Clean Up Orphaned Data**:
```sql
-- Remove orphaned projects
DELETE FROM projects WHERE user_id NOT IN (SELECT id FROM users);

-- Fix invalid statuses
UPDATE projects SET status = 'draft' WHERE status NOT IN ('draft', 'in_progress', 'completed');
```

3. **Rebuild Database**:
```bash
# Export data
poetry run python -c "
import json
from database.connection import get_database_manager
# Export logic here
"

# Reset and reimport
poetry run alembic downgrade base
poetry run alembic upgrade head
# Import data back
```

## API Connectivity Issues

### Network Connection Problems

**Issue**: Frontend cannot connect to backend API
**Symptoms**:
- "Network Error" messages
- API requests timing out
- CORS errors in browser console

**Solutions**:

1. **Check API Server Status**:
```bash
# Test if backend is running
curl http://localhost:8000/health

# Check specific endpoint
curl http://localhost:8000/api/projects
```

2. **Verify CORS Configuration**:
```python
# In FastAPI app configuration
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

3. **Check Network Configuration**:
```bash
# Test port availability
netstat -tulpn | grep :8000
netstat -tulpn | grep :3000

# Check firewall settings
sudo ufw status
```

### API Response Issues

**Issue**: API returning unexpected responses
**Symptoms**:
- 500 Internal Server Error
- Malformed JSON responses
- Missing data in responses

**Solutions**:

1. **Check Server Logs**:
```bash
# Run backend with debug logging
poetry run uvicorn main:app --reload --log-level debug
```

2. **Test API Endpoints**:
```bash
# Test with verbose output
curl -v -H "Authorization: Bearer <token>" http://localhost:8000/api/projects

# Test with different HTTP methods
curl -X POST -H "Content-Type: application/json" -d '{"name":"test"}' http://localhost:8000/api/projects
```

3. **Validate API Responses**:
```python
# Add response validation
from pydantic import ValidationError

try:
    response = ProjectResponse(**response_data)
except ValidationError as e:
    logger.error(f"Response validation failed: {e}")
```

### Rate Limiting Issues

**Issue**: API requests being rate limited
**Symptoms**:
- 429 Too Many Requests errors
- Requests failing after working initially
- Rate limit headers in responses

**Solutions**:

1. **Check Rate Limit Headers**:
```bash
curl -I -H "Authorization: Bearer <token>" http://localhost:8000/api/projects
# Look for X-RateLimit-* headers
```

2. **Implement Request Throttling**:
```typescript
// Add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const throttledRequest = async (request: () => Promise<any>) => {
  try {
    return await request();
  } catch (error) {
    if (error.status === 429) {
      await delay(1000); // Wait 1 second
      return await request(); // Retry
    }
    throw error;
  }
};
```

3. **Optimize Request Patterns**:
```typescript
// Batch requests instead of individual calls
const batchUpdateProjects = async (updates: ProjectUpdate[]) => {
  // Group updates and send in batches
  const batches = chunk(updates, 10);
  for (const batch of batches) {
    await Promise.all(batch.map(update => updateProject(update)));
    await delay(100); // Small delay between batches
  }
};
```

## Performance Problems

### Slow Page Loading

**Issue**: Application loads slowly
**Symptoms**:
- Long initial page load times
- Slow navigation between pages
- Unresponsive UI during loading

**Solutions**:

1. **Optimize Bundle Size**:
```bash
# Analyze bundle size
pnpm build
pnpm analyze

# Check for large dependencies
npx webpack-bundle-analyzer .next/static/chunks/*.js
```

2. **Implement Code Splitting**:
```typescript
// Use dynamic imports
const ProjectForm = dynamic(() => import('./ProjectForm'), {
  loading: () => <ProjectFormSkeleton />
});

// Lazy load heavy components
const ProjectExport = lazy(() => import('./ProjectExport'));
```

3. **Optimize Images and Assets**:
```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/project-icon.png"
  alt="Project Icon"
  width={64}
  height={64}
  priority={false}
/>
```

### Database Query Performance

**Issue**: Slow database queries
**Symptoms**:
- API endpoints taking too long to respond
- Database timeouts
- High CPU usage on database operations

**Solutions**:

1. **Add Database Indexes**:
```sql
-- Add indexes for common queries
CREATE INDEX idx_projects_user_status ON projects(user_id, status);
CREATE INDEX idx_projects_search ON projects(name, device_type);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
```

2. **Optimize Queries**:
```python
# Use eager loading for relationships
query = (
    select(Project)
    .options(
        selectinload(Project.device_classifications),
        selectinload(Project.predicate_devices)
    )
    .where(Project.user_id == user_id)
)
```

3. **Implement Query Caching**:
```python
# Cache frequently accessed data
@lru_cache(maxsize=100)
async def get_user_projects_cached(user_id: str):
    return await get_user_projects(user_id)
```

### Memory Usage Issues

**Issue**: High memory consumption
**Symptoms**:
- Browser becomes unresponsive
- Server running out of memory
- Frequent garbage collection

**Solutions**:

1. **Monitor Memory Usage**:
```javascript
// In browser console
console.log('Memory usage:', performance.memory);

// Monitor component renders
const ProjectList = memo(({ projects }) => {
  console.log('ProjectList rendered with', projects.length, 'projects');
  return <div>{/* component content */}</div>;
});
```

2. **Optimize Component Rendering**:
```typescript
// Use React.memo for expensive components
const ProjectCard = memo(({ project }: { project: Project }) => {
  return <div>{/* card content */}</div>;
});

// Implement virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';
```

3. **Clean Up Resources**:
```typescript
// Clean up event listeners and subscriptions
useEffect(() => {
  const subscription = websocket.subscribe(handleUpdate);
  
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

## Data Export and Import Issues

### Export Failures

**Issue**: Project export not working
**Symptoms**:
- Export button doesn't respond
- Download fails or produces empty files
- Export process hangs

**Solutions**:

1. **Test Export API**:
```bash
# Test JSON export
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/projects/1/export?format_type=json" \
  -o project_export.json

# Test PDF export
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/projects/1/export?format_type=pdf" \
  -o project_export.pdf
```

2. **Check Browser Download Settings**:
- Verify downloads are allowed
- Check download location permissions
- Disable popup blockers temporarily

3. **Debug Export Process**:
```python
# Add logging to export service
import logging

logger = logging.getLogger(__name__)

async def export_project(project_id: int, format_type: str):
    logger.info(f"Starting export for project {project_id}, format: {format_type}")
    try:
        # Export logic
        result = await generate_export(project_id, format_type)
        logger.info(f"Export completed successfully, size: {len(result)} bytes")
        return result
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise
```

### Import/Seeding Issues

**Issue**: Mock data seeding fails
**Symptoms**:
- Seeder script errors
- Incomplete data in database
- Foreign key constraint violations

**Solutions**:

1. **Validate Configuration**:
```bash
# Validate JSON configuration
poetry run python mock_data/validate_config.py mock_data/comprehensive_mock_data_config.json
```

2. **Check Seeding Order**:
```python
# Ensure proper seeding order
async def seed_all(self):
    # Users first (no dependencies)
    await self._seed_users()
    
    # Projects (depend on users)
    await self._seed_projects()
    
    # Related data (depend on projects)
    await self._seed_device_classifications()
    await self._seed_predicate_devices()
```

3. **Debug Seeding Process**:
```bash
# Run seeder with verbose output
poetry run python database/integrated_seeder.py \
  --config mock_data/comprehensive_mock_data_config.json \
  --verbose \
  --clear
```

## Real-time Updates Problems

### WebSocket Connection Issues

**Issue**: Real-time updates not working
**Symptoms**:
- Changes not appearing immediately
- WebSocket connection failures
- Multiple connection attempts

**Solutions**:

1. **Test WebSocket Connection**:
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:8000/ws/projects/1');
ws.onopen = () => console.log('WebSocket connected');
ws.onmessage = (event) => console.log('Message:', event.data);
ws.onerror = (error) => console.error('WebSocket error:', error);
```

2. **Check WebSocket Configuration**:
```python
# Verify WebSocket endpoint
@app.websocket("/ws/projects/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: int):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Handle message
    except WebSocketDisconnect:
        # Handle disconnect
        pass
```

3. **Implement Connection Recovery**:
```typescript
// Auto-reconnect WebSocket
const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  
  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setConnected(true);
      setSocket(ws);
    };
    
    ws.onclose = () => {
      setConnected(false);
      setSocket(null);
      // Reconnect after delay
      setTimeout(connect, 5000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [url]);
  
  useEffect(() => {
    connect();
  }, [connect]);
  
  return { socket, connected };
};
```

### Optimistic Update Issues

**Issue**: Optimistic updates not working correctly
**Symptoms**:
- UI shows stale data
- Updates appear then disappear
- Conflicting changes

**Solutions**:

1. **Debug Optimistic Updates**:
```typescript
// Add logging to optimistic update logic
const updateProjectOptimistic = (id: number, updates: Partial<Project>) => {
  console.log('Applying optimistic update:', id, updates);
  
  // Apply update immediately
  setProjects(prev => prev.map(p => 
    p.id === id ? { ...p, ...updates } : p
  ));
  
  // Send to server
  updateProjectOnServer(id, updates)
    .then(serverProject => {
      console.log('Server update successful:', serverProject);
      // Replace with server data
      setProjects(prev => prev.map(p => 
        p.id === id ? serverProject : p
      ));
    })
    .catch(error => {
      console.error('Server update failed:', error);
      // Revert optimistic update
      fetchProjects();
    });
};
```

2. **Implement Conflict Resolution**:
```typescript
// Handle conflicting updates
const handleConflict = (localProject: Project, serverProject: Project) => {
  if (localProject.updated_at > serverProject.updated_at) {
    // Local is newer, keep local changes
    return localProject;
  } else {
    // Server is newer, use server data
    return serverProject;
  }
};
```

## Development Environment Issues

### Package Installation Problems

**Issue**: Dependencies not installing correctly
**Symptoms**:
- `pnpm install` or `poetry install` failures
- Version conflicts
- Missing packages

**Solutions**:

1. **Clear Package Caches**:
```bash
# Clear pnpm cache
pnpm store prune

# Clear Poetry cache
poetry cache clear --all pypi

# Clear npm cache (if used)
npm cache clean --force
```

2. **Reset Lock Files**:
```bash
# Frontend
rm pnpm-lock.yaml node_modules -rf
pnpm install

# Backend
rm poetry.lock
poetry install
```

3. **Check Node/Python Versions**:
```bash
# Check versions
node --version  # Should be 18+
python --version  # Should be 3.11+
poetry --version

# Use version managers if needed
nvm use 18
pyenv local 3.11
```

### Build Issues

**Issue**: Build process failing
**Symptoms**:
- TypeScript compilation errors
- Build timeouts
- Missing environment variables

**Solutions**:

1. **Check TypeScript Errors**:
```bash
# Run type checking
pnpm type-check

# Check specific files
npx tsc --noEmit src/components/ProjectList.tsx
```

2. **Verify Environment Variables**:
```bash
# Check required variables
echo $NEXTAUTH_URL
echo $NEXTAUTH_SECRET
echo $GOOGLE_CLIENT_ID

# Copy from example
cp .env.example .env.local
```

3. **Clean Build Cache**:
```bash
# Clean Next.js cache
rm -rf .next

# Clean TypeScript cache
rm -rf node_modules/.cache

# Rebuild
pnpm build
```

### Hot Reload Issues

**Issue**: Hot reload not working in development
**Symptoms**:
- Changes not reflected automatically
- Need to manually refresh browser
- File watching not working

**Solutions**:

1. **Check File Watching Limits**:
```bash
# Increase file watching limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

2. **Verify Development Server**:
```bash
# Start with verbose logging
pnpm dev --verbose

# Check if files are being watched
lsof -p $(pgrep -f "next dev")
```

3. **Check File Permissions**:
```bash
# Ensure files are readable
chmod -R 755 src/
chmod -R 644 src/**/*.tsx
```

## Production Deployment Issues

### Docker Build Problems

**Issue**: Docker build failing
**Symptoms**:
- Build context too large
- Dependency installation failures
- Image size too large

**Solutions**:

1. **Optimize Docker Build**:
```dockerfile
# Use multi-stage builds
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile
EXPOSE 3000
CMD ["pnpm", "start"]
```

2. **Use .dockerignore**:
```
node_modules
.next
.git
*.log
.env.local
coverage
```

3. **Check Build Context**:
```bash
# Check build context size
docker build --no-cache --progress=plain .

# Use specific context
docker build -f Dockerfile.frontend .
```

### Environment Configuration Issues

**Issue**: Environment variables not working in production
**Symptoms**:
- API endpoints not found
- Authentication failures
- Missing configuration

**Solutions**:

1. **Verify Environment Variables**:
```bash
# Check container environment
docker exec -it container_name env | grep -E "(NEXT|API|AUTH)"

# Check Kubernetes secrets
kubectl get secrets -o yaml
```

2. **Use Proper Variable Prefixes**:
```bash
# Next.js public variables (client-side)
NEXT_PUBLIC_API_URL=https://api.example.com

# Server-side variables
NEXTAUTH_SECRET=your-secret
DATABASE_URL=postgresql://...
```

3. **Test Configuration**:
```bash
# Test API connectivity from container
docker exec -it container_name curl http://backend:8000/health
```

### SSL/HTTPS Issues

**Issue**: HTTPS not working correctly
**Symptoms**:
- Certificate errors
- Mixed content warnings
- Redirect loops

**Solutions**:

1. **Check Certificate Configuration**:
```bash
# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiration
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

2. **Configure HTTPS Redirects**:
```nginx
# Nginx configuration
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Error Code Reference

### HTTP Status Codes

**200 OK**: Request successful
- **Cause**: Normal operation
- **Action**: None required

**400 Bad Request**: Invalid request data
- **Cause**: Validation errors, malformed JSON
- **Action**: Check request format and required fields

**401 Unauthorized**: Authentication required
- **Cause**: Missing or invalid JWT token
- **Action**: Sign in again, check token expiration

**403 Forbidden**: Access denied
- **Cause**: Insufficient permissions
- **Action**: Verify user has access to resource

**404 Not Found**: Resource not found
- **Cause**: Invalid project ID, deleted resource
- **Action**: Check resource exists, verify ID

**422 Unprocessable Entity**: Validation errors
- **Cause**: Invalid field values, constraint violations
- **Action**: Check field requirements and formats

**429 Too Many Requests**: Rate limit exceeded
- **Cause**: Too many API requests
- **Action**: Wait before retrying, implement throttling

**500 Internal Server Error**: Server error
- **Cause**: Database errors, unhandled exceptions
- **Action**: Check server logs, contact support

### Application Error Codes

**PROJECT_NOT_FOUND**: Project with specified ID not found
```json
{
  "error": {
    "message": "Project with ID 123 not found",
    "code": "PROJECT_NOT_FOUND",
    "details": {"project_id": 123}
  }
}
```

**PROJECT_ACCESS_DENIED**: User doesn't have access to project
```json
{
  "error": {
    "message": "Access denied to project 123",
    "code": "PROJECT_ACCESS_DENIED",
    "details": {"project_id": 123, "user_id": "user_456"}
  }
}
```

**VALIDATION_ERROR**: Request data validation failed
```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "name": "Name is required and must be between 1 and 255 characters",
      "priority": "Priority must be one of: high, medium, low"
    }
  }
}
```

**DATABASE_ERROR**: Database operation failed
```json
{
  "error": {
    "message": "Database operation failed",
    "code": "DATABASE_ERROR",
    "details": {"operation": "create_project", "table": "projects"}
  }
}
```

## System Health Monitoring

### Health Check Endpoints

**Backend Health Check**:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "redis": true,
    "disk_space": true,
    "memory": true
  },
  "timestamp": "2024-01-16T15:30:00Z"
}
```

**Frontend Health Check**:
```bash
curl http://localhost:3000/api/health
```

### Monitoring Commands

**Check System Resources**:
```bash
# Memory usage
free -h

# Disk usage
df -h

# CPU usage
top -p $(pgrep -f "uvicorn\|next")

# Network connections
netstat -tulpn | grep -E ":3000|:8000"
```

**Check Application Logs**:
```bash
# Backend logs
tail -f backend/logs/app.log

# Frontend logs (in browser console)
# Check for errors and warnings

# System logs
journalctl -u your-app-service -f
```

**Database Health**:
```sql
-- Check database size
SELECT 
  page_count * page_size as size_bytes,
  page_count,
  page_size
FROM pragma_page_count(), pragma_page_size();

-- Check table sizes
SELECT 
  name,
  COUNT(*) as row_count
FROM sqlite_master 
WHERE type='table' 
GROUP BY name;

-- Check for locks
SELECT * FROM pragma_lock_status();
```

### Performance Monitoring

**Response Time Monitoring**:
```bash
# Test API response times
time curl -H "Authorization: Bearer <token>" http://localhost:8000/api/projects

# Monitor with continuous testing
while true; do
  curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/health
  sleep 5
done
```

**Memory Monitoring**:
```python
# Add to application
import psutil
import logging

logger = logging.getLogger(__name__)

def log_memory_usage():
    process = psutil.Process()
    memory_info = process.memory_info()
    logger.info(f"Memory usage: RSS={memory_info.rss / 1024 / 1024:.2f}MB, VMS={memory_info.vms / 1024 / 1024:.2f}MB")

# Call periodically or on specific operations
```

### Alerting Setup

**Basic Monitoring Script**:
```bash
#!/bin/bash
# health-check.sh

BACKEND_URL="http://localhost:8000/health"
FRONTEND_URL="http://localhost:3000"

# Check backend
if ! curl -f -s $BACKEND_URL > /dev/null; then
    echo "ALERT: Backend health check failed"
    # Send notification (email, Slack, etc.)
fi

# Check frontend
if ! curl -f -s $FRONTEND_URL > /dev/null; then
    echo "ALERT: Frontend health check failed"
    # Send notification
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "ALERT: Disk usage is ${DISK_USAGE}%"
fi
```

**Cron Job Setup**:
```bash
# Add to crontab (crontab -e)
*/5 * * * * /path/to/health-check.sh >> /var/log/health-check.log 2>&1
```

---

## Getting Additional Help

### Documentation Resources
- [API Documentation](../api/README.md)
- [User Guide](../user-guide/README.md)
- [Developer Documentation](../developer/README.md)

### Support Channels
- **GitHub Issues**: Report bugs and feature requests
- **Email Support**: support@medicaldeviceassistant.com
- **Emergency Contact**: ops@medicaldeviceassistant.com (production issues)

### Diagnostic Information to Include
When reporting issues, please include:
1. Error messages (exact text)
2. Steps to reproduce the problem
3. Browser version and operating system
4. Network configuration (if relevant)
5. Screenshots or screen recordings
6. Server logs (if accessible)

This troubleshooting guide should help resolve most common issues. If problems persist, don't hesitate to reach out for additional support.