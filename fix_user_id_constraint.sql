-- Fix user_id NOT NULL constraint issue
-- This will allow habits to be created without user_id

-- Check current constraints on habits table
SELECT 'Current constraints on habits:' as info;
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'habits'::regclass;

-- Check if user_id column exists and its constraints
SELECT 'User_id column info:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'habits' AND column_name = 'user_id';

-- Option 1: Remove the NOT NULL constraint from user_id
ALTER TABLE habits ALTER COLUMN user_id DROP NOT NULL;

-- Option 2: If you want to completely remove user_id column (cleaner approach)
-- Uncomment this line if you prefer to remove the column entirely:
-- ALTER TABLE habits DROP COLUMN IF EXISTS user_id;

-- Verify the fix
SELECT 'After fix - user_id column info:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'habits' AND column_name = 'user_id';

SELECT 'User_id constraint fixed. You should now be able to create habits.' as status; 