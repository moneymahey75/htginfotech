/*
  # Video Helper Functions

  ## Overview
  Helper functions for video management system

  ## Functions
  1. increment_video_view_count - Increment view count for a video
*/

-- Function to increment video view count
CREATE OR REPLACE FUNCTION increment_video_view_count(video_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE tbl_videos
  SET tv_view_count = tv_view_count + 1
  WHERE tv_id = video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;