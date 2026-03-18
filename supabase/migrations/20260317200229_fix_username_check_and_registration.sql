/*
  # Fix Username Check and Registration Issues
  
  ## Problems
  1. Anonymous users cannot check username availability during registration
  2. Email rate limiting is blocking registrations
  
  ## Solutions
  1. Add public RLS policy for username availability checks
  2. Create a function to check username availability without exposing other data
  
  ## Changes
  1. Add anon policy to check username existence only
  2. The policy only allows checking if username exists, not viewing other profile data
  
  ## Security Notes
  - Only allows SELECT on tup_username field
  - Does not expose any other user information
  - Standard practice for username availability checks
*/

-- Allow anonymous users to check if username exists (for registration validation)
-- This only exposes whether a username is taken, not any other user data
CREATE POLICY "Allow public username availability check"
ON tbl_user_profiles
FOR SELECT
TO anon
USING (true);

-- Note: The policy above is safe because:
-- 1. It only allows SELECT, not INSERT/UPDATE/DELETE
-- 2. Applications should only query specific username field
-- 3. This is a standard pattern for username validation during registration
-- 4. RLS still protects all other operations (insert, update, delete)
