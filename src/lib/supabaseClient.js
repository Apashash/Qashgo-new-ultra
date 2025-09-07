import { createClient } from '@supabase/supabase-js';

// Remplacez par votre URL et clé de projet Supabase
const supabaseUrl = 'https://pajrouwmuevmepgnwciu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhanJvdXdtdWV2bWVwZ253Y2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODQ2ODksImV4cCI6MjA3MjU2MDY4OX0.86R8VTBgrJAqaYxkCrTPT9xe3Zzo-2Z_dMzARD6Wh6w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create admin client for operations that need elevated permissions
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});