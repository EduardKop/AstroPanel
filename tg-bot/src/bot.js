import { Telegraf, Markup } from 'telegraf';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

import { testConnection } from './db.js';
import {
    getSalesByManagerForDay,
    getSalesByGeoForDay,
    getTrafficByGeoForDay,
    getHistory7Days,
    getDailySummary,
} from './queries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env') });

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is not set in .env');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ─── Session Store (in-memory) ─────────────────────────────────────────────────
// Format: { userId: { analysisType, waitingDate } }
const sessions = new Map();

function getSession(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, { analysisType: null, waitingDate: false });
    }
    return sessions.get(userId);
}

// ─── Access Control ────────────────────────────────────────────────────────────
const ALLOWED_IDS = process.env.ALLOWED_USER_IDS
    ? process.env.ALLOWED_USER_IDS.split(',').map(id => parseInt(id.trim())).filter(Boolean)
    : [];

function isAllowed(userId) {
    if (ALLOWED_IDS.length === 0) return true; // open access if not configured
    return ALLOWED_IDS.includes(userId);
}

// ─── Date Helpers ──────────────────────────────────────────────────────────────
function getTodayDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getYesterdayDate() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateRu(dateStr) {
    const [y, m, d] = dateStr.split('-');
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${d} ${months[parseInt(m) - 1]} ${y}`;
}

function isValidDate(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
}

// ─── Message Helpers ───────────────────────────────────────────────────────────

/** Split long messages to obey Telegram's 4096-char limit */
function splitMessage(text, maxLen = 4000) {
    if (text.length <= maxLen) return [text];
    const parts = [];
    let current = '';
    for (const line of text.split('\n')) {
        if (current.length + line.length + 1 > maxLen) {
            parts.push(current);
            current = line;
        } else {
            current += (current ? '\n' : '') + line;
        }
    }
    if (current) parts.push(current);
    return parts;
}

async function sendLong(ctx, text, extra = {}) {
    const parts = splitMessage(text);
    for (let i = 0; i < parts.length; i++) {
        await ctx.reply(parts[i], i === parts.length - 1 ? extra : {});
    }
}

// ─── Keyboards ─────────────────────────────────────────────────────────────────

function mainMenuKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('📊 По менеджеру', 'analysis:manager'),
            Markup.button.callback('🌍 По ГЕО', 'analysis:geo'),
        ]
    ]);
}

function datePickerKeyboard(analysisType) {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('📅 Сегодня', `date:today:${analysisType}`),
            Markup.button.callback('📅 Вчера', `date:yesterday:${analysisType}`),
        ],
        [
            Markup.button.callback('✏️ Указать дату', `date:custom:${analysisType}`),
        ],
        [
            Markup.button.callback('🔙 Назад', 'menu:main'),
        ],
    ]);
}

function backToMainKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Главное меню', 'menu:main')],
        [
            Markup.button.callback('📊 Снова менеджер', 'analysis:manager'),
            Markup.button.callback('🌍 Снова ГЕО', 'analysis:geo'),
        ],
    ]);
}

// ─── Format Function ───────────────────────────────────────────────────────────

function formatManagerStats(dateStr, salesByManager, summary) {
    let text = `📊 *Продажи по менеджерам*\n📅 Дата: *${formatDateRu(dateStr)}*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (!salesByManager || salesByManager.length === 0) {
        text += `_Нет продаж за этот день_\n\n`;
    } else {
        salesByManager.forEach(m => {
            text += `👤 *${m.manager_name}* ${m.role ? `(${m.role})` : ''}\n`;
            text += `🌍 ГЕО: ${m.countries || '-'}\n`;
            text += `💰 Выручка: €${m.revenue_eur || 0}\n`;
            text += `🛒 Продажи: ${m.total_sales || 0} (Новые: ${m.new_sales || 0} | Повт: ${m.repeat_sales || 0})\n\n`;
        });
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📈 *ИТОГО ЗА ДЕНЬ:*\n`;
    text += `• Продаж: ${summary?.total_sales ?? 0} | Выручка: €${summary?.total_revenue_eur ?? 0}\n`;
    text += `• Активных менеджеров: ${summary?.active_managers ?? 0}`;

    return text;
}

function formatGeoStats(dateStr, salesByGeo, trafficByGeo, summary) {
    let text = `🌍 *Трафик и Продажи по ГЕО*\n📅 Дата: *${formatDateRu(dateStr)}*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    const trafficMap = {};
    if (trafficByGeo) {
        trafficByGeo.forEach(t => { trafficMap[t.country] = t; });
    }

    const salesMap = {};
    if (salesByGeo) {
        salesByGeo.forEach(s => { salesMap[s.country] = s; });
    }

    const allGeos = new Set([...Object.keys(trafficMap), ...Object.keys(salesMap)]);

    if (allGeos.size === 0) {
        text += `_Нет данных за этот день_\n\n`;
    } else {
        const sortedGeos = Array.from(allGeos).sort((a, b) => {
            const revenueA = salesMap[a]?.revenue_eur || 0;
            const revenueB = salesMap[b]?.revenue_eur || 0;
            return revenueB - revenueA; // sort by revenue desc
        });

        sortedGeos.forEach(geo => {
            const s = salesMap[geo] || {};
            const t = trafficMap[geo] || {};

            const emoji = s.emoji || t.emoji || '';
            const name = s.country_name || t.country_name || geo;

            text += `${emoji} *${name} (${geo})*\n`;
            text += `👥 Трафик: ${t.leads_total || 0} (Direct: ${t.leads_direct || 0} | Comm: ${t.leads_comments || 0})\n`;
            text += `🛒 Продажи: ${s.total_sales || 0} (Новые: ${s.new_sales || 0} | Повт: ${s.repeat_sales || 0})\n`;
            if (s.revenue_eur) {
                text += `💰 Выручка: €${s.revenue_eur}\n`;
            }

            // Конверсия
            const leadsObj = parseInt(t.leads_total || 0);
            const salesObj = parseInt(s.total_sales || 0);

            if (leadsObj > 0) {
                const convAll = ((salesObj / leadsObj) * 100).toFixed(1);
                text += `🔄 Конверсия: ${convAll}%\n`;
            }

            text += `\n`;
        });
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📈 *ИТОГО ЗА ДЕНЬ:*\n`;
    text += `• Продаж: ${summary?.total_sales ?? 0} | Выручка: €${summary?.total_revenue_eur ?? 0}\n`;
    text += `• Активных ГЕО: ${summary?.active_geos ?? 0}`;

    return text;
}

// ─── Core Analysis Function ────────────────────────────────────────────────────

async function runAnalysis(ctx, userId, dateStr, analysisType) {
    const typeLabel = analysisType === 'manager' ? 'менеджерам' : 'ГЕО';

    // Loading message
    const loadMsg = await ctx.reply(
        `⏳ Сбор данных по ${typeLabel} за *${formatDateRu(dateStr)}*...\n\n` +
        `_Загружаю отчет из БД..._`,
        { parse_mode: 'Markdown' }
    );

    try {
        await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

        const [summary, salesByManager, salesByGeo, trafficByGeo] = await Promise.all([
            getDailySummary(dateStr),
            getSalesByManagerForDay(dateStr),
            getSalesByGeoForDay(dateStr),
            getTrafficByGeoForDay(dateStr).catch(() => []),
        ]);

        let responseText = '';

        if (analysisType === 'manager') {
            responseText = formatManagerStats(dateStr, salesByManager, summary);
        } else {
            responseText = formatGeoStats(dateStr, salesByGeo, trafficByGeo, summary);
        }

        // Delete loading message
        await ctx.telegram.deleteMessage(ctx.chat.id, loadMsg.message_id).catch(() => { });

        // Step 4: Send DB response (split if long)
        await sendLong(ctx, responseText, { parse_mode: 'Markdown', ...backToMainKeyboard() });

    } catch (err) {
        // Delete loading message on error
        await ctx.telegram.deleteMessage(ctx.chat.id, loadMsg.message_id).catch(() => { });

        console.error('Analysis error:', err.message);

        let errorText = `❌ *Ошибка получения данных:*\n\`${err.message}\``;
        if (err.message.includes('connect') || err.message.includes('database')) {
            errorText = `❌ Ошибка подключения к БД!\nПроверь \`DATABASE_URL\` в файле \`.env\``;
        }

        await ctx.reply(errorText, { parse_mode: 'Markdown', ...backToMainKeyboard() });
    }
}

// ─── Command Handlers ──────────────────────────────────────────────────────────

bot.start(async (ctx) => {
    const userId = ctx.from.id;

    if (!isAllowed(userId)) {
        return ctx.reply('⛔ Нет доступа. Обратитесь к администратору.');
    }

    const name = ctx.from.first_name || 'друг';

    await ctx.reply(
        `👋 Привет, *${name}*!\n\n` +
        `Это *AstroPanel Analytics Bot* — аналитика продаж и трафика.\n\n` +
        `📌 *Что доступно:*\n` +
        `• Отчет по менеджерам — продажи, выручка по каждому сотруднику\n` +
        `• Отчет по ГЕО — трафик, продажи и конверсия по каждой стране\n\n` +
        `Выбери действие:`,
        { parse_mode: 'Markdown', ...mainMenuKeyboard() }
    );
});

bot.command('menu', async (ctx) => {
    if (!isAllowed(ctx.from.id)) return;
    await ctx.reply('📋 Главное меню:', mainMenuKeyboard());
});

// ─── Callback Handlers ─────────────────────────────────────────────────────────

// Main menu
bot.action('menu:main', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `📋 *Главное меню*\n\nВыбери тип отчета:`,
        { parse_mode: 'Markdown', ...mainMenuKeyboard() }
    );
});

