-- Run this script in your Supabase Dashboard SQL Editor to fix the categories table.
-- This version handles existing policies by dropping them first.

-- 1. Add the missing user_id column (if it doesn't exist yet)
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;

-- 4. Re-create Policies with correct permissions

-- Allow everyone to see all categories (so they can see Global ones + their own)
CREATE POLICY "Enable read access for all users"
ON categories FOR SELECT
USING (true);

-- Allow users to create their own categories
CREATE POLICY "Users can insert their own categories"
ON categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete ONLY their own categories (Security Fix)
CREATE POLICY "Users can delete their own categories"
ON categories FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to update their own categories
CREATE POLICY "Users can update their own categories"
ON categories FOR UPDATE
USING (auth.uid() = user_id);