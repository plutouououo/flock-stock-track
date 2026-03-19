import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function seedOwner() {
  // Sign up the owner
  const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
    email: 'owner@aj33.com', // Placeholder email
    password: 'password123', // Placeholder password
  });

  if (authError) {
    console.error('Error signing up owner:', authError);
    return;
  }

  const userId = authData.user.id;

  // Insert profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: userId,
      role: 'owner',
      full_name: 'AJ33 Owner',
      username: 'aj33_owner',
      phone: '08111111111111',
    });

  if (profileError) {
    console.error('Error inserting profile:', profileError);
    return;
  }

  // Insert settings
  const { error: settingsError } = await supabaseAdmin
    .from('settings')
    .insert({
      key: 'sales_target_daily',
      value: '14000000',
    });

  if (settingsError) {
    console.error('Error inserting settings:', settingsError);
    return;
  }

  console.log('Owner seeded successfully. User ID:', userId);
}

seedOwner();