-- Fix Video Storage Settings
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Step 1: Add missing columns if they don't exist
DO $$
BEGIN
  -- Add tvss_bunny_stream_api_key column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_video_storage_settings'
    AND column_name = 'tvss_bunny_stream_api_key'
  ) THEN
    ALTER TABLE tbl_video_storage_settings
    ADD COLUMN tvss_bunny_stream_api_key text;
    RAISE NOTICE 'Added tvss_bunny_stream_api_key column';
  END IF;

  -- Add tvss_bunny_use_stream column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_video_storage_settings'
    AND column_name = 'tvss_bunny_use_stream'
  ) THEN
    ALTER TABLE tbl_video_storage_settings
    ADD COLUMN tvss_bunny_use_stream boolean DEFAULT false;
    RAISE NOTICE 'Added tvss_bunny_use_stream column';
  END IF;
END $$;

-- Step 2: Insert default record if no records exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tbl_video_storage_settings LIMIT 1) THEN
    INSERT INTO tbl_video_storage_settings (
      tvss_active_provider,
      tvss_supabase_bucket,
      tvss_signed_url_expiry_seconds,
      tvss_max_file_size_mb,
      tvss_auto_compress,
      tvss_bunny_use_stream
    )
    VALUES (
      'bunny',
      'course-videos',
      3600,
      500,
      true,
      true
    );
    RAISE NOTICE 'Inserted default video storage settings';
  ELSE
    -- Update existing records to have bunny_use_stream if it's NULL
    UPDATE tbl_video_storage_settings
    SET tvss_bunny_use_stream = COALESCE(tvss_bunny_use_stream, true);
    RAISE NOTICE 'Updated existing video storage settings';
  END IF;
END $$;

-- Step 3: Verify the settings exist
SELECT
  tvss_id,
  tvss_active_provider,
  tvss_bunny_use_stream,
  tvss_cloudflare_worker_url,
  tvss_cloudflare_public_url
FROM tbl_video_storage_settings;
