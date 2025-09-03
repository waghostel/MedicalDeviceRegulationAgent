# Deployment Guide - Medical Device Regulatory Assistant

This guide provides comprehensive instructions for deploying the Medical Device Regulatory Assistant to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Provider Deployment](#cloud-provider-deployment)
6. [Monitoring Setup](#monitoring-setup)
7. [Backup Configuration](#backup-configuration)
8. [Security Hardening](#security-hardening)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **CPU**: Minimum 4 cores (8 cores recommended for production)
- **Memory**: Minimum 8GB RAM (16GB recommended for production)
- **Storage**: Minimum 50GB SSD (100GB+ recommended for production)
- **Network**: Stable internet connection with access to FDA APIs

### Software Requirements

- Docker 24.0+ and Docker Compose 2.0+
- Git 2.30+
- SSL certificates (for HTTPS)
- Domain name (for production)

### External Services

- Google OAuth 2.0 application configured
- FDA API access (no key required for basic access)
- Email service for notifications (optional)
- Monitoring service accounts (optional)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/medical-device-regulatory-assistant.git
cd medical-device-regulatory-assistant
```

### 2. Environment Configuration

Copy the production environment template:

```bash
cp .env.example .env.production
```

Edit `.env.production` with your production values:

```bash
# Required Production Variables
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secure-secret-key-32-chars-minimum
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
POSTGRES_PASSWORD=your-secure-database-password
JWT_SECRET_KEY=your-jwt-secret-key
GRAFANA_PASSWORD=your-grafana-admin-password

# Optional but Recommended
SENTRY_DSN=your-sentry-dsn-for-error-tracking
BACKUP_ENCRYPTION_KEY=your-backup-encryption-key
```

### 3. SSL Certificate Setup

Place your SSL certificates in the appropriate directory:

```bash
mkdir -p nginx/ssl
cp your-cert.pem nginx/ssl/cert.pem
cp your-private-key.pem nginx/ssl/key.pem
```

## Docker Deployment

### Production Deployment with Docker Compose

1. **Build and start services:**

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

2. **Verify deployment:**

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test health endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com:8000/health
```

3. **Initialize database:**

```bash
# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend poetry run alembic upgrade head

# Create initial admin user (optional)
docker-compose -f docker-compose.prod.yml exec backend poetry run python scripts/create_admin_user.py
```

### Service Management

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# View service logs
docker-compose -f docker-compose.prod.yml logs -f frontend backend

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## Kubernetes Deployment

### 1. Prepare Kubernetes Manifests

Create namespace:

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: medical-device-assistant
```

### 2. Deploy to Kubernetes

```bash
# Apply namespace
kubectl apply -f k8s/namespace.yaml

# Deploy secrets
kubectl apply -f k8s/secrets.yaml

# Deploy services
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n medical-device-assistant
kubectl get services -n medical-device-assistant
```

## Cloud Provider Deployment

### AWS Deployment

#### Using AWS ECS with Fargate

1. **Create ECS Cluster:**

```bash
aws ecs create-cluster --cluster-name medical-device-assistant
```

2. **Deploy using AWS CLI:**

```bash
# Build and push images to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

docker build -f Dockerfile.frontend -t medical-device-assistant/frontend .
docker tag medical-device-assistant/frontend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/medical-device-assistant/frontend:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/medical-device-assistant/frontend:latest

# Create task definitions and services
aws ecs register-task-definition --cli-input-json file://aws/task-definition.json
aws ecs create-service --cluster medical-device-assistant --service-name frontend --task-definition medical-device-assistant-frontend
```

### Google Cloud Platform

#### Using Google Cloud Run

```bash
# Build and deploy frontend
gcloud builds submit --tag gcr.io/PROJECT-ID/medical-device-assistant-frontend
gcloud run deploy frontend --image gcr.io/PROJECT-ID/medical-device-assistant-frontend --platform managed

# Build and deploy backend
gcloud builds submit --tag gcr.io/PROJECT-ID/medical-device-assistant-backend --build-config backend/cloudbuild.yaml
gcloud run deploy backend --image gcr.io/PROJECT-ID/medical-device-assistant-backend --platform managed
```

### Azure Deployment

#### Using Azure Container Instances

```bash
# Create resource group
az group create --name medical-device-assistant --location eastus

# Deploy containers
az container create --resource-group medical-device-assistant --name frontend --image your-registry/frontend:latest
az container create --resource-group medical-device-assistant --name backend --image your-registry/backend:latest
```

## Monitoring Setup

### 1. Access Monitoring Dashboards

- **Grafana**: https://your-domain.com:3001 (admin/your-grafana-password)
- **Prometheus**: https://your-domain.com:9090
- **Application Logs**: Available through Grafana → Explore → Loki

### 2. Configure Alerting

Edit `monitoring/alert_rules.yml` to customize alert thresholds:

```yaml
# Example: Adjust error rate threshold
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05  # 5% error rate
  for: 2m
```

### 3. Set Up Notifications

Configure Grafana notification channels:

1. Go to Grafana → Alerting → Notification channels
2. Add Slack, email, or webhook notifications
3. Test notifications

## Backup Configuration

### 1. Automated Database Backups

The system includes automated PostgreSQL backups:

```bash
# Manual backup
docker-compose -f docker-compose.prod.yml exec postgres /backups/backup-script.sh

# Restore from backup
docker-compose -f docker-compose.prod.yml exec postgres /backups/restore-script.sh /backups/backup_file.sql.gz
```

### 2. Backup Schedule

Backups run automatically via cron:

- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 90 days for production
- **Location**: `/backups` volume in postgres container

### 3. Backup Verification

```bash
# Check backup status
docker-compose -f docker-compose.prod.yml exec postgres ls -la /backups/

# Verify backup integrity
docker-compose -f docker-compose.prod.yml exec postgres pg_restore --list /backups/latest_backup.custom
```

## Security Hardening

### 1. Network Security

- Use HTTPS only (HTTP redirects to HTTPS)
- Configure firewall to allow only necessary ports
- Use VPN for administrative access

### 2. Application Security

- Regular security updates
- Strong passwords and secrets
- Rate limiting enabled
- CORS properly configured

### 3. Database Security

- Database user with minimal privileges
- Encrypted connections
- Regular security patches

### 4. Container Security

- Non-root user in containers
- Minimal base images
- Regular image updates
- Security scanning enabled

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs service-name

# Check resource usage
docker stats

# Check disk space
df -h
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
docker-compose -f docker-compose.prod.yml exec backend poetry run python -c "
from database.connection import test_connection
import asyncio
asyncio.run(test_connection())
"

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

#### 3. FDA API Issues

```bash
# Test FDA API connectivity
curl "https://api.fda.gov/device/510k.json?limit=1"

# Check rate limiting
docker-compose -f docker-compose.prod.yml logs backend | grep "FDA API"
```

#### 4. High Memory Usage

```bash
# Check memory usage by service
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Restart services if needed
docker-compose -f docker-compose.prod.yml restart backend
```

### Performance Optimization

#### 1. Database Optimization

```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table statistics
ANALYZE;
```

#### 2. Cache Optimization

```bash
# Check Redis memory usage
docker-compose -f docker-compose.prod.yml exec redis redis-cli info memory

# Clear cache if needed
docker-compose -f docker-compose.prod.yml exec redis redis-cli flushall
```

### Emergency Procedures

#### 1. Service Rollback

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Restore from backup
git checkout previous-stable-tag
docker-compose -f docker-compose.prod.yml up -d
```

#### 2. Database Recovery

```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop frontend backend

# Restore database
docker-compose -f docker-compose.prod.yml exec postgres /backups/restore-script.sh /backups/backup_YYYYMMDD_HHMMSS.sql.gz

# Restart application
docker-compose -f docker-compose.prod.yml start frontend backend
```

## Maintenance

### Regular Maintenance Tasks

1. **Weekly**:
   - Review monitoring dashboards
   - Check backup integrity
   - Review security logs

2. **Monthly**:
   - Update dependencies
   - Review and rotate secrets
   - Performance optimization

3. **Quarterly**:
   - Security audit
   - Disaster recovery testing
   - Capacity planning review

### Update Procedures

1. **Application Updates**:

```bash
# Pull latest code
git pull origin main

# Build new images
docker-compose -f docker-compose.prod.yml build

# Rolling update
docker-compose -f docker-compose.prod.yml up -d --no-deps backend
docker-compose -f docker-compose.prod.yml up -d --no-deps frontend
```

2. **Database Migrations**:

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec backend poetry run alembic upgrade head
```

For additional support, refer to the [Operations Runbook](./runbook.md) or contact the development team.