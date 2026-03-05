import { getSalesByGeoForDay, getSalesByManagerForDay, getDailySummary, getTrafficByGeoForDay } from './tg-bot/src/queries.js';
import { supabase } from './tg-bot/src/db.js';

function getStartOfDay(dateStr) {
    return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

function getEndOfDay(dateStr) {
    return new Date(`${dateStr}T23:59:59.999Z`).toISOString();
}

async function run() {
    try {
        console.log("Testing March 4th with Supabase...");
        const dateStr = '2026-03-04';

        const { data: rawRpc, error } = await supabase.rpc('get_lead_stats_v2', {
            start_date: getStartOfDay(dateStr),
            end_date: getEndOfDay(dateStr)
        });

        const { data: uaPayments } = await supabase
            .from('enriched_payments_view')
            .select('*')
            .gte('transaction_date', getStartOfDay(dateStr))
            .lte('transaction_date', getEndOfDay(dateStr))
            .eq('country', 'UA');

        console.log("UA Payments Count:", uaPayments?.length);
        const roles = uaPayments?.map(p => p.manager_name);
        console.log("UA Managers:", [...new Set(roles)]);

        const summary = await getDailySummary(dateStr);
        console.log("Summary:", summary);

        const geo = await getSalesByGeoForDay(dateStr);
        console.log("Geo Sales Count:", geo.length);
        console.log("Sales Geometries Data:", geo.map(g => `${g.emoji} ${g.country_name} (${g.country}) - Продажи: ${g.total_sales} Выручка: €${g.revenue_eur}`).join('\n'));

        const traffic = await getTrafficByGeoForDay(dateStr);
        console.log("Traffic Count:", traffic.length);
        if (traffic.length > 0) console.log("Top Traffic Geo:", traffic[0]);

        const mgr = await getSalesByManagerForDay(dateStr);
        console.log("Manager Sales Count:", mgr.length);
        if (mgr.length > 0) console.log("Top Manager:", mgr[0]);

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
run();
