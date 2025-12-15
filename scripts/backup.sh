#!/bin/bash

# Configuration
DB_HOST="localhost"
DB_USER="root"
DB_PASS="password" # Should be loaded from env or passed in safetly
DB_NAME="course_file_db"
BACKUP_DIR="./backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Create backup dir
mkdir -p $BACKUP_DIR

# 1. Backup Database
echo "Backing up database..."
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME > "$BACKUP_DIR/db_backup_$DATE.sql"

# 2. Backup Uploads
echo "Backing up uploads..."
tar -czf "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" ./backend/uploads

echo "Backup completed successfully in $BACKUP_DIR"
