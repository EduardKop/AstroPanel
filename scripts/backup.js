
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Get credentials from Args or Env
// Usage: node scripts/backup.js <SUPABASE_URL> <SERVICE_ROLE_KEY>
const supabaseUrl = process.argv[2] || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.argv[3] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Ошибка: Не указаны URL или SERVICE_ROLE_KEY');
    console.log('Использование: node scripts/backup.js <URL> <SERVICE_KEY>');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Define tables to backup
const TABLES = [
    'payments',
    'managers',
    'leads',
    'activity_logs',
    'knowledge_products',
    'knowledge_rules',
    'channels',
    'kpi_product_rates',
    'kpi_settings',
    'countries',
    'app_settings'
];

// Helper to fetch all rows (pagination)
const fetchAll = async (table) => {
    let allData = [];
    let from = 0;
    const step = 1000;

    console.log(`📦 Скачивание таблицы: ${table}...`);

    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .range(from, from + step - 1);

        if (error) {
            console.error(`❌ Ошибка при скачивании ${table}:`, error.message);
            return null;
        }

        if (data.length === 0) break;

        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
    }

    console.log(`✅ ${table}: загружено ${allData.length} строк.`);
    return allData;
};

// Main function
const runBackup = async () => {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const backupDir = path.join(__dirname, '../backups', date);

    // Create Backup Dir
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(`🚀 Начинаем резервное копирование в папку: ${backupDir}`);

    for (const table of TABLES) {
        const data = await fetchAll(table);
        if (data) {
            const filePath = path.join(backupDir, `${table}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
    }

    console.log('🎉 Бэкап успешно завершен!');
};

runBackup();
