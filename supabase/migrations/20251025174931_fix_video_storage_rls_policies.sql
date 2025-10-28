/*
  # Fix Video Storage RLS Policies for Admin Access

  ## Overview
  Updates RLS policies for video storage settings to check tbl_admin_users instead of tbl_users
  since admins use a separate authentication table.

  ## Changes
  - Drop existing RLS policies on tbl_video_storage_settings
  - Create new policies that check tbl_admin_users for admin access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view storage settings" ON tbl_video_storage_settings;
DROP POLICY IF EXISTS "Admins can modify storage settings" ON tbl_video_storage_settings;

-- Create new policies that check tbl_admin_users
CREATE POLICY "Admins can view storage settings"
  ON tbl_video_storage_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
      AND tau_is_active = true
    )
  );

CREATE POLICY "Admins can modify storage settings"
  ON tbl_video_storage_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
      AND tau_is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
      AND tau_is_active = true
    )
  );

-- Also update the RLS policies for tbl_video_access_grants to allow admins from tbl_admin_users
DROP POLICY IF EXISTS "Admins can view all access grants" ON tbl_video_access_grants;

CREATE POLICY "Admins can view all access grants"
  ON tbl_video_access_grants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
      AND tau_is_active = true
    )
  );