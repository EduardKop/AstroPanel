
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchedules() {
    console.log('Checking schedules for PL on 2026-01-17...');

    const { data, error } = await supabase
        .from('schedules')
        .select(`
      id,
      date,
      geo_code,
      manager_id,
      managers (name)
    `)
        .eq('date', '2026-01-17')
        .ilike('geo_code', '%PL%');

    if (error) {
        console.error('Error fetching schedules:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} entries:`);
        data.forEach(item => {
            const managerName = item.managers ? item.managers.name : 'Unknown';
            console.log(`- ID: ${item.id}, Manager: ${managerName} (${item.manager_id}), GEO: ${item.geo_code}`);
        });
    } else {
        console.log('No entries found for PL on 2026-01-17');
    }
}

checkSchedules();
