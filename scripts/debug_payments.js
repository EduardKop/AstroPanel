/**
 * FULL DASHBOARD METRICS DIAGNOSTIC V2
 * With proper pagination for leads
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxrsojmqzwfofmaxqscl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cnNvam1xendmb2ZtYXhxc2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTMwNDIsImV4cCI6MjA4MTM4OTA0Mn0.7RfpHj35Qt8myArlCfT5WVLkMnAMChGzgamy2agmY10';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Normalize function (same as in appStore)
const normalizeNick = (val) => {
    if (!val) return '';
    return val
        .toLowerCase()
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
        .replace(/^@/, '')
        .replace(/[/?#].*$/, '')
        .trim();
};

// Fetch all with pagination (same as appStore)
async function fetchAll(table, columns) {
    const PAGE_SIZE = 1000;
    let allData = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
            .from(table)
            .select(columns)
            .range(from, to);

        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
            break;
        }

        if (data && data.length > 0) {
            allData = [...allData, ...data];
            if (data.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                page++;
            }
        } else {
            hasMore = false;
        }
    }

    return allData;
}

async function analyzeAllMetrics() {
    console.log('='.repeat(70));
    console.log('FULL DASHBOARD METRICS DIAGNOSTIC V2 (with pagination)');
    console.log('='.repeat(70));

    // Fetch ALL payments with pagination
    const payments = await fetchAll('payments', '*');

    // Fetch ALL leads with pagination
    const leads = await fetchAll('leads', 'wazzup_chat_id, is_comment');

    console.log(`\n📊 RAW DATA FROM DATABASE:`);
    console.log(`   Total Payments: ${payments.length}`);
    console.log(`   Total Leads: ${leads.length}`);

    // Build leadsSourceMap (same logic as appStore)
    const leadsSourceMap = {};
    leads.forEach(lead => {
        if (lead.wazzup_chat_id) {
            const normNick = normalizeNick(lead.wazzup_chat_id);
            if (normNick) {
                if (leadsSourceMap[normNick] !== 'comments') {
                    leadsSourceMap[normNick] = lead.is_comment ? 'comments' : 'direct';
                }
            }
        }
    });

    console.log(`   Unique nicknames in leadsSourceMap: ${Object.keys(leadsSourceMap).length}`);

    // Count how many leads are comments
    const commentLeads = leads.filter(l => l.is_comment === true).length;
    const directLeads = leads.filter(l => l.is_comment === false || l.is_comment === null).length;
    console.log(`   Leads marked is_comment=true: ${commentLeads}`);
    console.log(`   Leads marked is_comment=false/null: ${directLeads}`);

    // Process payments with source (same logic as appStore)
    const processedPayments = payments.map(p => {
        let source = 'direct';

        if (p.crm_link) {
            const cleanNick = normalizeNick(p.crm_link);
            const isPhoneNumber = /^[\d+\s()-]+$/.test(p.crm_link.trim());

            if (isPhoneNumber) {
                source = 'whatsapp';
            } else {
                if (leadsSourceMap[cleanNick]) {
                    source = leadsSourceMap[cleanNick];
                } else {
                    source = 'unknown';
                }
            }
        }

        return {
            ...p,
            source,
            cleanNick: normalizeNick(p.crm_link)
        };
    });

    // Calculate GLOBAL RANKS (same as DashboardPage paymentRanks)
    const paymentRanks = new Map();
    const grouped = {};

    processedPayments.forEach(p => {
        const link = p.crm_link ? p.crm_link.trim().toLowerCase() : null;
        if (!link || link === '—') return;
        if (!grouped[link]) grouped[link] = [];
        grouped[link].push(p);
    });

    Object.values(grouped).forEach(userPayments => {
        userPayments.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
        userPayments.forEach((p, index) => {
            paymentRanks.set(p.id, index + 1);
        });
    });

    // === ANALYSIS BY SOURCE ===
    console.log('\n' + '='.repeat(70));
    console.log('📈 ANALYSIS BY SOURCE FILTER');
    console.log('='.repeat(70));

    const sources = ['all', 'direct', 'comments', 'whatsapp', 'unknown'];

    sources.forEach(sourceFilter => {
        let filtered = processedPayments;

        if (sourceFilter !== 'all') {
            filtered = processedPayments.filter(p => p.source === sourceFilter);
        }

        // Calculate unique (rank=1) and second (rank=2) sales
        let uniqueSales = 0;
        let secondSales = 0;
        let totalAmount = 0;

        filtered.forEach(p => {
            const rank = paymentRanks.get(p.id);
            if (rank === 1) uniqueSales++;
            if (rank === 2) secondSales++;
            totalAmount += (p.amount_eur || 0);
        });

        console.log(`\n[${sourceFilter.toUpperCase()}]`);
        console.log(`   Total Payments: ${filtered.length}`);
        console.log(`   Unique Sales (rank=1): ${uniqueSales}`);
        console.log(`   Second Sales (rank=2): ${secondSales}`);
        console.log(`   Total EUR: €${totalAmount.toFixed(2)}`);
    });

    // === VERIFICATION MATH ===
    console.log('\n' + '='.repeat(70));
    console.log('✅ VERIFICATION');
    console.log('='.repeat(70));

    const directCount = processedPayments.filter(p => p.source === 'direct').length;
    const commentsCount = processedPayments.filter(p => p.source === 'comments').length;
    const whatsappCount = processedPayments.filter(p => p.source === 'whatsapp').length;
    const unknownCount = processedPayments.filter(p => p.source === 'unknown').length;

    console.log(`\n   Direct:   ${directCount}`);
    console.log(`   Comments: ${commentsCount}`);
    console.log(`   WhatsApp: ${whatsappCount}`);
    console.log(`   Unknown:  ${unknownCount}`);
    console.log(`   Sum:      ${directCount + commentsCount + whatsappCount + unknownCount}`);
    console.log(`   Total:    ${processedPayments.length}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ DIAGNOSTIC COMPLETE');
    console.log('='.repeat(70));
}

analyzeAllMetrics().catch(console.error);
