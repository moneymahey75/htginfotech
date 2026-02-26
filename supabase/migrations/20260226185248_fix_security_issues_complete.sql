/*
  # Comprehensive Security Fixes

  ## Critical Security Improvements

  1. Foreign Key Indexes - Add missing indexes
  2. RLS Policy Optimization - Use (select auth.uid())
  3. Enable RLS on All Tables
  4. Remove Duplicate Indexes
  5. Consolidate Policies
  6. Fix Function Search Paths
*/

-- ADD MISSING FOREIGN KEY INDEXES
CREATE INDEX IF NOT EXISTS idx_tbl_admin_activity_logs_admin_id ON tbl_admin_activity_logs(taal_admin_id);
CREATE INDEX IF NOT EXISTS idx_tbl_admin_users_created_by ON tbl_admin_users(tau_created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_learning_progress_content_id ON tbl_learning_progress(tlp_content_id);
CREATE INDEX IF NOT EXISTS idx_tbl_payment_split_transactions_stripe_account_id ON tbl_payment_split_transactions(tpst_stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_tbl_payments_subscription_id ON tbl_payments(tp_subscription_id);
CREATE INDEX IF NOT EXISTS idx_tbl_sessions_course_id ON tbl_sessions(ts_course_id);
CREATE INDEX IF NOT EXISTS idx_tbl_sliders_created_by ON tbl_sliders(ts_created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_sliders_updated_by ON tbl_sliders(ts_updated_by);
CREATE INDEX IF NOT EXISTS idx_tbl_tutor_assignments_assigned_by ON tbl_tutor_assignments(tta_assigned_by);
CREATE INDEX IF NOT EXISTS idx_tbl_user_subscriptions_plan_id ON tbl_user_subscriptions(tus_plan_id);
CREATE INDEX IF NOT EXISTS idx_tbl_video_access_grants_granted_by ON tbl_video_access_grants(tvag_granted_by);

-- REMOVE DUPLICATE INDEXES
DROP INDEX IF EXISTS idx_tbl_course_enrollments_user_id;
DROP INDEX IF EXISTS idx_tbl_payments_user_id;
ALTER TABLE tbl_users DROP CONSTRAINT IF EXISTS tbl_users_tu_id_unique;

-- ENABLE RLS ON ALL TABLES
ALTER TABLE tbl_admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_payment_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_sliders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_stripe_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_tutor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_video_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_video_storage_settings ENABLE ROW LEVEL SECURITY;

-- OPTIMIZE RLS POLICIES
DROP POLICY IF EXISTS "Admins can view split transactions" ON tbl_payment_split_transactions;
DROP POLICY IF EXISTS "Users can view their own split transactions" ON tbl_payment_split_transactions;
CREATE POLICY "Admins can view split transactions" ON tbl_payment_split_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));
CREATE POLICY "Users can view their own split transactions" ON tbl_payment_split_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_payments p WHERE p.tp_id = tpst_payment_id AND p.tp_user_id = (select auth.uid())));

