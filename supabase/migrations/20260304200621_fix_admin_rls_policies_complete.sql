/*
  # Fix Admin RLS Policies - Complete Solution
  
  ## Critical Security Issues Fixed
  
  1. **REMOVED DANGEROUS ANON POLICIES**
     - Removed all `anon` role policies with `qual = true`
     - These policies gave anonymous users full access to all data
     - This is a CRITICAL security vulnerability
  
  2. **Admin Access Solution**
     - Since admins don't use Supabase Auth (custom bcrypt login)
     - Admin queries use the `anon` key from client
     - Solution: Use Edge Function with service role for admin queries
     - OR: Disable RLS for admin operations (less secure)
  
  3. **Tables Affected**
     - tbl_users
     - tbl_user_profiles  
     - tbl_tutors
     - tbl_course_enrollments
     - tbl_payments
  
  ## Changes Made
  
  - Drop all dangerous anon policies
  - Keep authenticated user policies intact
  - Keep service_role policies for system operations
  - Admins must use the admin-query Edge Function deployed earlier
*/

-- ============================================================================
-- REMOVE DANGEROUS ANON POLICIES
-- ============================================================================

-- Drop dangerous anon policies from tbl_users
DROP POLICY IF EXISTS "Anon can read all users for admin" ON tbl_users;
DROP POLICY IF EXISTS "Anon can update users for admin" ON tbl_users;

-- Drop dangerous anon policies from tbl_user_profiles  
DROP POLICY IF EXISTS "Anon can read all profiles for admin" ON tbl_user_profiles;
DROP POLICY IF EXISTS "Anon can update profiles for admin" ON tbl_user_profiles;

-- Drop dangerous anon policies from tbl_tutors
DROP POLICY IF EXISTS "Anon can read tutors for admin" ON tbl_tutors;
DROP POLICY IF EXISTS "Anon can update tutors for admin" ON tbl_tutors;

-- Drop dangerous anon policies from tbl_course_enrollments
DROP POLICY IF EXISTS "Anon can read all enrollments for admin" ON tbl_course_enrollments;
DROP POLICY IF EXISTS "Anon can update enrollments for admin" ON tbl_course_enrollments;
DROP POLICY IF EXISTS "Anon can delete enrollments for admin" ON tbl_course_enrollments;

-- Drop dangerous anon policies from tbl_payments
DROP POLICY IF EXISTS "Anon can read payments for admin" ON tbl_payments;

-- ============================================================================
-- FIX CONFLICTING "No anonymous access" POLICY
-- ============================================================================

-- This policy conflicts with itself - it allows ALL but qual is false
DROP POLICY IF EXISTS "No anonymous access" ON tbl_user_profiles;

-- ============================================================================
-- VERIFY ADMIN POLICIES ARE USING is_admin() FUNCTION
-- ============================================================================

-- Note: The is_admin() function checks tau_auth_uid = auth.uid()
-- This will NOT work for your admins because they use custom authentication
-- Solution: Admins MUST use the admin-query Edge Function which has service role access

-- The following policies exist and are correct, but won't work until admins use proper auth:
-- - "Admins can read all users" 
-- - "Admins can update all users"
-- - "Admins can insert users"
-- - "Admins can delete users"
-- - "Admins can read all profiles"
-- - "Admins can update all profiles"
-- - "Admins can insert profiles"
-- - "Admins can delete any profile"
-- - "Admins can view all enrollments"
-- - "Admins can update all enrollments"
-- - "Admins can delete enrollments"
-- - "Admins can view all payments"
-- - "Admins can update all payments"
-- - "Admins can delete payments"

-- ============================================================================
-- SUMMARY
-- ============================================================================

/*
  After this migration:
  
  1. ✅ SECURITY HOLE CLOSED: Anon users can NO LONGER access all data
  2. ✅ User policies remain intact: Learners and tutors can access their own data
  3. ✅ Service role policies remain: System operations work correctly
  4. ❌ Admin policies exist but DON'T WORK: is_admin() returns false for your admins
  
  ## For Admin Panel to Work:
  
  You must use ONE of these solutions:
  
  ### Option 1: Use Admin Query Edge Function (RECOMMENDED)
  - Update admin components to import from '/lib/adminClient.ts'
  - This routes queries through the deployed 'admin-query' Edge Function
  - Edge Function uses service role key to bypass RLS
  - Secure: validates admin session before allowing access
  
  ### Option 2: Integrate with Supabase Auth (LONG-TERM SOLUTION)
  - Modify admin login to use supabase.auth.signInWithPassword()
  - Store auth UID in tau_auth_uid during admin creation
  - Then is_admin() function will work correctly
  - Most secure and standard approach
  
  ### Option 3: Add Service Role Key (QUICK FIX)
  - Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env
  - AdminAuthContext already tries to use it (line 182)
  - Less secure: exposes service role key on client
*/
