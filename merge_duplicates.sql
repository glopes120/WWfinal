-- MERGE DUPLICATE CATEGORIES SCRIPT
-- Run this in Supabase SQL Editor to combine categories with the same name.

DO $$
DECLARE
    r RECORD;
    master_id UUID;
BEGIN
    -- Iterate over category names that appear more than once
    FOR r IN 
        SELECT name, count(*) 
        FROM categories 
        GROUP BY name 
        HAVING count(*) > 1
    LOOP
        -- 1. Pick the first ID as the "Master"
        SELECT id INTO master_id 
        FROM categories 
        WHERE name = r.name 
        ORDER BY id LIMIT 1;

        -- 2. Move expenses from other IDs to the Master ID
        UPDATE expenses 
        SET category_id = master_id 
        WHERE category_id IN (
            SELECT id FROM categories WHERE name = r.name AND id != master_id
        );

        -- 3. Delete the other categories
        DELETE FROM categories 
        WHERE name = r.name AND id != master_id;
        
        RAISE NOTICE 'Merged category: %', r.name;
    END LOOP;
END $$;