// Analysis type selection
bot.action(/^analysis:(manager|geo)$/, async (ctx) => {
    const analysisType = ctx.match[1];
    await ctx.answerCbQuery();

    const typeLabel = analysisType === 'manager' ? '📊 По менеджерам' : '🌍 По ГЕО';

    await ctx.editMessageText(
        `${typeLabel}\n\nВыбери дату для отчета:`,
        { parse_mode: 'Markdown', ...datePickerKeyboard(analysisType) }
    );
});

// Date selection: Today / Yesterday
bot.action(/^date:(today|yesterday):(manager|geo)$/, async (ctx) => {
    const when = ctx.match[1];
    const analysisType = ctx.match[2];

    await ctx.answerCbQuery();
    await ctx.deleteMessage().catch(() => { });

    const dateStr = when === 'today' ? getTodayDate() : getYesterdayDate();
    await runAnalysis(ctx, ctx.from.id, dateStr, analysisType);
});

// Custom date input request
bot.action(/^date:custom:(manager|geo)$/, async (ctx) => {
    const analysisType = ctx.match[1];
    await ctx.answerCbQuery();

    const session = getSession(ctx.from.id);
    session.waitingDate = true;
    session.analysisType = analysisType;

    await ctx.editMessageText(
        `✏️ *Введите дату* в формате \`ГГГГ-ММ-ДД\`\n\n` +
        `Пример: \`2026-03-04\`\n\n` +
        `_Или нажми /menu для отмены_`,
        { parse_mode: 'Markdown' }
    );
});

