-- Debug script to test the fetchHabits query (FIXED)
-- This will help identify what's causing the "error fetching habits"

-- Test 1: Check if tables exist and have data
SELECT 'Tables exist check:' as test;
SELECT 
  (SELECT COUNT(*) FROM habits) as habits_count,
  (SELECT COUNT(*) FROM habit_completions) as completions_count;

-- Test 2: Simple habits query (what the app is trying to do)
SELECT 'Simple habits query:' as test;
SELECT id, name, created_at, color, is_quantifiable, target_value, metric_unit, "order"
FROM habits 
ORDER BY "order" ASC NULLS LAST, created_at DESC
LIMIT 5;

-- Test 3: Test the join query (habits with completions)
SELECT 'Habits with completions join:' as test;
SELECT 
  h.id as habit_id,
  h.name,
  h.color,
  h.is_quantifiable,
  COUNT(hc.id) as completion_count
FROM habits h
LEFT JOIN habit_completions hc ON h.id = hc.habit_id
GROUP BY h.id, h.name, h.color, h.is_quantifiable
ORDER BY h."order" ASC NULLS LAST, h.created_at DESC;

-- Test 4: Check for any problematic data
SELECT 'Data validation:' as test;
SELECT 
  'habits_with_null_names' as issue,
  COUNT(*) as count
FROM habits 
WHERE name IS NULL
UNION ALL
SELECT 
  'habits_with_invalid_order' as issue,
  COUNT(*) as count
FROM habits 
WHERE "order" < 0
UNION ALL
SELECT 
  'completions_with_invalid_habit_id' as issue,
  COUNT(*) as count
FROM habit_completions hc
LEFT JOIN habits h ON hc.habit_id = h.id
WHERE h.id IS NULL;

-- Test 5: Sample of actual data structure
SELECT 'Sample habit data:' as test;
SELECT 
  id,
  name,
  created_at,
  color,
  is_quantifiable,
  target_value,
  metric_unit,
  "order"
FROM habits 
ORDER BY created_at DESC
LIMIT 3;

SELECT 'Sample completion data:' as test;
SELECT 
  hc.id,
  hc.habit_id,
  h.name as habit_name,
  hc.date,
  hc.value,
  hc.created_at
FROM habit_completions hc
JOIN habits h ON hc.habit_id = h.id
ORDER BY hc.created_at DESC
LIMIT 3;

SELECT 'Debug completed. Check browser console for app errors.' as status; 