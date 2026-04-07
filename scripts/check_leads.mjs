import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.from('leads').select('*').limit(1);
  if (error) console.error('Error:', error);
  else console.log('Leads cols:', data && data.length > 0 ? Object.keys(data[0]) : 'no data');
}
check();
