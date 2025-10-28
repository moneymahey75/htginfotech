/*
  # Video Management System

  ## Overview
  Complete video management system for tutors to share videos with learners.
  Supports multiple storage providers: Supabase Storage, Cloudflare R2, and Bunny.net.

  ## New Tables

  ### tbl_videos
  - `tv_id` (uuid, primary key) - Unique video identifier
  - `tv_tutor_id` (uuid) - Reference to tutor who uploaded
  - `tv_course_id` (uuid) - Reference to associated course
  - `tv_title` (text) - Video title
  - `tv_description` (text) - Video description
  - `tv_duration` (integer) - Duration in seconds
  - `tv_file_size` (bigint) - File size in bytes
  - `tv_storage_provider` (text) - Provider: supabase, cloudflare, bunny
  - `tv_storage_path` (text) - Path/key in storage
  - `tv_thumbnail_url` (text) - Thumbnail image URL
  - `tv_is_locked` (boolean) - Whether video is locked by default
  - `tv_view_count` (integer) - Number of times viewed
  - `tv_upload_status` (text) - Status: uploading, processing, ready, failed
  - `tv_is_active` (boolean) - Soft delete flag
  - `tv_created_at` (timestamptz) - Upload timestamp
  - `tv_updated_at` (timestamptz) - Last update timestamp

  ### tbl_video_access
  - `tva_id` (uuid, primary key) - Unique access record
  - `tva_video_id` (uuid) - Reference to video
  - `tva_learner_id` (uuid) - Reference to learner
  - `tva_granted_by` (uuid) - Reference to tutor who granted access
  - `tva_granted_at` (timestamptz) - When access was granted
  - `tva_expires_at` (timestamptz) - When access expires (nullable)
  - `tva_is_active` (boolean) - Whether access is active

  ### tbl_video_views
  - `tvv_id` (uuid, primary key) - Unique view record
  - `tvv_video_id` (uuid) - Reference to video
  - `tvv_learner_id` (uuid) - Reference to learner
  - `tvv_view_duration` (integer) - How long they watched (seconds)
  - `tvv_completed` (boolean) - Whether they watched to the end
  - `tvv_viewed_at` (timestamptz) - When view occurred

  ### tbl_storage_settings
  - `tss_id` (uuid, primary key) - Unique settings record
  - `tss_provider` (text) - Active provider: supabase, cloudflare, bunny
  - `tss_supabase_bucket` (text) - Supabase bucket name
  - `tss_cloudflare_account_id` (text) - Cloudflare account ID
  - `tss_cloudflare_access_key` (text) - Cloudflare access key
  - `tss_cloudflare_secret_key` (text) - Cloudflare secret key
  - `tss_cloudflare_bucket` (text) - R2 bucket name
  - `tss_bunny_api_key` (text) - Bunny.net API key
  - `tss_bunny_storage_zone` (text) - Bunny storage zone name
  - `tss_bunny_cdn_url` (text) - Bunny CDN URL
  - `tss_signed_url_expiry` (integer) - Expiry time in seconds (default 3600)
  - `tss_max_video_size` (bigint) - Max file size in bytes
  - `tss_created_at` (timestamptz) - Creation timestamp
  - `tss_updated_at` (timestamptz) - Update timestamp

  ## Security
  - Enable RLS on all tables
  - Tutors can only manage their own videos
  - Learners can only view videos they have access to
  - Only admins can modify storage settings
*/

