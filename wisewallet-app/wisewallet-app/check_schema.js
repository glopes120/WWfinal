
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://uczfpbyaedxytlulxisw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Checking 'accounts' table schema...");
  const { data, error } = await supabase.from('accounts').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching accounts:', error);
  } else if (data && data.length > 0) {
    console.log('Columns found in accounts table:', Object.keys(data[0]));
  } else {
    console.log('Table accounts is empty, cannot infer columns from data.');
    // Try to insert a row with the new column to see if it fails
    // We won't actually insert, just checking if we can select it would be enough if we had it, but we don't.
    // Let's try to select the specific column.
    const { error: colError } = await supabase.from('accounts').select('is_safe_to_spend').limit(1);
    if (colError) {
        console.log("Column 'is_safe_to_spend' likely DOES NOT exist. Error:", colError.message);
    } else {
        console.log("Column 'is_safe_to_spend' EXISTS.");
    }
  }
}

checkSchema();
