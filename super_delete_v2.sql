-- Run this in Supabase SQL Editor to fix the "Invalid UUID" error.

-- 1. Drop the incorrect version of the function (which expected UUID)
DROP FUNCTION IF EXISTS delete_category_forcefully(uuid);

-- 2. Create the correct version accepting Integer IDs (BIGINT)
-- The error "invalid input syntax for type uuid: "7"" proves your IDs are numbers, not UUIDs.
CREATE OR REPLACE FUNCTION delete_category_forcefully(target_category_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Delete ALL expenses linked to this category
    DELETE FROM expenses WHERE category_id = target_category_id;

    -- 2. Delete the category itself
    DELETE FROM categories WHERE id = target_category_id;
END;
$$;
