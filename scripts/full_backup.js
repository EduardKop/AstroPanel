import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const { Client } = pg;

// ES Module fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env
config({ path: path.resolve(__dirname, '../.env'), quiet: true });

// ── Цвета для консоли ─────────────────────────────────────
const C = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
};
const log = {
    info: (m) => console.log(`${C.blue}ℹ  ${m}${C.reset}`),
    ok: (m) => console.log(`${C.green}✅ ${m}${C.reset}`),
    warn: (m) => console.log(`${C.yellow}⚠️  ${m}${C.reset}`),
    error: (m) => console.log(`${C.red}❌ ${m}${C.reset}`),
    section: (m) => console.log(`\n${C.cyan}${C.bold}${m}${C.reset}`),
    line: () => console.log(`${C.cyan}${'─'.repeat(52)}${C.reset}`),
};

// ── Подключение ───────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    log.error('DATABASE_URL не найден в .env');
    process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL, ssl: false });

// ── Вспомогательные функции ───────────────────────────────

/** Возвращает все схемы (кроме системных) */
async function getSchemas() {
    const res = await client.query(`
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
        ORDER BY schema_name
    `);
    return res.rows.map(r => r.schema_name);
}

/** Возвращает все таблицы схемы */
async function getTables(schema) {
    const res = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = $1 AND table_type = 'BASE TABLE'
        ORDER BY table_name
    `, [schema]);
    return res.rows.map(r => r.table_name);
}

/** Возвращает DDL (CREATE TABLE) для таблицы */
async function getTableDDL(schema, table) {
    // Колонки
    const cols = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
    `, [schema, table]);

    let ddl = `CREATE TABLE IF NOT EXISTS "${schema}"."${table}" (\n`;
    const colDefs = cols.rows.map(col => {
        let type = col.data_type;
        if (col.character_maximum_length) type += `(${col.character_maximum_length})`;
        let def = `  "${col.column_name}" ${type.toUpperCase()}`;
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        return def;
    });

    // Primary key
    const pk = await client.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = $1 AND tc.table_name = $2 AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position
    `, [schema, table]);

    if (pk.rows.length > 0) {
        const pkCols = pk.rows.map(r => `"${r.column_name}"`).join(', ');
        colDefs.push(`  PRIMARY KEY (${pkCols})`);
    }

    ddl += colDefs.join(',\n') + '\n);\n';
    return ddl;
}

/** Возвращает все индексы таблицы */
async function getIndexes(schema, table) {
    const res = await client.query(`
        SELECT indexdef FROM pg_indexes
        WHERE schemaname = $1 AND tablename = $2
        AND indexname NOT LIKE '%_pkey'
    `, [schema, table]);
    return res.rows.map(r => r.indexdef + ';');
}

/** Экспортирует данные таблицы как INSERT statements */
async function exportTableData(schema, table, out) {
    const countRes = await client.query(`SELECT COUNT(*) FROM "${schema}"."${table}"`);
    const total = parseInt(countRes.rows[0].count);

    if (total === 0) {
        out.write(`-- Table "${schema}"."${table}": 0 rows\n`);
        return 0;
    }

    const BATCH = 500;
    let exported = 0;

    out.write(`\n-- Data for table "${schema}"."${table}" (${total} rows)\n`);

    while (exported < total) {
        const res = await client.query(
            `SELECT * FROM "${schema}"."${table}" ORDER BY (SELECT NULL) LIMIT $1 OFFSET $2`,
            [BATCH, exported]
        );

        for (const row of res.rows) {
            const cols = Object.keys(row).map(c => `"${c}"`).join(', ');
            const vals = Object.values(row).map(v => {
                if (v === null) return 'NULL';
                if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
                if (typeof v === 'number') return v;
                if (v instanceof Date) return `'${v.toISOString()}'`;
                if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
                return `'${String(v).replace(/'/g, "''")}'`;
            }).join(', ');
            out.write(`INSERT INTO "${schema}"."${table}" (${cols}) VALUES (${vals});\n`);
        }

        exported += res.rows.length;
        if (res.rows.length < BATCH) break;

        process.stdout.write(`\r  ${C.blue}→${C.reset} ${table}: ${exported}/${total} строк...`);
    }

    process.stdout.write('\r' + ' '.repeat(60) + '\r');
    return exported;
}

