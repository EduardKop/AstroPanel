import { createClient } from '@supabase/supabase-js';

// В Vite переменные окружения должны начинаться с VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Supabase credentials missing! Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);