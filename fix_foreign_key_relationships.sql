-- Fix multiple foreign key relationships causing Supabase embed error
-- Error: "Could not embed because more than one relationship was found"

-- Step 1: Check current foreign key constraints
SELECT 'Current foreign key constraints:' as info;
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE contype = 'f' 
  AND (conrelid = 'habit_completions'::regclass OR confrelid = 'habit_completions'::regclass);

-- Step 2: Drop ALL foreign key constraints on habit_completions
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE contype = 'f' 
          AND conrelid = 'habit_completions'::regclass
    LOOP
        EXECUTE 'ALTER TABLE habit_completions DROP CONSTRAINT IF EXISTS ' || constraint_record.conname;
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- Step 3: Create ONE clean foreign key relationship
ALTER TABLE habit_completions 
ADD CONSTRAINT fk_habit_completions_habit_id 
FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE;

-- Step 4: Verify we now have exactly one foreign key relationship
SELECT 'Foreign key constraints after cleanup:' as info;
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE contype = 'f' 
  AND (conrelid = 'habit_completions'::regclass OR confrelid = 'habit_completions'::regclass);

-- Step 5: Test the relationship works
SELECT 'Test query - should work now:' as info;
SELECT 
  h.id,
  h.name,
  COUNT(hc.id) as completion_count
FROM habits h
LEFT JOIN habit_completions hc ON h.id = hc.habit_id
GROUP BY h.id, h.name
ORDER BY h.created_at DESC
LIMIT 3;

SELECT 'Foreign key relationships fixed! The app should work now.' as status; 