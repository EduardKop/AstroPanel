/**
 * AstroPanel Database Analyzer
 * 
 * Анализирует все таблицы в Supabase:
 * - Структура колонок
 * - Количество записей
 * - Примеры данных
 * - Связи между таблицами
 * 
 * Запуск: node analyze_database.js
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Credentials from .env
const supabaseUrl = 'https://jxrsojmqzwfofmaxqscl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cnNvam1xendmb2ZtYXhxc2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTMwNDIsImV4cCI6MjA4MTM4OTA0Mn0.7RfpHj35Qt8myArlCfT5WVLkMnAMChGzgamy2agmY10';

const supabase = createClient(supabaseUrl, supabaseKey);

// Known tables from appStore.js analysis
const KNOWN_TABLES = [
    'payments',
    'managers',
    'knowledge_products',
    'knowledge_rules',
    'countries',
    'schedules',
    'leads',
    'channels',
    'kpi_product_rates',
    'kpi_settings',
    'app_settings',
    'activity_logs',
    'work_shifts',
    'salary_adjustments',
    'users'
];

async function analyzeTable(tableName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 TABLE: ${tableName.toUpperCase()}`);
    console.log('='.repeat(60));

    try {
        // 1. Get row count
        const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

        if (countError) {
            if (countError.code === '42P01' || countError.message?.includes('does not exist')) {
                console.log(`❌ Table does not exist`);
                return null;
            }
            throw countError;
        }

        console.log(`📈 Total rows: ${count}`);

        // 2. Get sample data (first 3 rows)
        const { data: sampleData, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(3);

        if (sampleError) throw sampleError;

        // 3. Infer column structure from sample data
        if (sampleData && sampleData.length > 0) {
            const columns = Object.keys(sampleData[0]);
            console.log(`\n📋 Columns (${columns.length}):`);

            columns.forEach(col => {
                const sampleValue = sampleData[0][col];
                const valueType = sampleValue === null ? 'null' : typeof sampleValue;
                const isArray = Array.isArray(sampleValue);
                console.log(`   - ${col}: ${isArray ? 'array' : valueType}`);
            });

            console.log(`\n📝 Sample data (first row):`);
            const row = sampleData[0];
            Object.entries(row).forEach(([key, value]) => {
                let displayValue = value;
                if (typeof value === 'string' && value.length > 60) {
                    displayValue = value.substring(0, 60) + '...';
                }
                if (typeof value === 'object' && value !== null) {
                    displayValue = JSON.stringify(value).substring(0, 60);
                    if (JSON.stringify(value).length > 60) displayValue += '...';
                }
                console.log(`      ${key}: ${displayValue}`);
            });
        } else {
            console.log('   (No data in table)');
        }

        return {
            name: tableName,
            rowCount: count,
            columns: sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : [],
            sample: sampleData ? sampleData[0] : null
        };

    } catch (error) {
        console.error(`❌ Error analyzing ${tableName}:`, error.message);
        return null;
    }
}

async function analyzeDatabase() {
    console.log('🚀 AstroPanel Database Analyzer');
    console.log('================================\n');
    console.log(`📅 Analysis date: ${new Date().toISOString()}\n`);

    const results = {
        analyzedAt: new Date().toISOString(),
        tables: []
    };

    for (const table of KNOWN_TABLES) {
        const result = await analyzeTable(table);
        if (result) {
            results.tables.push(result);
        }
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));

    const existingTables = results.tables.filter(t => t !== null);
    console.log(`\n✅ Found ${existingTables.length} tables:`);

    existingTables.forEach(t => {
        console.log(`   - ${t.name}: ${t.rowCount} rows, ${t.columns.length} columns`);
    });

    // Relationship hints
    console.log('\n🔗 Detected relationships:');
    existingTables.forEach(t => {
        const fkColumns = t.columns.filter(c => c.endsWith('_id') && c !== 'id');
        if (fkColumns.length > 0) {
            console.log(`   ${t.name}:`);
            fkColumns.forEach(fk => {
                const refTable = fk.replace('_id', '') + 's';
                console.log(`      → ${fk} → (likely ${refTable})`);
            });
        }
    });

    // Write JSON report
    fs.writeFileSync('./database_analysis.json', JSON.stringify(results, null, 2));
    console.log(`\n💾 Full report saved to: database_analysis.json`);

    return results;
}

// Run
analyzeDatabase().catch(console.error);
