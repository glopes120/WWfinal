-- Run this in Supabase > SQL Editor
-- This will convert ALL "System" (Global) categories to be YOURS.
-- After running this, you will be able to delete any category (as long as it has no transactions).

UPDATE categories
SET user_id = auth.uid()
WHERE user_id IS NULL;
