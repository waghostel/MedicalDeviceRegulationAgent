#!/bin/bash

# Database restore script for Medical Device Regulatory Assistant
# This script restores the PostgreSQL database from backup

set -e

# Configuration
DB_NAME="${POSTGRES_DB:-medical_device_assistant}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="/backups"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/medical_device_assistant_backup_*.sql.* 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found"
    exit 1
fi

echo "Starting database restore from $BACKUP_FILE at $(date)"

# Determine backup format
if [[ "$BACKUP_FILE" == *.custom ]]; then
    echo "Restoring from custom format backup..."
    
    # Drop existing database connections
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"
    
    # Restore from custom format
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --no-owner --no-privileges \
        "$BACKUP_FILE"
        
elif [[ "$BACKUP_FILE" == *.sql.gz ]]; then
    echo "Restoring from compressed SQL backup..."
    
    # Drop existing database connections
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"
    
    # Restore from compressed SQL
    gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
    
elif [[ "$BACKUP_FILE" == *.sql ]]; then
    echo "Restoring from plain SQL backup..."
    
    # Drop existing database connections
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"
    
    # Restore from plain SQL
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"
    
else
    echo "Error: Unsupported backup format. Supported formats: .custom, .sql, .sql.gz"
    exit 1
fi

echo "Database restore completed successfully at $(date)"

# Verify restore by checking table count
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo "Restored database contains $TABLE_COUNT tables"

# Log restore completion
echo "$(date): Database restored successfully from $BACKUP_FILE" >> "$BACKUP_DIR/restore.log"