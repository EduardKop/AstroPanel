-- ====================================================
-- ASTROPANEL DATABASE ANALYSIS SCRIPT
-- ====================================================

-- 1. List all tables in the database
\echo '=== ALL TABLES ==='
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 2. Analyze managers table structure (for roles)
\echo '=== MANAGERS TABLE STRUCTURE ==='
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'managers' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Show existing roles in managers table
\echo '=== EXISTING ROLES IN USE ==='
SELECT DISTINCT role, COUNT(*) as count FROM managers GROUP BY role ORDER BY count DESC;

-- 4. Analyze payments table structure
\echo '=== PAYMENTS TABLE STRUCTURE ==='
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Show existing products in payments
\echo '=== EXISTING PRODUCTS IN PAYMENTS ==='
SELECT DISTINCT product, COUNT(*) as count FROM payments GROUP BY product ORDER BY count DESC;

-- 6. Analyze app_settings table (for permissions)
\echo '=== APP_SETTINGS TABLE ==='
SELECT key, LEFT(value::text, 100) as value_preview FROM app_settings;

-- 7. Analyze countries table
\echo '=== COUNTRIES TABLE STRUCTURE ==='
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'countries' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Show all countries
\echo '=== ALL COUNTRIES ==='
SELECT * FROM countries ORDER BY code;

-- 9. Check KPI tables
\echo '=== KPI_PRODUCT_RATES ==='
SELECT * FROM kpi_product_rates ORDER BY product_name;
