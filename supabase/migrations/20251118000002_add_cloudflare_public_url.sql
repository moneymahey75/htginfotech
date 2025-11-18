/*
  # Add Cloudflare R2 Public URL Configuration

  1. Changes
    - Add `tvss_cloudflare_public_url` column to `tbl_video_storage_settings`
    - This stores the R2 public domain URL for video playback
    - Format: https://pub-xxxxx.r2.dev or custom domain

  2. Purpose
    - Enables proper video playback from Cloudflare R2
    - Supports both R2.dev public domains and custom domains
    - Required for learners to access R2-hosted videos

  3. Notes
    - Column is optional (nullable)
    - Used as primary method for video URL generation
    - Falls back to Worker URL if not set
*/

-- Add Cloudflare public URL column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_video_storage_settings'
    AND column_name = 'tvss_cloudflare_public_url'
  ) THEN
    ALTER TABLE tbl_video_storage_settings
    ADD COLUMN tvss_cloudflare_public_url text;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN tbl_video_storage_settings.tvss_cloudflare_public_url IS
'R2 public domain URL for video playback (e.g., https://pub-xxxxx.r2.dev)';