-- Create videos table
CREATE TABLE IF NOT EXISTS tbl_videos (
  tv_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tv_tutor_id uuid NOT NULL REFERENCES tbl_users(tu_id) ON DELETE CASCADE,
  tv_course_id uuid NOT NULL REFERENCES tbl_courses(tc_id) ON DELETE CASCADE,
  tv_title text NOT NULL,
  tv_description text,
  tv_duration integer DEFAULT 0,
  tv_file_size bigint DEFAULT 0,
  tv_storage_provider text NOT NULL DEFAULT 'supabase',
  tv_storage_path text NOT NULL,
  tv_thumbnail_url text,
  tv_is_locked boolean DEFAULT true,
  tv_view_count integer DEFAULT 0,
  tv_upload_status text NOT NULL DEFAULT 'uploading',
  tv_is_active boolean DEFAULT true,
  tv_created_at timestamptz DEFAULT now(),
  tv_updated_at timestamptz DEFAULT now(),
  CONSTRAINT tv_storage_provider_check CHECK (
    tv_storage_provider IN ('supabase', 'cloudflare', 'bunny')
  ),
  CONSTRAINT tv_upload_status_check CHECK (
    tv_upload_status IN ('uploading', 'processing', 'ready', 'failed')
  )
);

-- Create video access table
CREATE TABLE IF NOT EXISTS tbl_video_access (
  tva_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tva_video_id uuid NOT NULL REFERENCES tbl_videos(tv_id) ON DELETE CASCADE,
  tva_learner_id uuid NOT NULL REFERENCES tbl_users(tu_id) ON DELETE CASCADE,
  tva_granted_by uuid NOT NULL REFERENCES tbl_users(tu_id) ON DELETE CASCADE,
  tva_granted_at timestamptz DEFAULT now(),
  tva_expires_at timestamptz,
  tva_is_active boolean DEFAULT true,
  UNIQUE(tva_video_id, tva_learner_id)
);

-- Create video views table
CREATE TABLE IF NOT EXISTS tbl_video_views (
  tvv_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tvv_video_id uuid NOT NULL REFERENCES tbl_videos(tv_id) ON DELETE CASCADE,
  tvv_learner_id uuid NOT NULL REFERENCES tbl_users(tu_id) ON DELETE CASCADE,
  tvv_view_duration integer DEFAULT 0,
  tvv_completed boolean DEFAULT false,
  tvv_viewed_at timestamptz DEFAULT now()
);

-- Create storage settings table
CREATE TABLE IF NOT EXISTS tbl_storage_settings (
  tss_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tss_provider text NOT NULL DEFAULT 'supabase',
  tss_supabase_bucket text DEFAULT 'course-videos',
  tss_cloudflare_account_id text,
  tss_cloudflare_access_key text,
  tss_cloudflare_secret_key text,
  tss_cloudflare_bucket text,
  tss_bunny_api_key text,
  tss_bunny_storage_zone text,
  tss_bunny_cdn_url text,
  tss_signed_url_expiry integer DEFAULT 3600,
  tss_max_video_size bigint DEFAULT 524288000,
  tss_created_at timestamptz DEFAULT now(),
  tss_updated_at timestamptz DEFAULT now(),
  CONSTRAINT tss_provider_check CHECK (
    tss_provider IN ('supabase', 'cloudflare', 'bunny')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_videos_tutor ON tbl_videos(tv_tutor_id);
CREATE INDEX IF NOT EXISTS idx_videos_course ON tbl_videos(tv_course_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON tbl_videos(tv_upload_status);
CREATE INDEX IF NOT EXISTS idx_video_access_video ON tbl_video_access(tva_video_id);
CREATE INDEX IF NOT EXISTS idx_video_access_learner ON tbl_video_access(tva_learner_id);
CREATE INDEX IF NOT EXISTS idx_video_views_video ON tbl_video_views(tvv_video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_learner ON tbl_video_views(tvv_learner_id);

-- Enable RLS
ALTER TABLE tbl_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_video_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_storage_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tbl_videos

-- Tutors can view their own videos
CREATE POLICY "Tutors can view own videos"
  ON tbl_videos FOR SELECT
  TO authenticated
  USING (
    tv_tutor_id = auth.uid()
    AND tv_is_active = true
  );

-- Tutors can create videos for their courses
CREATE POLICY "Tutors can create videos"
  ON tbl_videos FOR INSERT
  TO authenticated
  WITH CHECK (
    tv_tutor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tu_id = auth.uid()
      AND tu_user_type = 'tutor'
      AND tu_is_active = true
    )
  );

-- Tutors can update their own videos
CREATE POLICY "Tutors can update own videos"
  ON tbl_videos FOR UPDATE
  TO authenticated
  USING (tv_tutor_id = auth.uid())
  WITH CHECK (tv_tutor_id = auth.uid());

-- Tutors can delete their own videos
CREATE POLICY "Tutors can delete own videos"
  ON tbl_videos FOR DELETE
  TO authenticated
  USING (tv_tutor_id = auth.uid());

-- Learners can view videos they have access to
CREATE POLICY "Learners can view accessible videos"
  ON tbl_videos FOR SELECT
  TO authenticated
  USING (
    tv_is_active = true
    AND tv_upload_status = 'ready'
    AND EXISTS (
      SELECT 1 FROM tbl_video_access
      WHERE tva_video_id = tv_id
      AND tva_learner_id = auth.uid()
      AND tva_is_active = true
      AND (tva_expires_at IS NULL OR tva_expires_at > now())
    )
  );

-- Admins can view all videos
CREATE POLICY "Admins can view all videos"
  ON tbl_videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tu_id = auth.uid()
      AND tu_user_type = 'admin'
    )
  );

-- RLS Policies for tbl_video_access

-- Tutors can view access records for their videos
CREATE POLICY "Tutors can view video access"
  ON tbl_video_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_videos
      WHERE tv_id = tva_video_id
      AND tv_tutor_id = auth.uid()
    )
  );

