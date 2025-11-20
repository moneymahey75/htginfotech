/*
  # Add Vimeo as Video Storage Provider

  1. Changes
    - Add Vimeo configuration fields to video storage settings table
    - Update storage provider enum to include 'vimeo'
    - Add fields for Vimeo API credentials and settings

  2. New Fields
    - tvss_vimeo_access_token: Vimeo API access token
    - tvss_vimeo_client_id: Vimeo app client ID
    - tvss_vimeo_client_secret: Vimeo app client secret
    - tvss_vimeo_user_id: Vimeo user/account ID

  3. Notes
    - Vimeo free plan: 2GB upload per week, unlimited storage
    - Videos uploaded to Vimeo remain permanently until deleted
    - Weekly upload limit resets every 7 days
*/

-- Add Vimeo option to storage provider enum
ALTER TYPE storage_provider ADD VALUE IF NOT EXISTS 'vimeo';

-- Add Vimeo configuration columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_video_storage_settings' AND column_name = 'tvss_vimeo_access_token'
  ) THEN
    ALTER TABLE tbl_video_storage_settings ADD COLUMN tvss_vimeo_access_token TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_video_storage_settings' AND column_name = 'tvss_vimeo_client_id'
  ) THEN
    ALTER TABLE tbl_video_storage_settings ADD COLUMN tvss_vimeo_client_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_video_storage_settings' AND column_name = 'tvss_vimeo_client_secret'
  ) THEN
    ALTER TABLE tbl_video_storage_settings ADD COLUMN tvss_vimeo_client_secret TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_video_storage_settings' AND column_name = 'tvss_vimeo_user_id'
  ) THEN
    ALTER TABLE tbl_video_storage_settings ADD COLUMN tvss_vimeo_user_id TEXT;
  END IF;
END $$;