// ─── Text Handler (for custom date input) ──────────────────────────────────────

bot.on('text', async (ctx) => {
    if (!isAllowed(ctx.from.id)) return;

    const session = getSession(ctx.from.id);

    // Handle custom date input
    if (session.waitingDate) {
        const dateStr = ctx.message.text.trim();

        if (!isValidDate(dateStr)) {
            return ctx.reply(
                `❌ Неверный формат даты.\n\nВведи в формате \`ГГГГ-ММ-ДД\`, например: \`2026-03-04\``,
                { parse_mode: 'Markdown' }
            );
        }

        // Future date check
        if (dateStr > getTodayDate()) {
            return ctx.reply(`❌ Нельзя анализировать будущие даты.`);
        }

        session.waitingDate = false;
        const analysisType = session.analysisType;
        session.analysisType = null;

        await runAnalysis(ctx, ctx.from.id, dateStr, analysisType);
        return;
    }

    // Default response for unexpected text
    await ctx.reply(
        `Используй кнопки или команду /menu`,
        mainMenuKeyboard()
    );
});

// ─── Error Handler ─────────────────────────────────────────────────────────────

bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ Произошла ошибка. Попробуй ещё раз /menu').catch(() => { });
});

// ─── Launch ───────────────────────────────────────────────────────────────────

async function launch() {
    console.log('🤖 AstroPanel Analytics Bot starting...');

    // Test DB connection
    try {
        const info = await testConnection();
        console.log(`✅ Database: ${info.db} (${info.ver.split(' ').slice(0, 2).join(' ')})`);
    } catch (err) {
        console.error(`❌ DB Connection failed: ${err.message}`);
        console.log('⚠️  Bot will start but DB queries will fail. Check DATABASE_URL in .env');
    }

    await bot.launch();
    console.log('✅ Bot is running! Press Ctrl+C to stop.');

    // Graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

launch().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