-- Tutors can grant access to their videos
CREATE POLICY "Tutors can grant video access"
  ON tbl_video_access FOR INSERT
  TO authenticated
  WITH CHECK (
    tva_granted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tbl_videos
      WHERE tv_id = tva_video_id
      AND tv_tutor_id = auth.uid()
    )
  );

-- Tutors can revoke access to their videos
CREATE POLICY "Tutors can revoke video access"
  ON tbl_video_access FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_videos
      WHERE tv_id = tva_video_id
      AND tv_tutor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_videos
      WHERE tv_id = tva_video_id
      AND tv_tutor_id = auth.uid()
    )
  );

-- Learners can view their own access records
CREATE POLICY "Learners can view own access"
  ON tbl_video_access FOR SELECT
  TO authenticated
  USING (tva_learner_id = auth.uid());

-- RLS Policies for tbl_video_views

-- Learners can create view records for videos they access
CREATE POLICY "Learners can create view records"
  ON tbl_video_views FOR INSERT
  TO authenticated
  WITH CHECK (
    tvv_learner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tbl_video_access
      WHERE tva_video_id = tvv_video_id
      AND tva_learner_id = auth.uid()
      AND tva_is_active = true
    )
  );

-- Tutors can view analytics for their videos
CREATE POLICY "Tutors can view video analytics"
  ON tbl_video_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_videos
      WHERE tv_id = tvv_video_id
      AND tv_tutor_id = auth.uid()
    )
  );

-- Learners can view their own watch history
CREATE POLICY "Learners can view own watch history"
  ON tbl_video_views FOR SELECT
  TO authenticated
  USING (tvv_learner_id = auth.uid());

-- RLS Policies for tbl_storage_settings

-- Only admins can view storage settings
CREATE POLICY "Admins can view storage settings"
  ON tbl_storage_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tu_id = auth.uid()
      AND tu_user_type = 'admin'
    )
  );

-- Only admins can modify storage settings
CREATE POLICY "Admins can modify storage settings"
  ON tbl_storage_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tu_id = auth.uid()
      AND tu_user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tu_id = auth.uid()
      AND tu_user_type = 'admin'
    )
  );

-- Insert default storage settings
INSERT INTO tbl_storage_settings (tss_provider, tss_supabase_bucket, tss_signed_url_expiry, tss_max_video_size)
VALUES ('supabase', 'course-videos', 3600, 524288000)
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_video_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tv_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_videos_updated_at
  BEFORE UPDATE ON tbl_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_video_updated_at();

CREATE OR REPLACE FUNCTION update_storage_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tss_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_storage_settings_updated_at
  BEFORE UPDATE ON tbl_storage_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_settings_updated_at();