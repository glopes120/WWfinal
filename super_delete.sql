-- Run this in Supabase SQL Editor
-- This function allows you to forcefully delete ANY category and its linked expenses
-- effectively bypassing the foreign key constraint by doing it server-side.

CREATE OR REPLACE FUNCTION delete_category_forcefully(target_category_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Delete ALL expenses linked to this category (regardless of owner)
    DELETE FROM expenses WHERE category_id = target_category_id;

    -- 2. Delete the category itself
    DELETE FROM categories WHERE id = target_category_id;
END;
$$;
