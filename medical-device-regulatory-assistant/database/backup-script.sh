#!/bin/bash

# Database backup script for Medical Device Regulatory Assistant
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
DB_NAME="${POSTGRES_DB:-medical_device_assistant}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="/backups"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/medical_device_assistant_backup_$TIMESTAMP.sql"

echo "Starting database backup at $(date)"

# Create database backup
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose --clean --no-owner --no-privileges \
    --format=custom --compress=9 \
    --file="$BACKUP_FILE.custom"

# Also create a plain SQL backup for easier restoration
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose --clean --no-owner --no-privileges \
    --format=plain \
    --file="$BACKUP_FILE"

# Compress the plain SQL backup
gzip "$BACKUP_FILE"

echo "Database backup completed: $BACKUP_FILE.gz and $BACKUP_FILE.custom"

# Clean up old backups (keep only last 30 days)
find "$BACKUP_DIR" -name "medical_device_assistant_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "medical_device_assistant_backup_*.sql.custom" -mtime +$RETENTION_DAYS -delete

echo "Old backups cleaned up (retention: $RETENTION_DAYS days)"

# Verify backup integrity
if pg_restore --list "$BACKUP_FILE.custom" > /dev/null 2>&1; then
    echo "Backup integrity verified successfully"
else
    echo "ERROR: Backup integrity check failed!"
    exit 1
fi

# Log backup completion
echo "$(date): Backup completed successfully - $BACKUP_FILE.gz" >> "$BACKUP_DIR/backup.log"

echo "Backup process completed at $(date)"