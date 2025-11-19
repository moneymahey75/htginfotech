-- Quick fix for Cloudflare R2 video playback
-- Run this in Supabase SQL Editor

-- Step 1: Add the column if it doesn't exist
ALTER TABLE tbl_video_storage_settings
ADD COLUMN IF NOT EXISTS tvss_cloudflare_public_url text;

-- Step 2: Set your R2 public URL
-- Replace the URL below with YOUR R2 public URL from Cloudflare Dashboard
-- Find it: Cloudflare → R2 → course-videos → Settings → Public R2.dev subdomain

UPDATE tbl_video_storage_settings
SET tvss_cloudflare_public_url = 'https://pub-f8e6dfe236904fce9b86296eaf9cb927.r2.dev';

-- Step 3: Verify it worked
SELECT
  tvss_active_provider as provider,
  tvss_cloudflare_worker_url as worker_url,
  tvss_cloudflare_public_url as public_url
FROM tbl_video_storage_settings;

-- You should see:
-- provider: cloudflare
-- worker_url: https://r2-upload-proxy.money-mahey.workers.dev
-- public_url: https://pub-xxxxx.r2.dev (your URL)

-- Now videos should play!
