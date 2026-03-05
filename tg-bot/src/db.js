import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function testConnection() {
    const { data, error } = await supabase
        .from('countries')
        .select('code')
        .limit(1);

    if (error) {
        throw new Error(`Supabase connection error: ${error.message}`);
    }

    return { db: 'Supabase Data SDK', ver: 'latest' };
}
