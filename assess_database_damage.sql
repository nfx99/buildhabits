-- Comprehensive database assessment
-- This will show us exactly what state your database is in

-- Check if tables exist
SELECT 'Tables that exist:' as info;
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if backup tables exist
SELECT 'Backup tables (if any):' as info;
SELECT table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%backup%';

-- Check habits table structure
SELECT 'Habits table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'habits'
ORDER BY ordinal_position;

-- Check habit_completions table structure  
SELECT 'Habit_completions table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'habit_completions'
ORDER BY ordinal_position;

-- Count data
SELECT 'Data counts:' as info;
SELECT 
  'habits' as table_name,
  COUNT(*) as row_count
FROM habits
UNION ALL
SELECT 
  'habit_completions' as table_name,
  COUNT(*) as row_count
FROM habit_completions;

-- Show sample habits data
SELECT 'Sample habits (first 10):' as info;
SELECT id, name, created_at, color, is_quantifiable, target_value, metric_unit
FROM habits 
ORDER BY created_at DESC 
LIMIT 10;

-- Show sample completions data
SELECT 'Sample completions (first 10):' as info;
SELECT id, habit_id, date, value, created_at
FROM habit_completions 
ORDER BY created_at DESC 
LIMIT 10;

-- Check RLS status
SELECT 'RLS status:' as info;
SELECT 
  schemaname, 
  tablename, 
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('habits', 'habit_completions');

-- Check constraints
SELECT 'Constraints:' as info;
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conrelid IN ('habits'::regclass, 'habit_completions'::regclass);

SELECT 'Assessment complete. Please share these results.' as status; 