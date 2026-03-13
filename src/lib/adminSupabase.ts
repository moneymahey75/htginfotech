/**
 * Admin Supabase Client
 *
 * Uses the Supabase service role key to bypass RLS entirely.
 * ONLY import this in admin panel components — never in customer-facing code.
 *
 * Usage in admin components:
 * import { supabase } from '../lib/adminSupabase'
 *
 * Required .env variable:
 * VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 * Get it from: Supabase Dashboard → Project Settings → API → service_role (secret)
 *
 * After adding the env variable, restart your dev server:
 * npm run dev
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
      '❌ Missing environment variable: VITE_SUPABASE_URL\n' +
      'Add it to your .env file.'
  );
}

if (!serviceRoleKey) {
  throw new Error(
      '❌ Missing environment variable: VITE_SUPABASE_SERVICE_ROLE_KEY\n' +
      'Add it to your .env file:\n' +
      'VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...\n\n' +
      'Get it from: Supabase Dashboard → Project Settings → API → service_role (secret)\n\n' +
      'After adding it, restart your dev server: npm run dev'
  );
}

/**
 * Admin Supabase client initialized with service role key.
 * Bypasses all RLS policies — has full unrestricted database access.
 *
 * Security notes:
 * - This key is safe to use here because the admin panel has its own
 *   authentication gate (tbl_admin_users login)
 * - Deploy the admin panel separately from the customer-facing app
 * - Never commit .env to git — add it to .gitignore
 */
export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});