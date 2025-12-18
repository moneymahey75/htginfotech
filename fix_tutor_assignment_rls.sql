/*
  # Fix Tutor Assignment RLS Policies

  Run this SQL in your Supabase SQL Editor to fix the RLS policies
  for tutor assignments. This allows admins from tbl_admin_users to
  create and manage tutor assignments.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all tutor assignments" ON tbl_tutor_assignments;
DROP POLICY IF EXISTS "Tutors can view their assignments" ON tbl_tutor_assignments;
DROP POLICY IF EXISTS "Admins can create tutor assignments" ON tbl_tutor_assignments;
DROP POLICY IF EXISTS "Admins can update tutor assignments" ON tbl_tutor_assignments;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean AS $$
BEGIN
  -- Check if user is admin in tbl_users OR tbl_admin_users
  RETURN EXISTS (
    SELECT 1 FROM tbl_users
    WHERE tbl_users.tu_id = auth.uid()
    AND tbl_users.tu_user_type = 'admin'
    AND tbl_users.tu_is_active = true
  ) OR EXISTS (
    SELECT 1 FROM tbl_admin_users
    WHERE tbl_admin_users.tau_id = auth.uid()
    AND tbl_admin_users.tau_is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;

-- New policies using the helper function
CREATE POLICY "Admins can view all tutor assignments"
  ON tbl_tutor_assignments FOR SELECT
  TO authenticated
  USING (is_admin_user());

CREATE POLICY "Tutors can view their assignments"
  ON tbl_tutor_assignments FOR SELECT
  TO authenticated
  USING (tta_tutor_id = auth.uid());

CREATE POLICY "Admins can create tutor assignments"
  ON tbl_tutor_assignments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can update tutor assignments"
  ON tbl_tutor_assignments FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can delete tutor assignments"
  ON tbl_tutor_assignments FOR DELETE
  TO authenticated
  USING (is_admin_user());

-- Success message
SELECT 'RLS policies for tutor assignments have been updated successfully!' as status;
