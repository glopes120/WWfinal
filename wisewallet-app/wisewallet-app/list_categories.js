
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://uczfpbyaedxytlulxisw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listCategories() {
  const { data, error } = await supabase.from('categories').select('id, name');
  if (error) {
    console.error('Error fetching categories:', error);
    return;
  }
  console.log('Categories:', JSON.stringify(data, null, 2));
}

listCategories();
