/*
  # Optimize RLS Policies Part 1 - User Tables
  
  ## Problem
  RLS policies re-evaluate auth functions for each row, causing O(n) performance degradation.
  
  ## Solution
  Wrap auth.uid() and auth.jwt() in SELECT to evaluate once per query.
  
  ## Changes - Part 1
  Optimizing policies for:
  - tbl_users
  - tbl_user_profiles  
  - tbl_tutors
  - tbl_learning_progress
  - tbl_user_subscriptions
  - tbl_user_activity_logs
*/

-- TBL_USERS
DROP POLICY IF EXISTS "Users can read own data" ON tbl_users;
CREATE POLICY "Users can read own data"
ON tbl_users FOR SELECT
TO authenticated
USING (tu_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own data" ON tbl_users;
CREATE POLICY "Users can insert own data"
ON tbl_users FOR INSERT
TO authenticated
WITH CHECK (tu_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own data" ON tbl_users;
CREATE POLICY "Users can update own data"
ON tbl_users FOR UPDATE
TO authenticated
USING (tu_id = (SELECT auth.uid()))
WITH CHECK (tu_id = (SELECT auth.uid()));

-- TBL_USER_PROFILES
DROP POLICY IF EXISTS "Users can delete own profile" ON tbl_user_profiles;
CREATE POLICY "Users can delete own profile"
ON tbl_user_profiles FOR DELETE
TO authenticated
USING (tup_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Learners can view assigned tutor profiles" ON tbl_user_profiles;
CREATE POLICY "Learners can view assigned tutor profiles"
ON tbl_user_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_tutor_assignments ta
    JOIN tbl_tutors t ON ta.tta_tutor_id = t.tt_id
    WHERE t.tt_user_id = tup_user_id
    AND ta.tta_learner_id = (SELECT auth.uid())
    AND ta.tta_status = 'active'
  )
);

DROP POLICY IF EXISTS "Tutors can view assigned learner profiles" ON tbl_user_profiles;
CREATE POLICY "Tutors can view assigned learner profiles"
ON tbl_user_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_tutor_assignments ta
    JOIN tbl_tutors t ON ta.tta_tutor_id = t.tt_id
    WHERE ta.tta_learner_id = tup_user_id
    AND t.tt_user_id = (SELECT auth.uid())
    AND ta.tta_status = 'active'
  )
);

-- TBL_TUTORS
DROP POLICY IF EXISTS "Users can create own tutor profile" ON tbl_tutors;
CREATE POLICY "Users can create own tutor profile"
ON tbl_tutors FOR INSERT
TO authenticated
WITH CHECK (tt_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can deactivate own profile" ON tbl_tutors;
CREATE POLICY "Users can deactivate own profile"
ON tbl_tutors FOR UPDATE
TO authenticated
USING (tt_user_id = (SELECT auth.uid()))
WITH CHECK (tt_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Learners can view assigned tutors" ON tbl_tutors;
CREATE POLICY "Learners can view assigned tutors"
ON tbl_tutors FOR SELECT
TO authenticated
USING (
  tt_is_active = true AND
  EXISTS (
    SELECT 1 FROM tbl_tutor_assignments
    WHERE tta_tutor_id = tt_id
    AND tta_learner_id = (SELECT auth.uid())
    AND tta_status = 'active'
  )
);

-- TBL_LEARNING_PROGRESS
DROP POLICY IF EXISTS "Users can view own progress" ON tbl_learning_progress;
CREATE POLICY "Users can view own progress"
ON tbl_learning_progress FOR SELECT
TO authenticated
USING (tlp_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own progress" ON tbl_learning_progress;
CREATE POLICY "Users can insert own progress"
ON tbl_learning_progress FOR INSERT
TO authenticated
WITH CHECK (tlp_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own progress" ON tbl_learning_progress;
CREATE POLICY "Users can update own progress"
ON tbl_learning_progress FOR UPDATE
TO authenticated
USING (tlp_user_id = (SELECT auth.uid()))
WITH CHECK (tlp_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own progress" ON tbl_learning_progress;
CREATE POLICY "Users can delete own progress"
ON tbl_learning_progress FOR DELETE
TO authenticated
USING (tlp_user_id = (SELECT auth.uid()));

-- TBL_USER_SUBSCRIPTIONS
DROP POLICY IF EXISTS "Admins can view all user subscriptions" ON tbl_user_subscriptions;
CREATE POLICY "Admins can view all user subscriptions"
ON tbl_user_subscriptions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

DROP POLICY IF EXISTS "Admins can update all user subscriptions" ON tbl_user_subscriptions;
CREATE POLICY "Admins can update all user subscriptions"
ON tbl_user_subscriptions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

-- TBL_USER_ACTIVITY_LOGS
DROP POLICY IF EXISTS "Users can read own activity logs" ON tbl_user_activity_logs;
CREATE POLICY "Users can read own activity logs"
ON tbl_user_activity_logs FOR SELECT
TO authenticated
USING (tual_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Tutors can view assigned learner activity" ON tbl_user_activity_logs;
CREATE POLICY "Tutors can view assigned learner activity"
ON tbl_user_activity_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_tutor_assignments ta
    JOIN tbl_tutors t ON ta.tta_tutor_id = t.tt_id
    WHERE ta.tta_learner_id = tual_user_id
    AND t.tt_user_id = (SELECT auth.uid())
    AND ta.tta_status = 'active'
  )
);
