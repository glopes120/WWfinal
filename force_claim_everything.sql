-- Run this in Supabase > SQL Editor

-- 1. Transfer ALL categories to be owned by YOU
UPDATE categories 
SET user_id = auth.uid() 
WHERE user_id != auth.uid();

-- 2. Transfer ALL expenses to be owned by YOU
-- (This ensures you can delete them if they are linked to the categories)
UPDATE expenses 
SET user_id = auth.uid() 
WHERE user_id != auth.uid();
