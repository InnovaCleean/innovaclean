import { createClient } from '@supabase/supabase-js';

// Setup environment variables
// If these are missing, the app will fallback to empty data or show an error,
// which is expected until the user configures them.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
