/*
  # Add Cloudflare Worker URL to Video Storage Settings

  1. Changes
    - Add `tvss_cloudflare_worker_url` column to store the deployed Worker URL
    - This allows admins to configure the Worker endpoint for chunked video uploads

  2. Notes
    - Worker URL is required when using Cloudflare R2 for better upload handling
    - The Worker handles CORS, chunking, and resumable uploads
    - Example: https://course-videos-dev.example.com or https://your-worker.workers.dev
*/

-- Add Cloudflare Worker URL column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_video_storage_settings'
    AND column_name = 'tvss_cloudflare_worker_url'
  ) THEN
    ALTER TABLE tbl_video_storage_settings
    ADD COLUMN tvss_cloudflare_worker_url text;
  END IF;
END $$;

-- Add comment to explain the field
COMMENT ON COLUMN tbl_video_storage_settings.tvss_cloudflare_worker_url IS
  'URL of the deployed Cloudflare Worker for handling video uploads. Required when using Cloudflare R2. Example: https://course-videos.workers.dev';
