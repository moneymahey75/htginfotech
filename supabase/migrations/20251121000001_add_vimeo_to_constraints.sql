/*
  # Update Storage Provider Constraints to Include Vimeo

  1. Changes
    - Drop and recreate tvss_provider_check constraint to include 'vimeo'
    - Drop and recreate tcc_storage_provider_check constraint to include 'vimeo'
    - Add Vimeo configuration columns if they don't exist

  2. Tables Updated
    - tbl_video_storage_settings: Allow 'vimeo' as active provider
    - tbl_course_content: Allow 'vimeo' as content storage provider

  3. Notes
    - Must drop constraints before recreating them
    - Using IF EXISTS to make migration idempotent
*/

-- Drop existing constraints
ALTER TABLE tbl_video_storage_settings 
  DROP CONSTRAINT IF EXISTS tvss_provider_check;

ALTER TABLE tbl_course_content 
  DROP CONSTRAINT IF EXISTS tcc_storage_provider_check;

-- Recreate constraints with vimeo included
ALTER TABLE tbl_video_storage_settings 
  ADD CONSTRAINT tvss_provider_check CHECK (
    tvss_active_provider IN ('supabase', 'cloudflare', 'bunny', 'vimeo')
  );

ALTER TABLE tbl_course_content 
  ADD CONSTRAINT tcc_storage_provider_check CHECK (
    tcc_storage_provider IN ('external', 'supabase', 'cloudflare', 'bunny', 'vimeo')
  );

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
