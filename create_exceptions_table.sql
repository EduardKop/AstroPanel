-- Create a table for managing payment audit exceptions
CREATE TABLE IF NOT EXISTS payment_audit_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES managers(id), -- Optional: Who added the exception
    reason TEXT, -- 'duplicate', 'future_date', 'anomalous_amount', 'link_in_nickname', or 'manual_hide'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_audit_exceptions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view exceptions
CREATE POLICY "Allow read access for authenticated users" ON payment_audit_exceptions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users (or specific roles) to insert exceptions
CREATE POLICY "Allow insert access for authenticated users" ON payment_audit_exceptions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete (remove exception)
CREATE POLICY "Allow delete access for authenticated users" ON payment_audit_exceptions
    FOR DELETE USING (auth.role() = 'authenticated');
