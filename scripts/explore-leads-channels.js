/**
 * 🔍 Скрипт для исследования таблиц leads и channels (ТОЛЬКО ЧТЕНИЕ)
 * 
 * Использование:
 *   node scripts/explore-leads-channels.js <SUPABASE_URL> <SERVICE_ROLE_KEY>
 * 
 * Что делает:
 *   1. Показывает структуру (колонки) таблиц leads и channels
 *   2. Показывает примеры данных (первые 5 строк)
 *   3. Анализирует связь channel_id между leads и channels
 *   4. Показывает статистику по channel_id в leads
 */

import { createClient } from '@supabase/supabase-js';

// 1. Get credentials from Args or Env
const supabaseUrl = process.argv[2] || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.argv[3] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Ошибка: Не указаны URL или SERVICE_ROLE_KEY');
    console.log('Использование: node scripts/explore-leads-channels.js <URL> <SERVICE_KEY>');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: fetch a limited number of rows
const fetchSample = async (table, limit = 5) => {
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(limit);

    if (error) {
        console.error(`❌ Ошибка при чтении ${table}:`, error.message);
        return null;
    }
    return data;
};

// Helper: count rows
const countRows = async (table) => {
    const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error(`❌ Ошибка при подсчёте ${table}:`, error.message);
        return 0;
    }
    return count;
};

// Helper: fetch all rows (with pagination)
const fetchAll = async (table) => {
    let allData = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .range(from, from + step - 1);

        if (error) {
            console.error(`❌ Ошибка:`, error.message);
            return allData;
        }
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
    }
    return allData;
};

const separator = () => console.log('\n' + '═'.repeat(70) + '\n');

