// src/utils/supabaseClient.js
// ─────────────────────────────────────────────────────────────
// Single Supabase client instance shared across the app.
// The env vars are safe to expose — Row Level Security (RLS)
// on the Supabase table controls what the anon key can do.
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '⚠️ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your .env file.\n' +
    'Referral tracking will not work until you add them.'
  );
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
);
