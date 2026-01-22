/**
 * AstroPanel Backup Script
 * 
 * Экспортирует критически важные таблицы в JSON файлы.
 * 
 * Запуск: node backup_db.js
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Credentials (HARDCODED for your convenience, consistent with analyze_database.js)
// In production, use process.env
const supabaseUrl = 'https://jxrsojmqzwfofmaxqscl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cnNvam1xendmb2ZtYXhxc2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTMwNDIsImV4cCI6MjA4MTM4OTA0Mn0.7RfpHj35Qt8myArlCfT5WVLkMnAMChGzgamy2agmY10';

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables to backup
const TABLES = [
    'payments',
    'managers',
    'users',
    'activity_logs',
    'kpi_product_rates'
];

async function backupTable(tableName, backupDir) {
    console.log(`⏳ Backing up: ${tableName}...`);

    let allData = [];
    let from = 0;
    const step = 1000;

    // Fetch all data with pagination
    while (true) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(from, from + step - 1);

        if (error) {
            console.error(`❌ Error fetching ${tableName}:`, error.message);
            return;
        }

        if (data.length > 0) {
            allData = [...allData, ...data];
            if (data.length < step) break;
        } else {
            break;
        }
        from += step;
    }

    // Save to file
    const filename = `${tableName}.json`;
    const filePath = path.join(backupDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
    console.log(`✅ Saved ${allData.length} rows to ${filename}`);
}

async function runBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `./backups/${timestamp}`;

    // Create directories
    if (!fs.existsSync('./backups')) fs.mkdirSync('./backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

    console.log(`🚀 Starting backup to ${backupDir}\n`);

    for (const table of TABLES) {
        await backupTable(table, backupDir);
    }

    console.log(`\n✨ Backup completed successfully! Location: ${backupDir}`);
}

runBackup().catch(console.error);