DROP POLICY IF EXISTS "otp_insert_own" ON tbl_otp_verifications;
DROP POLICY IF EXISTS "otp_select_own" ON tbl_otp_verifications;
DROP POLICY IF EXISTS "otp_update_own" ON tbl_otp_verifications;
DROP POLICY IF EXISTS "service_role_full_access_otp" ON tbl_otp_verifications;
DROP POLICY IF EXISTS "Users can read own OTP" ON tbl_otp_verifications;
DROP POLICY IF EXISTS "Users can insert own OTP" ON tbl_otp_verifications;
DROP POLICY IF EXISTS "Users can update own OTP" ON tbl_otp_verifications;
CREATE POLICY "Users can read own OTP" ON tbl_otp_verifications FOR SELECT USING (tov_user_id = (select auth.uid()));
CREATE POLICY "Users can insert own OTP" ON tbl_otp_verifications FOR INSERT WITH CHECK (tov_user_id = (select auth.uid()));
CREATE POLICY "Users can update own OTP" ON tbl_otp_verifications FOR UPDATE USING (tov_user_id = (select auth.uid())) WITH CHECK (tov_user_id = (select auth.uid()));
CREATE POLICY "Service role full access to OTP" ON tbl_otp_verifications FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can manage own progress" ON tbl_learning_progress;
CREATE POLICY "Users can manage own progress" ON tbl_learning_progress FOR ALL TO authenticated
  USING (tlp_user_id = (select auth.uid())) WITH CHECK (tlp_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own session participation" ON tbl_session_participants;
DROP POLICY IF EXISTS "Users can insert own session participation" ON tbl_session_participants;
CREATE POLICY "Users can read own session participation" ON tbl_session_participants FOR SELECT TO authenticated USING (tsp_user_id = (select auth.uid()));
CREATE POLICY "Users can insert own session participation" ON tbl_session_participants FOR INSERT TO authenticated WITH CHECK (tsp_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own reviews" ON tbl_reviews_ratings;
CREATE POLICY "Users can insert own reviews" ON tbl_reviews_ratings FOR INSERT TO authenticated WITH CHECK (trr_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all notifications" ON tbl_notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON tbl_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON tbl_notifications;
CREATE POLICY "Admins can view all notifications" ON tbl_notifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));
CREATE POLICY "Users can view their own notifications" ON tbl_notifications FOR SELECT TO authenticated USING (tn_user_id = (select auth.uid()));
CREATE POLICY "Users can update their own notifications" ON tbl_notifications FOR UPDATE TO authenticated
  USING (tn_user_id = (select auth.uid())) WITH CHECK (tn_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admin users can read own record" ON tbl_admin_users;
DROP POLICY IF EXISTS "Admin users can update own record" ON tbl_admin_users;
DROP POLICY IF EXISTS "Super admins can create admin users" ON tbl_admin_users;
DROP POLICY IF EXISTS "Super admins can delete admin users" ON tbl_admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admins" ON tbl_admin_users;
DROP POLICY IF EXISTS "Super admins can read all admin users" ON tbl_admin_users;
DROP POLICY IF EXISTS "Super admins can update admin users" ON tbl_admin_users;
CREATE POLICY "Admin users can read own or all if super admin" ON tbl_admin_users FOR SELECT TO authenticated
  USING (tau_auth_uid = (select auth.uid()) OR EXISTS (SELECT 1 FROM tbl_admin_users a WHERE a.tau_auth_uid = (select auth.uid()) AND a.tau_role = 'super_admin' AND a.tau_is_active = true));
CREATE POLICY "Admin users can update own record" ON tbl_admin_users FOR UPDATE TO authenticated
  USING (tau_auth_uid = (select auth.uid())) WITH CHECK (tau_auth_uid = (select auth.uid()));
CREATE POLICY "Super admins can manage all admins" ON tbl_admin_users FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users a WHERE a.tau_auth_uid = (select auth.uid()) AND a.tau_role = 'super_admin' AND a.tau_is_active = true));

DROP POLICY IF EXISTS "Admins can manage payment splits" ON tbl_payment_splits;
DROP POLICY IF EXISTS "Admins can view payment splits" ON tbl_payment_splits;
CREATE POLICY "Admins can manage payment splits" ON tbl_payment_splits FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));

DROP POLICY IF EXISTS "Admins can manage sliders" ON tbl_sliders;
DROP POLICY IF EXISTS "Public can view active sliders" ON tbl_sliders;
CREATE POLICY "Anyone can view active sliders" ON tbl_sliders FOR SELECT USING (ts_is_active = true);
CREATE POLICY "Admins can manage sliders" ON tbl_sliders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));

DROP POLICY IF EXISTS "Admins can manage Stripe config" ON tbl_stripe_config;
DROP POLICY IF EXISTS "Admins can view Stripe config" ON tbl_stripe_config;
CREATE POLICY "Admins can manage Stripe config" ON tbl_stripe_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));

DROP POLICY IF EXISTS "Admins can view all tutor assignments" ON tbl_tutor_assignments;
DROP POLICY IF EXISTS "Tutors can view their assignments" ON tbl_tutor_assignments;
CREATE POLICY "Users can view relevant tutor assignments" ON tbl_tutor_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true) OR tta_tutor_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all access grants" ON tbl_video_access_grants;
DROP POLICY IF EXISTS "Learners can view their own access" ON tbl_video_access_grants;
DROP POLICY IF EXISTS "Tutors can view their access grants" ON tbl_video_access_grants;
CREATE POLICY "Users can view relevant access grants" ON tbl_video_access_grants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true) OR tvag_learner_id = (select auth.uid()) OR tvag_granted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can modify storage settings" ON tbl_video_storage_settings;
DROP POLICY IF EXISTS "Admins can view storage settings" ON tbl_video_storage_settings;
CREATE POLICY "Admins can manage storage settings" ON tbl_video_storage_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tbl_admin_users WHERE tau_auth_uid = (select auth.uid()) AND tau_is_active = true));

-- FIX FUNCTION SEARCH PATHS (without specifying signatures - applies to all overloads)
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
      'update_tvss_updated_at', 'update_updated_at_column', 'create_admin_notification',
      'auto_generate_sponsorship_number', 'update_admin_updated_at_column', 'check_video_access',
      'update_learning_progress', 'enroll_in_course', 'update_tcc_updated_at',
      'fn_security_definer_example', 'register_tutor', 'validate_payment_splits',
      'get_payment_splits_for_course', 'register_learner', 'register_user',
      'update_enrollment_progress', 'safe_log_user_activity', 'register_user_v1',
      'update_user_profiles_updated_at_column', 'assign_tutor_to_learner',
      'update_users_updated_at', 'register_user_v2'
    )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', func_record.func_signature);
  END LOOP;
END $$;