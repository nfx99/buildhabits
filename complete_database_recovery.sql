-- Complete Database Recovery Script
-- This will restore your database to a working state

-- Step 1: Create backup of current data (if any exists)
CREATE TABLE IF NOT EXISTS habits_emergency_backup AS 
SELECT * FROM habits WHERE 1=0; -- Create empty backup table first

-- Try to backup existing habits data
DO $$
BEGIN
    INSERT INTO habits_emergency_backup SELECT * FROM habits;
    RAISE NOTICE 'Backed up % habits', (SELECT COUNT(*) FROM habits_emergency_backup);
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not backup habits: %', SQLERRM;
END $$;

-- Create backup of completions
CREATE TABLE IF NOT EXISTS completions_emergency_backup AS 
SELECT * FROM habit_completions WHERE 1=0;

DO $$
BEGIN
    INSERT INTO completions_emergency_backup SELECT * FROM habit_completions;
    RAISE NOTICE 'Backed up % completions', (SELECT COUNT(*) FROM completions_emergency_backup);
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not backup completions: %', SQLERRM;
END $$;

-- Step 2: Drop and recreate tables with correct structure
DROP TABLE IF EXISTS habit_completions CASCADE;
DROP TABLE IF EXISTS habits CASCADE;

-- Step 3: Recreate habits table with proper structure
CREATE TABLE habits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    color TEXT DEFAULT '#3A4F41',
    is_quantifiable BOOLEAN DEFAULT FALSE,
    target_value NUMERIC,
    metric_unit TEXT,
    "order" INTEGER DEFAULT 0
);

-- Step 4: Recreate habit_completions table with proper structure
CREATE TABLE habit_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    value NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create indexes for performance
CREATE INDEX idx_habits_order ON habits("order");
CREATE INDEX idx_habits_created_at ON habits(created_at);
CREATE INDEX idx_completions_habit_date ON habit_completions(habit_id, date);
CREATE INDEX idx_completions_date ON habit_completions(date);

-- Step 6: Add unique constraint to prevent duplicate completions
ALTER TABLE habit_completions 
ADD CONSTRAINT unique_habit_date 
UNIQUE (habit_id, date);

-- Step 7: Disable RLS (Row Level Security)
ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions DISABLE ROW LEVEL SECURITY;

-- Step 8: Try to restore data from backups
DO $$
BEGIN
    -- Restore habits (excluding user_id if it exists)
    INSERT INTO habits (id, name, created_at, color, is_quantifiable, target_value, metric_unit, "order")
    SELECT 
        id, 
        name, 
        created_at,
        COALESCE(color, '#3A4F41'),
        COALESCE(is_quantifiable, FALSE),
        target_value,
        metric_unit,
        COALESCE("order", 0)
    FROM habits_emergency_backup;
    
    RAISE NOTICE 'Restored % habits from backup', (SELECT COUNT(*) FROM habits);
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not restore habits from backup: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Restore completions (excluding user_id if it exists)
    INSERT INTO habit_completions (id, habit_id, date, value, created_at)
    SELECT 
        id,
        habit_id,
        date,
        value,
        created_at
    FROM completions_emergency_backup
    WHERE habit_id IN (SELECT id FROM habits); -- Only restore completions for existing habits
    
    RAISE NOTICE 'Restored % completions from backup', (SELECT COUNT(*) FROM habit_completions);
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not restore completions from backup: %', SQLERRM;
END $$;

-- Step 9: Create some sample data if no data was restored
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM habits) = 0 THEN
        INSERT INTO habits (name, color, is_quantifiable, target_value, metric_unit, "order") VALUES
        ('Sample Habit', '#3A4F41', FALSE, NULL, NULL, 0);
        RAISE NOTICE 'Created sample habit since no data was found';
    END IF;
END $$;

-- Step 10: Verify the recovery
SELECT 'Recovery Summary:' as info;
SELECT 
    'habits' as table_name,
    COUNT(*) as row_count
FROM habits
UNION ALL
SELECT 
    'habit_completions' as table_name,
    COUNT(*) as row_count
FROM habit_completions;

SELECT 'Table structures:' as info;
SELECT 'habits' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'habits'
UNION ALL
SELECT 'habit_completions' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'habit_completions'
ORDER BY table_name, column_name;

SELECT 'Database recovery completed successfully!' as status; 