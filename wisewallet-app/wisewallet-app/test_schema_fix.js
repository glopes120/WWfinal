
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://uczfpbyaedxytlulxisw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCategoryInsert() {
  // Try to insert a category with a dummy UUID (simulating a user)
  // We use a random UUID to avoid foreign key constraint issues if we used a real one that didn't exist,
  // BUT the column references auth.users(id). So we MUST use a real user ID or a service role bypass.
  // Since we don't have a logged-in user context here easily without a token, 
  // we will just check if the column exists by selecting it.
  
  const { data, error } = await supabase.from('categories').select('user_id').limit(1);
  
  if (error) {
    console.error('Error selecting user_id:', error.message);
  } else {
    console.log('Success: user_id column exists and is selectable.');
  }
}

testCategoryInsert();
