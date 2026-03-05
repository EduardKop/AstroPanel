import { supabase } from './db.js';

// Helpers
function getStartOfDay(dateStr) {
    return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

function getEndOfDay(dateStr) {
    return new Date(`${dateStr}T23:59:59.999Z`).toISOString();
}

export async function getCountries() {
    const { data } = await supabase.from('countries').select('code, name, emoji').order('code');
    return data || [];
}

export async function getCountryMap() {
    const rows = await getCountries();
    const map = {};
    rows.forEach(r => { map[r.code] = { name: r.name, emoji: r.emoji || '' }; });
    return map;
}

export async function getSalesByManagerForDay(dateStr) {
    // 1. Fetch payments
    const { data: payments } = await supabase
        .from('enriched_payments_view')
        .select('*')
        .gte('transaction_date', getStartOfDay(dateStr))
        .lte('transaction_date', getEndOfDay(dateStr));

    if (!payments) return [];

    // 2. Fetch all managers to map manager_id to names (as done in appStore.js)
    const { data: managers } = await supabase
        .from('managers')
        .select('id, name, telegram_username, role');

    const mgrMap = {};
    (managers || []).forEach(m => mgrMap[m.id] = m);

    // 3. Aggregate
    const managerStats = {};

    payments.forEach(p => {
        const mgrInfo = mgrMap[p.manager_id] || { name: p.manager_name || 'Не назначен' };
        if (mgrInfo.role === 'Consultant') return; // Exclude Consultants like GeoMatrixPage
        const mgrName = mgrInfo.name;

        if (!managerStats[mgrName]) {
            managerStats[mgrName] = {
                manager_name: mgrName,
                telegram_username: mgrInfo.telegram_username || null,
                role: mgrInfo.role || null,
                countries: new Set(),
                new_sales: 0,
                repeat_sales: 0,
                total_sales: 0,
                revenue_eur: 0
            };
        }

        const stats = managerStats[mgrName];
        if (p.country) stats.countries.add(p.country);

        stats.total_sales++;
        if (p.is_repeat) {
            stats.repeat_sales++;
        } else {
            stats.new_sales++;
        }
        stats.revenue_eur += Number(p.amount_eur || 0);
    });

    const result = Object.values(managerStats).map(s => ({
        ...s,
        countries: Array.from(s.countries).sort().join(', '),
        revenue_eur: Math.round(s.revenue_eur * 100) / 100
    }));

    return result.sort((a, b) => b.total_sales - a.total_sales);
}

export async function getSalesByGeoForDay(dateStr) {
    const { data: payments } = await supabase
        .from('enriched_payments_view')
        .select('*')
        .gte('transaction_date', getStartOfDay(dateStr))
        .lte('transaction_date', getEndOfDay(dateStr));

    if (!payments) return [];

    const { data: managers } = await supabase.from('managers').select('id, role');
    const mgrMap = {};
    (managers || []).forEach(m => mgrMap[m.id] = m);

    const countryMap = await getCountryMap();
    const geoStats = {};

    payments.forEach(p => {
        if (!p.country) return;
        const role = mgrMap[p.manager_id]?.role;
        if (role === 'Consultant') return;

        const cCode = p.country.toUpperCase();
        if (!geoStats[cCode]) {
            geoStats[cCode] = {
                country: cCode,
                country_name: countryMap[cCode]?.name || cCode,
                emoji: countryMap[cCode]?.emoji || '',
                new_sales: 0,
                repeat_sales: 0,
                total_sales: 0,
                revenue_eur: 0
            };
        }

        const stats = geoStats[cCode];
        stats.total_sales++;
        if (p.is_repeat) {
            stats.repeat_sales++;
        } else {
            stats.new_sales++;
        }
        stats.revenue_eur += Number(p.amount_eur || 0);
    });

    const result = Object.values(geoStats).map(s => ({
        ...s,
        revenue_eur: Math.round(s.revenue_eur * 100) / 100
    }));

    return result.sort((a, b) => b.total_sales - a.total_sales);
}

export async function getTrafficByGeoForDay(dateStr) {
    const { data: stats } = await supabase.rpc('get_lead_stats_v2', {
        start_date: getStartOfDay(dateStr),
        end_date: getEndOfDay(dateStr)
    });

    if (!stats) return [];

    // get_lead_stats_v2 returns channel_id (which is actually wazzup_id in the db)... we need channels to get country.
    // AstroPanel does this mapping via channels
    const { data: accounts } = await supabase.from('channels').select('wazzup_id, country_code');
    const accountMap = {};
    (accounts || []).forEach(a => {
        if (a.country_code && a.wazzup_id) accountMap[a.wazzup_id] = a.country_code.toUpperCase();
    });

    const countryMap = await getCountryMap();

    const geoTraffic = {};

    stats.forEach(row => {
        const geo = accountMap[row.channel_id] || 'OTHER';
        if (!geoTraffic[geo]) {
            geoTraffic[geo] = {
                country: geo,
                country_name: countryMap[geo]?.name || geo,
                emoji: countryMap[geo]?.emoji || '',
                leads_direct: 0,
                leads_comments: 0,
                leads_total: 0
            };
        }

        const count = Number(row.count) || 0;
        geoTraffic[geo].leads_total += count;
        if (row.is_comment) {
            geoTraffic[geo].leads_comments += count;
        } else if (!row.is_whatsapp) {
            geoTraffic[geo].leads_direct += count;
        }
    });

    return Object.values(geoTraffic).sort((a, b) => b.leads_total - a.leads_total);
}

export async function getHistory7Days(dateStr) {
    return []; // We don't need this complex UI element for simple bot queries
}

export async function getDailySummary(dateStr) {
    const { data: payments } = await supabase
        .from('enriched_payments_view')
        .select('*')
        .gte('transaction_date', getStartOfDay(dateStr))
        .lte('transaction_date', getEndOfDay(dateStr));

    const { data: managers } = await supabase.from('managers').select('id, role');
    const mgrMap = {};
    (managers || []).forEach(m => mgrMap[m.id] = m);

    let total_sales = 0;
    let total_revenue_eur = 0;
    const activeManagers = new Set();
    const activeGeos = new Set();

    (payments || []).forEach(p => {
        if (mgrMap[p.manager_id]?.role === 'Consultant') return;

        total_sales++;
        total_revenue_eur += Number(p.amount_eur || 0);
        if (p.manager_name) activeManagers.add(p.manager_name);
        if (p.country) activeGeos.add(p.country);
    });

    return {
        total_sales,
        total_revenue_eur,
        active_managers: activeManagers.size,
        active_geos: activeGeos.size
    };
}

export async function getActiveManagers() {
    const { data } = await supabase
        .from('users')
        .select('id, name, telegram_username, role, geo')
        .eq('is_active', true)
        .in('role', ['sales', 'seniorsales', 'saletaro', 'consultant', 'SalesTaro', 'SeniorSales', 'Consultant', 'Sales'])
        .order('role')
        .order('name');

    return data || [];
}
