-- Remove existing foreign key constraint
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_user_id_fkey;

-- Remove any orphaned records (goals without valid user_id)
DELETE FROM user_goals WHERE user_id IS NULL;

-- Make user_id NOT NULL (every goal must belong to a user)
ALTER TABLE user_goals ALTER COLUMN user_id SET NOT NULL;

-- Recreate foreign key constraint with CASCADE delete
ALTER TABLE user_goals 
ADD CONSTRAINT user_goals_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;