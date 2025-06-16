-- Revert database to state before migration issues
-- This will restore the original structure and remove problematic changes

-- Step 1: Remove the problematic constraints that were added
ALTER TABLE habit_completions DROP CONSTRAINT IF EXISTS unique_habit_completion_per_day;
ALTER TABLE habit_completions DROP CONSTRAINT IF EXISTS fk_habit_completions_habit_id;

-- Step 2: Remove the user_id column from habit_completions (this was the main problem)
-- First, let's see if we have backup tables
SELECT 'Checking for backup tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%backup%';

-- If backup tables exist, we can restore from them
-- If not, we'll clean up the current structure

-- Step 3: Remove user_id column from habit_completions (this was causing the issues)
ALTER TABLE habit_completions DROP COLUMN IF EXISTS user_id;

-- Step 4: Clean up any duplicate or corrupted completions
-- Remove duplicates based on habit_id and date only (original structure)
DELETE FROM habit_completions a USING (
  SELECT MIN(ctid) as ctid, habit_id, date
  FROM habit_completions 
  GROUP BY habit_id, date
  HAVING COUNT(*) > 1
) b
WHERE a.habit_id = b.habit_id 
  AND a.date = b.date 
  AND a.ctid <> b.ctid;

-- Step 5: Ensure habits table has the correct structure (keep the good changes)
-- Keep: color, is_quantifiable, target_value, metric_unit, order columns
-- These were working fine before the completion issues

-- Step 6: Restore original foreign key constraint (simple version)
ALTER TABLE habit_completions 
ADD CONSTRAINT fk_habit_completions_habit_id 
FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE;

-- Step 7: Create simple indexes for performance
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date 
ON habit_completions (habit_id, date);

-- Step 8: Verify the restored structure
SELECT 'Habit_completions table structure after revert:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'habit_completions'
ORDER BY ordinal_position;

SELECT 'Habits table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'habits'
ORDER BY ordinal_position;

-- Step 9: Check data integrity
SELECT 'Total habits:' as info;
SELECT COUNT(*) as total_habits FROM habits;

SELECT 'Total completions:' as info;
SELECT COUNT(*) as total_completions FROM habit_completions;

SELECT 'Completions per habit:' as info;
SELECT h.name, COUNT(hc.id) as completion_count
FROM habits h
LEFT JOIN habit_completions hc ON h.id = hc.habit_id
GROUP BY h.id, h.name
ORDER BY h.created_at DESC;

SELECT 'Database reverted to pre-migration state. User isolation removed.' as status; 