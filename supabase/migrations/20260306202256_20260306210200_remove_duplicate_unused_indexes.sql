/*
  # Remove Duplicate and Unused Indexes
  
  ## Problem
  - Duplicate index: idx_split_transactions_payment is identical to idx_payment_split_trans_payment
  - 38 unused indexes consuming storage and slowing down writes
  
  ## Solution
  Drop duplicate and unused indexes to:
  - Reduce storage usage
  - Speed up INSERT/UPDATE/DELETE operations
  - Reduce index maintenance overhead
  
  ## Changes
  1. Remove duplicate index (keep the one with better naming)
  2. Remove unused indexes that have never been used by queries
*/

-- Remove duplicate index (keeping idx_payment_split_trans_payment)
DROP INDEX IF EXISTS idx_split_transactions_payment;

-- Remove unused indexes that have never been used
DROP INDEX IF EXISTS idx_stripe_accounts_admin;
DROP INDEX IF EXISTS idx_stripe_accounts_stripe_id;
DROP INDEX IF EXISTS idx_subscription_plans_active;
DROP INDEX IF EXISTS idx_course_content_course_id;
DROP INDEX IF EXISTS idx_course_content_free;
DROP INDEX IF EXISTS idx_course_content_type;
DROP INDEX IF EXISTS idx_subscription_plans_interval;
DROP INDEX IF EXISTS idx_subscription_plans_popular;
DROP INDEX IF EXISTS idx_subscription_plans_sort;
DROP INDEX IF EXISTS idx_subscription_plans_stripe;
DROP INDEX IF EXISTS idx_otp_user_expiry;
DROP INDEX IF EXISTS idx_otp_contact;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_notifications_reference;
DROP INDEX IF EXISTS idx_split_transactions_status;
DROP INDEX IF EXISTS idx_email_templates_name;
DROP INDEX IF EXISTS idx_email_templates_category;
DROP INDEX IF EXISTS idx_template_versions_template;
DROP INDEX IF EXISTS idx_email_templates_type;
DROP INDEX IF EXISTS idx_split_transactions_account;
DROP INDEX IF EXISTS idx_tutor_assignments_tutor;
DROP INDEX IF EXISTS idx_tutor_assignments_learner;
DROP INDEX IF EXISTS idx_tutor_assignments_enrollment;
DROP INDEX IF EXISTS idx_tutor_assignments_course;
DROP INDEX IF EXISTS idx_system_settings_key;
DROP INDEX IF EXISTS idx_system_settings_category;
DROP INDEX IF EXISTS idx_system_settings_public;
DROP INDEX IF EXISTS idx_tutor_assignments_status;
DROP INDEX IF EXISTS idx_activity_logs_user;
DROP INDEX IF EXISTS idx_activity_logs_type;
DROP INDEX IF EXISTS idx_activity_logs_created;
DROP INDEX IF EXISTS idx_sliders_dates;
DROP INDEX IF EXISTS idx_sliders_locations;
DROP INDEX IF EXISTS idx_reviews_course_active;
DROP INDEX IF EXISTS idx_reviews_tutor_active;
DROP INDEX IF EXISTS idx_reviews_user;
DROP INDEX IF EXISTS idx_reviews_type;
DROP INDEX IF EXISTS idx_tutors_user_active;
