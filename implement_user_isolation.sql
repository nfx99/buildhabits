-- Implement proper user isolation
-- Each user will only see their own habits

-- Step 1: Add user_id columns back to both tables
ALTER TABLE habits ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE habit_completions ADD COLUMN IF NOT EXISTS user_id UUID;

-- Step 2: Check current data state
SELECT 'Current data state:' as info;
SELECT 
  COUNT(*) as total_habits,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as habits_with_user_id,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as habits_without_user_id
FROM habits;

SELECT 
  COUNT(*) as total_completions,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as completions_with_user_id,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as completions_without_user_id
FROM habit_completions;

-- Step 3: Get all user_ids from user_profiles table
SELECT 'Available users:' as info;
SELECT user_id, username, created_at 
FROM user_profiles 
ORDER BY created_at;

-- Step 4: Assign ownership of existing habits
-- We'll assign all existing habits to the first/oldest user
-- (You can modify this logic if you want different assignment)

DO $$
DECLARE
    oldest_user_id UUID;
BEGIN
    -- Get the oldest user (likely the main user)
    SELECT user_id INTO oldest_user_id 
    FROM user_profiles 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF oldest_user_id IS NOT NULL THEN
        -- Assign all habits without user_id to the oldest user
        UPDATE habits 
        SET user_id = oldest_user_id 
        WHERE user_id IS NULL;
        
        -- Assign all completions without user_id to the oldest user
        UPDATE habit_completions 
        SET user_id = oldest_user_id 
        WHERE user_id IS NULL;
        
        RAISE NOTICE 'Assigned all existing data to user: %', oldest_user_id;
    ELSE
        RAISE NOTICE 'No users found in user_profiles table';
    END IF;
END $$;

-- Step 5: Make user_id required (NOT NULL)
ALTER TABLE habits ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE habit_completions ALTER COLUMN user_id SET NOT NULL;

-- Step 6: Add foreign key constraints
ALTER TABLE habits 
DROP CONSTRAINT IF EXISTS fk_habits_user_id;

ALTER TABLE habits 
ADD CONSTRAINT fk_habits_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE habit_completions 
DROP CONSTRAINT IF EXISTS fk_habit_completions_user_id;

ALTER TABLE habit_completions 
ADD CONSTRAINT fk_habit_completions_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 7: Add unique constraint to prevent duplicate completions per user
ALTER TABLE habit_completions 
DROP CONSTRAINT IF EXISTS unique_habit_date_user;

ALTER TABLE habit_completions 
ADD CONSTRAINT unique_habit_date_user 
UNIQUE (habit_id, date, user_id);

-- Step 8: Enable Row Level Security
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies for habits
DROP POLICY IF EXISTS "Users can only see their own habits" ON habits;
DROP POLICY IF EXISTS "Users can only insert their own habits" ON habits;
DROP POLICY IF EXISTS "Users can only update their own habits" ON habits;
DROP POLICY IF EXISTS "Users can only delete their own habits" ON habits;

CREATE POLICY "Users can only see their own habits" ON habits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own habits" ON habits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own habits" ON habits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own habits" ON habits
    FOR DELETE USING (auth.uid() = user_id);

-- Step 10: Create RLS policies for habit_completions
DROP POLICY IF EXISTS "Users can only see their own completions" ON habit_completions;
DROP POLICY IF EXISTS "Users can only insert their own completions" ON habit_completions;
DROP POLICY IF EXISTS "Users can only update their own completions" ON habit_completions;
DROP POLICY IF EXISTS "Users can only delete their own completions" ON habit_completions;

CREATE POLICY "Users can only see their own completions" ON habit_completions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own completions" ON habit_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own completions" ON habit_completions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own completions" ON habit_completions
    FOR DELETE USING (auth.uid() = user_id);

-- Step 11: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_habit_date ON habit_completions(user_id, habit_id, date);

-- Step 12: Verify the setup
SELECT 'Final verification:' as info;
SELECT 
  user_id,
  COUNT(*) as habit_count
FROM habits 
GROUP BY user_id;

SELECT 
  user_id,
  COUNT(*) as completion_count
FROM habit_completions 
GROUP BY user_id;

SELECT 'User isolation implemented successfully!' as status;
SELECT 'Each user will now only see their own habits.' as note; 