const run = async () => {
    console.log('🔍 Исследование таблиц leads и channels (READ ONLY)\n');

    // ═══════════════════════════════════════════════
    // 1. CHANNELS TABLE
    // ═══════════════════════════════════════════════
    separator();
    console.log('📺 ТАБЛИЦА: channels');
    separator();

    const channelsCount = await countRows('channels');
    console.log(`Всего строк: ${channelsCount}`);

    const channelsSample = await fetchSample('channels', 100); // likely small table, get all
    if (channelsSample && channelsSample.length > 0) {
        console.log(`\n📋 Колонки таблицы channels:`);
        const cols = Object.keys(channelsSample[0]);
        cols.forEach(col => {
            const sampleVal = channelsSample[0][col];
            const type = sampleVal === null ? 'null' : typeof sampleVal;
            console.log(`   • ${col} (${type}) — пример: ${JSON.stringify(sampleVal)}`);
        });

        console.log(`\n📊 ВСЕ каналы (${channelsSample.length} шт.):`);
        channelsSample.forEach((ch, i) => {
            console.log(`   ${i + 1}. id=${ch.id} | ${JSON.stringify(ch)}`);
        });
    }

    // ═══════════════════════════════════════════════
    // 2. LEADS TABLE
    // ═══════════════════════════════════════════════
    separator();
    console.log('👤 ТАБЛИЦА: leads');
    separator();

    const leadsCount = await countRows('leads');
    console.log(`Всего строк: ${leadsCount}`);

    const leadsSample = await fetchSample('leads', 5);
    if (leadsSample && leadsSample.length > 0) {
        console.log(`\n📋 Колонки таблицы leads:`);
        const cols = Object.keys(leadsSample[0]);
        cols.forEach(col => {
            const sampleVal = leadsSample[0][col];
            const type = sampleVal === null ? 'null' : typeof sampleVal;
            console.log(`   • ${col} (${type}) — пример: ${JSON.stringify(sampleVal)}`);
        });

        console.log(`\n📄 Первые 5 лидов:`);
        leadsSample.forEach((lead, i) => {
            console.log(`   ${i + 1}. id=${lead.id} | channel_id=${lead.channel_id} | ${JSON.stringify(lead)}`);
        });
    }

    // ═══════════════════════════════════════════════
    // 3. АНАЛИЗ СВЯЗИ channel_id
    // ═══════════════════════════════════════════════
    separator();
    console.log('🔗 АНАЛИЗ СВЯЗИ: leads.channel_id → channels');
    separator();

    // Fetch all leads to analyze channel_id distribution
    console.log('Загрузка всех лидов для анализа...');
    const allLeads = await fetchAll('leads');
    console.log(`Загружено лидов: ${allLeads.length}`);

    // Count leads per channel_id
    const channelIdStats = {};
    let nullChannelCount = 0;
    allLeads.forEach(lead => {
        if (lead.channel_id === null || lead.channel_id === undefined) {
            nullChannelCount++;
        } else {
            channelIdStats[lead.channel_id] = (channelIdStats[lead.channel_id] || 0) + 1;
        }
    });

    console.log(`\n📊 Распределение лидов по channel_id:`);
    console.log(`   • Без channel_id (null): ${nullChannelCount}`);

    // Map channel IDs to names
    const channelMap = {};
    if (channelsSample) {
        channelsSample.forEach(ch => {
            channelMap[ch.id] = ch.name || ch.title || ch.channel_name || ch.username || JSON.stringify(ch);
        });
    }

    const sorted = Object.entries(channelIdStats).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([channelId, count]) => {
        const channelName = channelMap[channelId] || '(неизвестный канал)';
        console.log(`   • channel_id=${channelId} → ${count} лидов — Канал: ${channelName}`);
    });

    // ═══════════════════════════════════════════════
    // 4. ПРИМЕРЫ ЛИДОВ С РАЗНЫМИ channel_id
    // ═══════════════════════════════════════════════
    separator();
    console.log('🔎 ПРИМЕРЫ ЛИДОВ ПО КАЖДОМУ channel_id:');
    separator();

    // Show 2 sample leads for each channel_id
    const uniqueChannelIds = [...new Set(allLeads.map(l => l.channel_id).filter(Boolean))];
    for (const chId of uniqueChannelIds.slice(0, 10)) { // Show max 10 channels
        const channelName = channelMap[chId] || '(неизвестный)';
        console.log(`\n   📺 Channel: ${channelName} (id=${chId})`);
        const examples = allLeads.filter(l => l.channel_id === chId).slice(0, 2);
        examples.forEach((lead, i) => {
            // Show key fields, not entire object
            const keyFields = {};
            Object.keys(lead).forEach(k => {
                if (lead[k] !== null && lead[k] !== undefined && lead[k] !== '') {
                    keyFields[k] = lead[k];
                }
            });
            console.log(`      ${i + 1}. ${JSON.stringify(keyFields)}`);
        });
    }

    // ═══════════════════════════════════════════════
    // 5. ПОИСК ЛОГИКИ ПРИСВОЕНИЯ channel_id
    // ═══════════════════════════════════════════════
    separator();
    console.log('🧩 АНАЛИЗ: Как присваивается channel_id?');
    separator();

    // Check if channel_id correlates with any lead field
    if (allLeads.length > 0) {
        const sampleLead = allLeads[0];
        console.log('Все поля лида для анализа:');
        Object.keys(sampleLead).forEach(key => {
            console.log(`   ${key}: ${JSON.stringify(sampleLead[key])}`);
        });

        // Check if there's a source/utm/referrer field that maps to channels
        const possibleSourceFields = ['source', 'utm_source', 'referrer', 'platform', 'origin', 'lead_source', 'from'];
        console.log('\n🔍 Проверка полей-источников:');
        possibleSourceFields.forEach(field => {
            if (sampleLead.hasOwnProperty(field)) {
                const uniqueVals = [...new Set(allLeads.map(l => l[field]).filter(Boolean))];
                console.log(`   ✅ Поле "${field}" существует! Уникальные значения (первые 10): ${uniqueVals.slice(0, 10).join(', ')}`);
            } else {
                console.log(`   ❌ Поле "${field}" не существует`);
            }
        });
    }

    separator();
    console.log('✅ Исследование завершено! Все операции были только на чтение.');
};

run().catch(err => {
    console.error('💥 Критическая ошибка:', err);
    process.exit(1);
});
