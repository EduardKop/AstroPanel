-- ====================================================
-- CREATE TABLE: manager_rates
-- Индивидуальные ставки сотрудников (Sales/SeniorSales/SalesTaro)
-- ====================================================

CREATE TABLE IF NOT EXISTS manager_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
  base_rate NUMERIC DEFAULT 0,         -- базовая ставка ($)
  bonus NUMERIC DEFAULT 0,             -- надбавка ($)
  penalty NUMERIC DEFAULT 0,           -- штраф ($)
  month TEXT DEFAULT NULL,             -- NULL = навсегда (default), '2026-02' = конкретный месяц
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manager_id, month)            -- одна запись на сотрудника + месяц (NULL тоже уникален)
);

-- RLS: разрешаем всё (как в остальных таблицах проекта)
ALTER TABLE manager_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON manager_rates FOR ALL USING (true) WITH CHECK (true);
