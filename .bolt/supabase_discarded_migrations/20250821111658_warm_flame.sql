/*
  # Fix System Settings RLS Policy

  1. Security Changes
    - Update RLS policy on tbl_system_settings to allow authenticated users to insert/update
    - Add proper policies for admin operations
    - Ensure system settings can be managed by authenticated users

  2. Changes Made
    - Drop existing restrictive policy
    - Add new policy allowing authenticated users to manage system settings
    - Add policy for reading system settings
*/

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Anyone can read system settings" ON tbl_system_settings;

-- Create new policies that allow authenticated users to manage system settings
CREATE POLICY "Authenticated users can read system settings" ON tbl_system_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert system settings" ON tbl_system_settings
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update system settings" ON tbl_system_settings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete system settings" ON tbl_system_settings
  FOR DELETE TO authenticated
  USING (true);

-- Ensure the table has proper structure
DO $$
BEGIN
  -- Check if tss_setting_key column exists and is unique
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'tbl_system_settings' 
    AND constraint_name = 'tbl_system_settings_tss_setting_key_key'
  ) THEN
    ALTER TABLE tbl_system_settings ADD CONSTRAINT tbl_system_settings_tss_setting_key_key UNIQUE (tss_setting_key);
  END IF;
END $$;

-- Insert default system settings if they don't exist
INSERT INTO tbl_system_settings (tss_setting_key, tss_setting_value, tss_description) VALUES
  ('site_name', '"HTG Infotech"', 'Site name displayed in header and emails'),
  ('logo_url', '"https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"', 'Logo URL for site branding'),
  ('date_format', '"DD/MM/YYYY"', 'Default date format for the application'),
  ('timezone', '"UTC"', 'Default timezone for the application'),
  ('email_verification_required', 'true', 'Whether email verification is required during registration'),
  ('mobile_verification_required', 'true', 'Whether mobile verification is required during registration'),
  ('job_seeker_video_url', '"https://www.youtube.com/embed/dQw4w9WgXcQ"', 'Video URL for job seekers page'),
  ('job_provider_video_url', '"https://www.youtube.com/embed/dQw4w9WgXcQ"', 'Video URL for job providers page')
ON CONFLICT (tss_setting_key) DO NOTHING;