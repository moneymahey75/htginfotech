/*
  # Fix Remaining Security Issues

  ## Security Improvements

  1. Optimize Remaining RLS Policies with (select auth.uid())
  2. Fix Unrestricted RLS Policies
  3. Consolidate Duplicate Policies
  4. Fix Remaining Function Search Paths
*/

-- OPTIMIZE RLS POLICIES - TUTORS
DROP POLICY IF EXISTS "Tutors can update own profile" ON tbl_tutors;
CREATE POLICY "Tutors can update own profile" ON tbl_tutors FOR UPDATE TO authenticated
  USING (tt_user_id = (select auth.uid())) WITH CHECK (tt_user_id = (select auth.uid()));

-- OPTIMIZE RLS POLICIES - COURSE ENROLLMENTS
DROP POLICY IF EXISTS "Users can insert own enrollments" ON tbl_course_enrollments;
DROP POLICY IF EXISTS "Users can read own enrollments" ON tbl_course_enrollments;
CREATE POLICY "Users can insert own enrollments" ON tbl_course_enrollments FOR INSERT TO authenticated
  WITH CHECK (tce_user_id = (select auth.uid()));
CREATE POLICY "Users can read own enrollments" ON tbl_course_enrollments FOR SELECT TO authenticated
  USING (tce_user_id = (select auth.uid()));

-- OPTIMIZE RLS POLICIES - COURSE CONTENT
DROP POLICY IF EXISTS "Enrolled users can read course content" ON tbl_course_content;
CREATE POLICY "Enrolled users can read course content" ON tbl_course_content FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_course_enrollments
      WHERE tce_course_id = tbl_course_content.tcc_course_id
      AND tce_user_id = (select auth.uid())
      AND tce_is_active = true
    )
  );

-- OPTIMIZE RLS POLICIES - USERS
DROP POLICY IF EXISTS "Users can insert own data" ON tbl_users;
DROP POLICY IF EXISTS "Users can read own data" ON tbl_users;
DROP POLICY IF EXISTS "Users can update own data" ON tbl_users;
CREATE POLICY "Users can insert own data" ON tbl_users FOR INSERT WITH CHECK (tu_id = (select auth.uid()));
CREATE POLICY "Users can read own data" ON tbl_users FOR SELECT USING (tu_id = (select auth.uid()));
CREATE POLICY "Users can update own data" ON tbl_users FOR UPDATE
  USING (tu_id = (select auth.uid())) WITH CHECK (tu_id = (select auth.uid()));

-- OPTIMIZE RLS POLICIES - USER PROFILES
DROP POLICY IF EXISTS "Users can insert own profile" ON tbl_user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON tbl_user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON tbl_user_profiles;
CREATE POLICY "Users can insert own profile" ON tbl_user_profiles FOR INSERT TO authenticated
  WITH CHECK (tup_user_id = (select auth.uid()));
CREATE POLICY "Users can read own profile" ON tbl_user_profiles FOR SELECT TO authenticated
  USING (tup_user_id = (select auth.uid()));
CREATE POLICY "Users can update own profile" ON tbl_user_profiles FOR UPDATE TO authenticated
  USING (tup_user_id = (select auth.uid())) WITH CHECK (tup_user_id = (select auth.uid()));

-- OPTIMIZE RLS POLICIES - USER SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON tbl_user_subscriptions;
DROP POLICY IF EXISTS "Users can read own subscriptions" ON tbl_user_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON tbl_user_subscriptions FOR INSERT TO authenticated
  WITH CHECK (tus_user_id = (select auth.uid()));
CREATE POLICY "Users can read own subscriptions" ON tbl_user_subscriptions FOR SELECT TO authenticated
  USING (tus_user_id = (select auth.uid()));

-- OPTIMIZE RLS POLICIES - PAYMENTS
DROP POLICY IF EXISTS "Users can insert own payments" ON tbl_payments;
DROP POLICY IF EXISTS "Users can read own payments" ON tbl_payments;
CREATE POLICY "Users can insert own payments" ON tbl_payments FOR INSERT TO authenticated
  WITH CHECK (tp_user_id = (select auth.uid()));
CREATE POLICY "Users can read own payments" ON tbl_payments FOR SELECT TO authenticated
  USING (tp_user_id = (select auth.uid()));

-- OPTIMIZE RLS POLICIES - USER ACTIVITY LOGS
DROP POLICY IF EXISTS "Users can insert own activity logs" ON tbl_user_activity_logs;
DROP POLICY IF EXISTS "Users can read own activity logs" ON tbl_user_activity_logs;
CREATE POLICY "Users can insert own activity logs" ON tbl_user_activity_logs FOR INSERT TO authenticated
  WITH CHECK (tual_user_id = (select auth.uid()));
CREATE POLICY "Users can read own activity logs" ON tbl_user_activity_logs FOR SELECT TO authenticated
  USING (tual_user_id = (select auth.uid()));

-- OPTIMIZE RLS POLICIES - STRIPE CONNECT ACCOUNTS
DROP POLICY IF EXISTS "Admins can delete Stripe accounts" ON tbl_stripe_connect_accounts;
DROP POLICY IF EXISTS "Admins can insert Stripe accounts" ON tbl_stripe_connect_accounts;
DROP POLICY IF EXISTS "Admins can update Stripe accounts" ON tbl_stripe_connect_accounts;
DROP POLICY IF EXISTS "Admins can view all Stripe accounts" ON tbl_stripe_connect_accounts;
CREATE POLICY "Admins can manage Stripe accounts" ON tbl_stripe_connect_accounts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));

