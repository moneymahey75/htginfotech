/*
  # Add Missing RLS Policies
  
  ## Problem
  Two tables have RLS enabled but no policies, making them completely inaccessible:
  - tbl_email_templates
  - tbl_tutor_assignments
  
  ## Solution
  Add comprehensive RLS policies for both tables
  
  ## Changes
  1. tbl_email_templates - Add service role and admin policies
  2. tbl_tutor_assignments - Add service role and admin policies
*/

-- ============================================================================
-- TBL_EMAIL_TEMPLATES
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to email templates"
ON tbl_email_templates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view all templates
CREATE POLICY "Admins can view all email templates"
ON tbl_email_templates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

-- Admins can insert templates
CREATE POLICY "Admins can insert email templates"
ON tbl_email_templates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

-- Admins can update templates
CREATE POLICY "Admins can update email templates"
ON tbl_email_templates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

-- Admins can delete templates
CREATE POLICY "Admins can delete email templates"
ON tbl_email_templates
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

-- ============================================================================
-- TBL_TUTOR_ASSIGNMENTS
-- ============================================================================

-- Service role full access
CREATE POLICY "Service role full access to tutor assignments"
ON tbl_tutor_assignments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view all assignments
CREATE POLICY "Admins can view all tutor assignments"
ON tbl_tutor_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

-- Admins can create assignments
CREATE POLICY "Admins can create tutor assignments"
ON tbl_tutor_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

-- Admins can update assignments
CREATE POLICY "Admins can update tutor assignments"
ON tbl_tutor_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

-- Admins can delete assignments
CREATE POLICY "Admins can delete tutor assignments"
ON tbl_tutor_assignments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

-- Tutors can view their assignments
CREATE POLICY "Tutors can view their assignments"
ON tbl_tutor_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_tutors
    WHERE tt_id = tta_tutor_id
    AND tt_user_id = (SELECT auth.uid())
    AND tt_is_active = true
  )
);

-- Learners can view their assignments
CREATE POLICY "Learners can view their assignments"
ON tbl_tutor_assignments
FOR SELECT
TO authenticated
USING (tta_learner_id = (SELECT auth.uid()));
