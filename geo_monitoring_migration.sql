-- ГЕО (Мониторинг) — Add columns to countries table
ALTER TABLE countries ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;
