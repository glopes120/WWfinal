-- Run this in Supabase > SQL Editor

-- 1. Force Transfer ALL categories to your specific User ID
-- (I extracted this ID from your previous error logs)
UPDATE categories 
SET user_id = 'c3c0f83d-edab-4779-b8a2-e27860cf9dad'
WHERE user_id IS NULL OR user_id != 'c3c0f83d-edab-4779-b8a2-e27860cf9dad';

-- 2. Force Transfer ALL expenses to your specific User ID
-- (This fixes the "Key referenced" error by making sure you own the blocking expenses)
UPDATE expenses 
SET user_id = 'c3c0f83d-edab-4779-b8a2-e27860cf9dad'
WHERE user_id IS NULL OR user_id != 'c3c0f83d-edab-4779-b8a2-e27860cf9dad';
