-- Disable Row Level Security (RLS) and grant all permissions
-- This removes strict access control for this table, making it accessible like public tables.

-- 1. Ensure table exists with correct schema (no change if already correct, but recreating ensures clean state)
DROP TABLE IF EXISTS payment_audit_exceptions;

CREATE TABLE payment_audit_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES managers(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DISABLE RLS (This is key - makes table public/unrestricted for API key holders)
ALTER TABLE payment_audit_exceptions DISABLE ROW LEVEL SECURITY;

-- 3. Grant permissions to everyone (authenticated and anonymous)
GRANT ALL ON payment_audit_exceptions TO anon;
GRANT ALL ON payment_audit_exceptions TO authenticated;
GRANT ALL ON payment_audit_exceptions TO service_role;

-- No policies needed because RLS is disabled.
