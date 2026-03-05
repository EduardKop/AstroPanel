#!/bin/bash

# ============================================================
#  AstroPanel — Полный бэкап базы данных PostgreSQL
#  Использование: bash scripts/full_backup.sh
# ============================================================

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Путь к проекту
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}   🗄️  AstroPanel — Резервное копирование БД${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── 1. Загрузка переменных из .env ────────────────────────
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | grep -v '^$' | xargs)
    echo -e "${GREEN}✅ .env загружен${NC}"
else
    echo -e "${RED}❌ Файл .env не найден в $PROJECT_DIR${NC}"
    exit 1
fi

# ── 2. Проверка DATABASE_URL ───────────────────────────────
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Переменная DATABASE_URL не задана в .env${NC}"
    echo -e "${YELLOW}   Добавь в .env: DATABASE_URL=postgresql://user:password@host:port/dbname${NC}"
    exit 1
fi

echo -e "${BLUE}🔗 Подключение: $DATABASE_URL${NC}" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/'

# ── 3. Создание папки для бэкапа ──────────────────────────
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="$PROJECT_DIR/backups/backup-$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}📁 Папка бэкапа: $BACKUP_DIR${NC}"

# ── 4. Проверка наличия pg_dump ───────────────────────────
if command -v pg_dump &> /dev/null; then
    echo -e "${GREEN}✅ pg_dump найден: $(pg_dump --version | head -1)${NC}"
    USE_PGDUMP=true
else
    echo -e "${YELLOW}⚠️  pg_dump не найден — используем Node.js скрипт${NC}"
    USE_PGDUMP=false
fi

# ── 5. Бэкап через pg_dump (рекомендуется) ────────────────
if [ "$USE_PGDUMP" = true ]; then
    echo ""
    echo -e "${CYAN}📦 Создаём полный SQL дамп...${NC}"

    SQL_FILE="$BACKUP_DIR/full_dump.sql"
    CUSTOM_FILE="$BACKUP_DIR/full_dump.dump"

    # Полный SQL дамп (читаемый текст)
    PGPASSWORD=$(echo "$DATABASE_URL" | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/') \
    pg_dump \
        --no-owner \
        --no-acl \
        --format=plain \
        --encoding=UTF8 \
        --verbose \
        "$DATABASE_URL" \
        > "$SQL_FILE" 2>"$BACKUP_DIR/dump.log"

    if [ $? -eq 0 ]; then
        SQL_SIZE=$(du -sh "$SQL_FILE" | cut -f1)
        echo -e "${GREEN}✅ SQL дамп создан: full_dump.sql (${SQL_SIZE})${NC}"
    else
        echo -e "${RED}❌ Ошибка pg_dump. Лог: $BACKUP_DIR/dump.log${NC}"
        cat "$BACKUP_DIR/dump.log" | tail -20
        USE_PGDUMP=false
    fi

    # Custom format (сжатый, для pg_restore)
    PGPASSWORD=$(echo "$DATABASE_URL" | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/') \
    pg_dump \
        --no-owner \
        --no-acl \
        --format=custom \
        --compress=9 \
        "$DATABASE_URL" \
        > "$CUSTOM_FILE" 2>/dev/null

    if [ $? -eq 0 ]; then
        DUMP_SIZE=$(du -sh "$CUSTOM_FILE" | cut -f1)
        echo -e "${GREEN}✅ Binary дамп создан: full_dump.dump (${DUMP_SIZE})${NC}"
    fi
fi

# ── 6. Бэкап через Node.js (запасной / дополнительный) ───
if [ "$USE_PGDUMP" = false ]; then
    echo ""
    echo -e "${CYAN}📦 Запускаем Node.js бэкап (Supabase API)...${NC}"

    if [ -f "$PROJECT_DIR/scripts/backup.js" ]; then
        node "$PROJECT_DIR/scripts/backup.js" \
            "$VITE_SUPABASE_URL" \
            "$SUPABASE_SERVICE_ROLE_KEY"

        # Переместим файлы в папку с timestamp
        OLD_BACKUP_DATE=$(date +"%Y-%m-%d")
        if [ -d "$PROJECT_DIR/backups/$OLD_BACKUP_DATE" ]; then
            mv "$PROJECT_DIR/backups/$OLD_BACKUP_DATE"/* "$BACKUP_DIR/" 2>/dev/null
        fi
    else
        echo -e "${RED}❌ scripts/backup.js не найден${NC}"
        exit 1
    fi
fi

# ── 7. Создание манифеста ─────────────────────────────────
MANIFEST="$BACKUP_DIR/MANIFEST.txt"
echo "AstroPanel Database Backup" > "$MANIFEST"
echo "===========================" >> "$MANIFEST"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')" >> "$MANIFEST"
echo "Database: $(echo "$DATABASE_URL" | sed 's/.*@//' )" >> "$MANIFEST"
echo "" >> "$MANIFEST"
echo "Files:" >> "$MANIFEST"
ls -lh "$BACKUP_DIR" >> "$MANIFEST"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Бэкап завершён успешно!${NC}"
echo -e "${BLUE}📂 Сохранено в: $BACKUP_DIR${NC}"
echo ""
echo -e "Файлы бэкапа:"
ls -lh "$BACKUP_DIR"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── 8. Удаление старых бэкапов (старше 30 дней) ──────────
echo ""
echo -e "${YELLOW}🗑️  Удаляем бэкапы старше 30 дней...${NC}"
find "$PROJECT_DIR/backups" -maxdepth 1 -type d -mtime +30 -exec rm -rf {} + 2>/dev/null
echo -e "${GREEN}✅ Очистка завершена${NC}"
