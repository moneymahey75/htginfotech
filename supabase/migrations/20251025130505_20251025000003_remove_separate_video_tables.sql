/*
  # Remove Separate Video Management Tables

  ## Overview
  Removes the separately created video management tables as the system already has
  `tbl_course_content` for managing lessons including videos.

  ## Changes
  1. Drop video-related tables
  2. Drop helper functions
  3. Keep existing tbl_course_content structure
*/

-- Drop tables (reverse order due to dependencies)
DROP TABLE IF EXISTS tbl_video_views CASCADE;
DROP TABLE IF EXISTS tbl_video_access CASCADE;
DROP TABLE IF EXISTS tbl_videos CASCADE;
DROP TABLE IF EXISTS tbl_storage_settings CASCADE;

-- Drop helper function
DROP FUNCTION IF EXISTS increment_video_view_count(uuid);
DROP FUNCTION IF EXISTS update_video_updated_at();
DROP FUNCTION IF EXISTS update_storage_settings_updated_at();