-- OPTIMIZE RLS POLICIES - TUTOR ASSIGNMENTS
DROP POLICY IF EXISTS "Admins can create tutor assignments" ON tbl_tutor_assignments;
DROP POLICY IF EXISTS "Admins can update tutor assignments" ON tbl_tutor_assignments;
CREATE POLICY "Admins can create tutor assignments" ON tbl_tutor_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));
CREATE POLICY "Admins can update tutor assignments" ON tbl_tutor_assignments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));

-- OPTIMIZE RLS POLICIES - VIDEO ACCESS GRANTS
DROP POLICY IF EXISTS "Tutors can create access grants" ON tbl_video_access_grants;
DROP POLICY IF EXISTS "Tutors can update their grants" ON tbl_video_access_grants;
CREATE POLICY "Tutors can create access grants" ON tbl_video_access_grants FOR INSERT TO authenticated
  WITH CHECK (tvag_granted_by = (select auth.uid()));
CREATE POLICY "Tutors can update their grants" ON tbl_video_access_grants FOR UPDATE TO authenticated
  USING (tvag_granted_by = (select auth.uid())) WITH CHECK (tvag_granted_by = (select auth.uid()));

-- FIX UNRESTRICTED RLS POLICIES
DROP POLICY IF EXISTS "Admins can manage own sessions" ON tbl_admin_sessions;
CREATE POLICY "Admins can manage own sessions" ON tbl_admin_sessions FOR ALL TO authenticated
  USING (tas_admin_id IN (SELECT tau_id FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true))
  WITH CHECK (tas_admin_id IN (SELECT tau_id FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));

DROP POLICY IF EXISTS "Authenticated users can delete system settings" ON tbl_system_settings;
DROP POLICY IF EXISTS "Authenticated users can insert system settings" ON tbl_system_settings;
DROP POLICY IF EXISTS "Authenticated users can update system settings" ON tbl_system_settings;
CREATE POLICY "Admins can delete system settings" ON tbl_system_settings FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));
CREATE POLICY "Admins can insert system settings" ON tbl_system_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));
CREATE POLICY "Admins can update system settings" ON tbl_system_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));

-- CONSOLIDATE REMAINING DUPLICATE POLICIES
DROP POLICY IF EXISTS "Admins can read own or super admin sees all" ON tbl_admin_users;
DROP POLICY IF EXISTS "Admins can update own or super admin updates all" ON tbl_admin_users;
DROP POLICY IF EXISTS "Super admins can create and delete admins" ON tbl_admin_users;

CREATE POLICY "Admins can read own or super admin sees all" ON tbl_admin_users FOR SELECT TO authenticated
  USING (tau_auth_uid = (select auth.uid()) OR EXISTS (SELECT 1 FROM tbl_admin_users a WHERE a.tau_auth_uid = (select auth.uid()) AND a.tau_role = 'super_admin' AND a.tau_is_active = true));

CREATE POLICY "Admins can update own or super admin updates all" ON tbl_admin_users FOR UPDATE TO authenticated
  USING (tau_auth_uid = (select auth.uid()) OR EXISTS (SELECT 1 FROM tbl_admin_users a WHERE a.tau_auth_uid = (select auth.uid()) AND a.tau_role = 'super_admin' AND a.tau_is_active = true))
  WITH CHECK (tau_auth_uid = (select auth.uid()) OR EXISTS (SELECT 1 FROM tbl_admin_users a WHERE a.tau_auth_uid = (select auth.uid()) AND a.tau_role = 'super_admin' AND a.tau_is_active = true));

CREATE POLICY "Super admins can create and delete admins" ON tbl_admin_users FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users a WHERE a.tau_auth_uid = (select auth.uid()) AND a.tau_role = 'super_admin' AND a.tau_is_active = true));

DROP POLICY IF EXISTS "Service role full access to OTP" ON tbl_otp_verifications;
CREATE POLICY "Service role full access to OTP" ON tbl_otp_verifications FOR ALL USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Public can view active sliders" ON tbl_sliders;
DROP POLICY IF EXISTS "Admins have full access to sliders" ON tbl_sliders;
CREATE POLICY "Public can view active sliders" ON tbl_sliders FOR SELECT USING (ts_is_active = true);
CREATE POLICY "Admins have full access to sliders" ON tbl_sliders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));

-- FIX REMAINING FUNCTION SEARCH PATHS
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT p.oid::regprocedure::text as func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND p.proname IN (
      'update_slider_timestamp', 'update_tce_updated_at', 'update_tbl_user_profiles_updated_at',
      'update_tvss_updated_at', 'update_updated_at_column', 'auto_generate_sponsorship_number',
      'update_admin_updated_at_column', 'update_tcc_updated_at', 'validate_payment_splits',
      'get_payment_splits_for_course', 'register_user', 'register_user_v1',
      'update_user_profiles_updated_at_column', 'update_users_updated_at', 'register_user_v2'
    )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', func_record.func_signature);
  END LOOP;
END $$;