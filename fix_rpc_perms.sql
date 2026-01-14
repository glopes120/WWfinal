-- Run this in Supabase SQL Editor
-- Ensure the function is executable and correct.

-- 1. Re-create the function to be absolutely sure
CREATE OR REPLACE FUNCTION delete_category_forcefully(target_category_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM expenses WHERE category_id = target_category_id;
    DELETE FROM categories WHERE id = target_category_id;
END;
$$;

-- 2. Grant permissions
GRANT EXECUTE ON FUNCTION delete_category_forcefully(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_category_forcefully(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION delete_category_forcefully(BIGINT) TO anon; -- just in case
