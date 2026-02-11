-- Reset payment_audit_exceptions table to fix RLS and schema issues

-- 1. Drop existing table to ensure clean slate
DROP TABLE IF EXISTS payment_audit_exceptions;

-- 2. Create table with correct UUID types
CREATE TABLE payment_audit_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES managers(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE payment_audit_exceptions ENABLE ROW LEVEL SECURITY;

-- 4. Grants (Crucial for RLS to work properly)
GRANT ALL ON payment_audit_exceptions TO authenticated;
GRANT ALL ON payment_audit_exceptions TO service_role;

-- 5. Policies
-- Read (All authenticated users can read)
CREATE POLICY "Enable read access for authenticated users" ON payment_audit_exceptions
    FOR SELECT TO authenticated USING (true);

-- Insert (All authenticated users can insert)
CREATE POLICY "Enable insert access for authenticated users" ON payment_audit_exceptions
    FOR INSERT TO authenticated WITH CHECK (true);

-- Delete (All authenticated users can delete)
CREATE POLICY "Enable delete access for authenticated users" ON payment_audit_exceptions
    FOR DELETE TO authenticated USING (true);
