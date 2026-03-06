/*
  # Add Missing Foreign Key Indexes
  
  ## Problem
  26 foreign keys lack covering indexes, causing suboptimal query performance.
  When joining tables or filtering by foreign key values, PostgreSQL cannot use
  indexes, leading to full table scans.
  
  ## Solution
  Add indexes for all unindexed foreign key columns to improve:
  - JOIN performance
  - WHERE clause filtering on foreign keys
  - Foreign key constraint checking speed
  
  ## Changes
  Adding indexes for foreign keys in:
  1. tbl_admin_activity_logs - taal_admin_id
  2. tbl_admin_sessions - tas_admin_id
  3. tbl_admin_users - tau_created_by
  4. tbl_course_enrollments - tce_course_id
  5. tbl_email_template_versions - tetv_created_by
  6. tbl_email_templates - tet_created_by, tet_last_modified_by
  7. tbl_learning_progress - tlp_content_id
  8. tbl_payments - tp_course_id, tp_subscription_id, tp_user_id
  9. tbl_session_participants - tsp_user_id
  10. tbl_sessions - ts_course_id, ts_tutor_id
  11. tbl_sliders - ts_created_by, ts_updated_by
  12. tbl_stripe_config - tsc_rotated_by
  13. tbl_subscription_plans - tsp_created_by, tsp_updated_by
  14. tbl_system_settings - tss_created_by, tss_updated_by
  15. tbl_tutor_assignments - tta_assigned_by_admin, tta_assigned_by
  16. tbl_user_profiles - tup_user_id
  17. tbl_user_subscriptions - tus_plan_id, tus_user_id
  18. tbl_video_access_grants - tvag_granted_by, tvag_learner_id
*/

-- Admin activity logs
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id 
ON tbl_admin_activity_logs(taal_admin_id);

-- Admin sessions
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id 
ON tbl_admin_sessions(tas_admin_id);

-- Admin users
CREATE INDEX IF NOT EXISTS idx_admin_users_created_by 
ON tbl_admin_users(tau_created_by);

-- Course enrollments
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id 
ON tbl_course_enrollments(tce_course_id);

-- Email template versions
CREATE INDEX IF NOT EXISTS idx_email_template_versions_created_by 
ON tbl_email_template_versions(tetv_created_by);

-- Email templates
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by 
ON tbl_email_templates(tet_created_by);

CREATE INDEX IF NOT EXISTS idx_email_templates_last_modified_by 
ON tbl_email_templates(tet_last_modified_by);

-- Learning progress
CREATE INDEX IF NOT EXISTS idx_learning_progress_content_id 
ON tbl_learning_progress(tlp_content_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_course_id 
ON tbl_payments(tp_course_id);

CREATE INDEX IF NOT EXISTS idx_payments_subscription_id 
ON tbl_payments(tp_subscription_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id 
ON tbl_payments(tp_user_id);

-- Session participants
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id 
ON tbl_session_participants(tsp_user_id);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_course_id 
ON tbl_sessions(ts_course_id);

CREATE INDEX IF NOT EXISTS idx_sessions_tutor_id 
ON tbl_sessions(ts_tutor_id);

-- Sliders
CREATE INDEX IF NOT EXISTS idx_sliders_created_by 
ON tbl_sliders(ts_created_by);

CREATE INDEX IF NOT EXISTS idx_sliders_updated_by 
ON tbl_sliders(ts_updated_by);

-- Stripe config
CREATE INDEX IF NOT EXISTS idx_stripe_config_rotated_by 
ON tbl_stripe_config(tsc_rotated_by);

-- Subscription plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_created_by 
ON tbl_subscription_plans(tsp_created_by);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_updated_by 
ON tbl_subscription_plans(tsp_updated_by);

-- System settings
CREATE INDEX IF NOT EXISTS idx_system_settings_created_by 
ON tbl_system_settings(tss_created_by);

CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by 
ON tbl_system_settings(tss_updated_by);

-- Tutor assignments
CREATE INDEX IF NOT EXISTS idx_tutor_assignments_assigned_by_admin 
ON tbl_tutor_assignments(tta_assigned_by_admin);

CREATE INDEX IF NOT EXISTS idx_tutor_assignments_assigned_by 
ON tbl_tutor_assignments(tta_assigned_by);

-- User profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
ON tbl_user_profiles(tup_user_id);

-- User subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id 
ON tbl_user_subscriptions(tus_plan_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id 
ON tbl_user_subscriptions(tus_user_id);

-- Video access grants
CREATE INDEX IF NOT EXISTS idx_video_access_grants_granted_by 
ON tbl_video_access_grants(tvag_granted_by);

CREATE INDEX IF NOT EXISTS idx_video_access_grants_learner_id 
ON tbl_video_access_grants(tvag_learner_id);
