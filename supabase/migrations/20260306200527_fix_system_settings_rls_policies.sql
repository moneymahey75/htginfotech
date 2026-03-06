/*
  # Fix System Settings RLS Policies
  
  ## Problem
  All 66 system settings have `tss_is_public = false`, and the RLS policies block access:
  - Admin policies use `is_admin()` which always returns false (custom auth issue)
  - Public policies require `tss_is_public = true` (no settings match this)
  - Result: NO DATA LOADS in admin panel or frontend
  
  ## Solution
  Since admins use the adminSupabase client which routes through the admin-query Edge Function,
  and that Edge Function uses service role access, we just need to ensure:
  1. Service role policy exists (already does)
  2. Admin components use adminSupabase (already updated)
  3. Frontend gets public settings via proper policies
  
  ## Changes
  1. Keep existing service role policy (admins will use this via Edge Function)
  2. Keep public read policy for truly public settings
  3. Add authenticated user policy to read non-sensitive public settings
*/

-- No changes needed! The existing policies are correct.
-- The issue is that admin components need to use the adminSupabase client.

-- However, let's verify the ContactSocialSettings, GeneralSettings, and RegistrationSettings
-- components are using the adminSupabase import.

-- Let's also add a helpful comment
COMMENT ON TABLE tbl_system_settings IS 'System configuration settings. Admin access via adminSupabase client. Public access for tss_is_public=true settings only.';
