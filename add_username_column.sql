-- Add username column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN username TEXT UNIQUE;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Add comment to document the column
COMMENT ON COLUMN user_profiles.username IS 'Unique username for the user, generated at signup and can be changed by user'; 