// ── Main ──────────────────────────────────────────────────
async function runBackup() {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = path.join(__dirname, '../backups', `backup-${timestamp}`);

    fs.mkdirSync(backupDir, { recursive: true });

    log.line();
    console.log(`${C.cyan}${C.bold}   🗄️  AstroPanel — Полный бэкап БД${C.reset}`);
    log.line();

    log.info(`Подключаемся к базе данных...`);
    await client.connect();
    log.ok('Подключение установлено');

    const { rows: dbInfo } = await client.query('SELECT current_database(), version()');
    log.info(`БД: ${dbInfo[0].current_database}`);
    log.info(`PostgreSQL: ${dbInfo[0].version.split(' ').slice(0, 2).join(' ')}`);

    // Получаем схемы
    const schemas = await getSchemas();
    log.info(`Найдено схем: ${schemas.join(', ')}`);

    // Файл SQL дампа
    const sqlFile = path.join(backupDir, 'full_dump.sql');
    const out = fs.createWriteStream(sqlFile, { encoding: 'utf8' });

    // Заголовок файла
    out.write(`-- ============================================================\n`);
    out.write(`-- AstroPanel Full Database Backup\n`);
    out.write(`-- Created: ${new Date().toISOString()}\n`);
    out.write(`-- Database: ${dbInfo[0].current_database}\n`);
    out.write(`-- ============================================================\n\n`);
    out.write(`SET client_encoding = 'UTF8';\n`);
    out.write(`SET standard_conforming_strings = on;\n\n`);

    const manifest = { timestamp, schemas: {} };
    let totalRows = 0;
    let totalTables = 0;

    // Проходим по всем схемам и таблицам
    for (const schema of schemas) {
        const tables = await getTables(schema);
        if (tables.length === 0) continue;

        log.section(`📂 Схема: ${schema} (${tables.length} таблиц)`);
        out.write(`\n-- =====================\n-- Schema: ${schema}\n-- =====================\n\n`);

        manifest.schemas[schema] = [];

        for (const table of tables) {
            process.stdout.write(`  ${C.yellow}→${C.reset} ${table}...`);

            try {
                // DDL
                const ddl = await getTableDDL(schema, table);
                out.write(ddl + '\n');

                // Индексы
                const indexes = await getIndexes(schema, table);
                if (indexes.length > 0) {
                    out.write(indexes.join('\n') + '\n\n');
                }

                // Данные
                const rows = await exportTableData(schema, table, out);

                process.stdout.write(`\r  ${C.green}✅${C.reset} ${table}: ${rows} строк\n`);
                totalRows += rows;
                totalTables++;
                manifest.schemas[schema].push({ table, rows });
            } catch (err) {
                process.stdout.write(`\r  ${C.red}❌${C.reset} ${table}: ${err.message}\n`);
                manifest.schemas[schema].push({ table, error: err.message });
            }
        }
    }

    out.end();

    // JSON манифест
    const manifestFile = path.join(backupDir, 'manifest.json');
    manifest.totalTables = totalTables;
    manifest.totalRows = totalRows;
    manifest.durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

    // Размер файла
    const stats = fs.statSync(sqlFile);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    log.line();
    log.ok(`Бэкап завершён!`);
    log.info(`Таблиц: ${totalTables} | Строк: ${totalRows.toLocaleString()} | Размер: ${sizeMB} MB`);
    log.info(`Время: ${manifest.durationSeconds} сек`);
    log.info(`Сохранено в: ${backupDir}`);
    log.line();

    await client.end();
}

runBackup().catch(err => {
    log.error(`Критическая ошибка: ${err.message}`);
    client.end().catch(() => { });
    process.exit(1);
});
