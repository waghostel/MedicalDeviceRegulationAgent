# Database Synchronization Guide

## Overview

This guide explains how to synchronize database schema and data between different computers/environments for the Medical Device Regulatory Assistant project. The project uses SQLite for development with Alembic migrations for schema management.

## Table of Contents

- [Why We Don't Track Database Files](#why-we-dont-track-database-files)
- [Migration-Based Synchronization](#migration-based-synchronization)
- [Setting Up a New Environment](#setting-up-a-new-environment)
- [Data Export/Import for Sharing](#data-exportimport-for-sharing)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

## Why We Don't Track Database Files

Database files (*.db, *.sqlite, *.sqlite3) are excluded from version control because:

- **Binary files**: Git isn't optimized for binary files like databases
- **Merge conflicts**: Database files can't be merged when multiple people make changes
- **Repository bloat**: Databases grow large and bloat the repository history
- **Data vs Schema**: We version the schema/structure, not the actual data
- **Security**: Databases may contain sensitive development data

## Migration-Based Synchronization

### What are Migrations?

Migrations are version-controlled scripts that define database schema changes. They allow you to:
- Track database schema evolution over time
- Apply schema changes consistently across environments
- Roll back changes if needed
- Share schema updates through Git

### Current Migration Files

The project has these migration files in `medical-device-regulatory-assistant/backend/migrations/versions/`:

```
7e8f40e38d8f_initial_database_schema.py          # Initial database setup
8d03117a1704_add_active_status_to_projectstatus_enum.py  # Project status updates
ae41c65970a9_add_enhanced_fields_to_project_model.py     # Enhanced project fields
cc27707fe289_add_database_constraints_and_indexes_.py    # Performance improvements
```

## Setting Up a New Environment

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd medical-device-regulatory-assistant
```

### Step 2: Install Dependencies

```bash
# Install backend dependencies
cd backend
poetry install

# Install frontend dependencies (if needed)
cd ..
pnpm install
```

### Step 3: Run Database Migrations

```bash
cd backend

# Apply all migrations to create the database schema
poetry run alembic upgrade head
```

This command will:
- Create a new `medical_device_assistant.db` file
- Apply all migration files in order
- Set up the complete database schema

### Step 4: Seed Development Data (Optional)

```bash
# Seed the database with sample data for development
poetry run python -c "
import asyncio
from database.seeder import DatabaseSeeder
seeder = DatabaseSeeder()
asyncio.run(seeder.seed_all())
"
```

## Data Export/Import for Sharing

### When to Use Data Export/Import

Use data export/import when you need to share:
- Important project data between computers
- Test data for specific scenarios
- Production-like data for development

### Exporting Data

```bash
cd medical-device-regulatory-assistant/backend

# Export current database data to JSON
poetry run python scripts/export_data.py
```

This creates a `data_export.json` file containing:
- User accounts
- Project data
- Timestamps and metadata

### Importing Data

```bash
cd medical-device-regulatory-assistant/backend

# Import data from JSON file
poetry run python scripts/import_data.py data_export.json
```

### Sharing Data Between Computers

**Computer A (source):**
```bash
# 1. Export data
poetry run python scripts/export_data.py

# 2. Share the data_export.json file (email, cloud storage, etc.)
```

**Computer B (destination):**
```bash
# 1. Set up the environment (migrations)
poetry run alembic upgrade head

# 2. Import the shared data
poetry run python scripts/import_data.py data_export.json
```

## Development Workflow

### Daily Development

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Apply any new migrations:**
   ```bash
   cd backend
   poetry run alembic upgrade head
   ```

3. **Start development:**
   ```bash
   poetry run uvicorn main:app --reload
   ```

### Creating New Migrations

When you modify database models:

```bash
cd backend

# Generate a new migration file
poetry run alembic revision --autogenerate -m "Description of changes"

# Review the generated migration file in migrations/versions/

# Apply the migration
poetry run alembic upgrade head

# Commit the migration file to Git
git add migrations/versions/
git commit -m "Add migration: Description of changes"
```

### Working with Branches

When switching branches that have different database schemas:

```bash
# Switch to a branch
git checkout feature-branch

# Check current migration status
poetry run alembic current

# Apply migrations for this branch
poetry run alembic upgrade head

# When switching back to main
git checkout main
poetry run alembic upgrade head
```

## Alembic Commands Reference

### Basic Commands

```bash
# Show current migration version
poetry run alembic current

# Show migration history
poetry run alembic history

# Apply all pending migrations
poetry run alembic upgrade head

# Apply migrations up to a specific version
poetry run alembic upgrade <revision_id>

# Rollback to previous migration
poetry run alembic downgrade -1

# Rollback to specific version
poetry run alembic downgrade <revision_id>

# Generate new migration
poetry run alembic revision --autogenerate -m "Description"

# Create empty migration file
poetry run alembic revision -m "Description"
```

### Advanced Commands

```bash
# Show SQL that would be executed (dry run)
poetry run alembic upgrade head --sql

# Show differences between current database and models
poetry run alembic check

# Stamp database with specific version (without running migrations)
poetry run alembic stamp <revision_id>
```

## Configuration Files

### alembic.ini

Located at `medical-device-regulatory-assistant/backend/alembic.ini`:

```ini
[alembic]
script_location = migrations
sqlalchemy.url = sqlite:///./medical_device_assistant.db
```

### migrations/env.py

Configures Alembic to work with your models and database connection.

## Troubleshooting

### Common Issues

#### 1. "No such table" errors

**Problem:** Database doesn't exist or migrations haven't been applied.

**Solution:**
```bash
cd backend
poetry run alembic upgrade head
```

#### 2. Migration conflicts

**Problem:** Multiple people created migrations with the same revision number.

**Solution:**
```bash
# Check migration history
poetry run alembic history

# Merge migrations if needed
poetry run alembic merge -m "Merge migrations" <rev1> <rev2>
```

#### 3. Database locked errors

**Problem:** SQLite database is locked by another process.

**Solution:**
```bash
# Stop all running processes
# On Windows: Check Task Manager for Python processes
# On Mac/Linux: 
ps aux | grep python
kill <process_id>

# If still locked, restart your terminal/IDE
```

#### 4. Migration fails with data conflicts

**Problem:** Migration tries to add constraints that conflict with existing data.

**Solution:**
```bash
# Backup current database
cp medical_device_assistant.db backup_$(date +%Y%m%d_%H%M%S).db

# Clean database and re-run migrations
rm medical_device_assistant.db
poetry run alembic upgrade head

# Re-import data if needed
poetry run python scripts/import_data.py backup_data.json
```

### Database Reset (Nuclear Option)

If everything breaks and you need a fresh start:

```bash
cd backend

# 1. Backup any important data first
poetry run python scripts/export_data.py

# 2. Remove database files
rm -f medical_device_assistant.db*

# 3. Re-run migrations
poetry run alembic upgrade head

# 4. Seed with fresh data
poetry run python -c "
import asyncio
from database.seeder import DatabaseSeeder
seeder = DatabaseSeeder()
asyncio.run(seeder.seed_all())
"
```

## Best Practices

### Do's ✅

- Always run `alembic upgrade head` after pulling changes
- Create descriptive migration messages
- Review generated migrations before committing
- Backup data before major schema changes
- Use the export/import scripts for sharing important data
- Test migrations on a copy of production data

### Don'ts ❌

- Never commit database files (*.db, *.sqlite)
- Don't edit migration files after they've been committed
- Don't skip migration steps when setting up new environments
- Don't delete migration files from version control
- Don't run migrations directly on production without testing

## Environment-Specific Notes

### Development
- Use SQLite for local development
- Migrations are applied automatically during setup
- Use seeder for consistent test data

### Production
- Consider using PostgreSQL for production
- Run migrations during deployment process
- Always backup before applying migrations
- Test migrations on staging environment first

## Additional Resources

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Project Database Models](../medical-device-regulatory-assistant/backend/models/)
- [Migration Files](../medical-device-regulatory-assistant/backend/migrations/versions/)

---

**Need Help?** Check the troubleshooting section above or refer to the project's main documentation.