/*
  # Video Storage and Access Control System

  ## Overview
  Extends tbl_course_content to support video uploads with multiple storage providers
  (Supabase, Cloudflare R2, Bunny.net) and adds access control for tutors to share videos.

  ## Changes
  1. Add storage-related columns to tbl_course_content
  2. Create storage provider settings table
  3. Create video access control table
  4. Add helper functions for signed URLs and migration

  ## New Tables
  - tbl_video_storage_settings: Storage provider configuration
  - tbl_video_access_grants: Tutor-controlled video access for specific learners
*/

-- Add storage-related columns to tbl_course_content
ALTER TABLE tbl_course_content
ADD COLUMN IF NOT EXISTS tcc_storage_provider text DEFAULT 'external',
ADD COLUMN IF NOT EXISTS tcc_storage_path text,
ADD COLUMN IF NOT EXISTS tcc_file_size bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS tcc_video_duration_seconds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tcc_is_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tcc_thumbnail_url text;

-- Add constraint for storage provider
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tcc_storage_provider_check'
  ) THEN
    ALTER TABLE tbl_course_content
    ADD CONSTRAINT tcc_storage_provider_check CHECK (
      tcc_storage_provider IN ('external', 'supabase', 'cloudflare', 'bunny')
    );
  END IF;
END $$;

-- Create video storage settings table
CREATE TABLE IF NOT EXISTS tbl_video_storage_settings (
  tvss_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tvss_active_provider text NOT NULL DEFAULT 'supabase',
  tvss_supabase_bucket text DEFAULT 'course-videos',
  tvss_cloudflare_account_id text,
  tvss_cloudflare_access_key text,
  tvss_cloudflare_secret_key text,
  tvss_cloudflare_bucket text,
  tvss_cloudflare_stream_enabled boolean DEFAULT false,
  tvss_bunny_api_key text,
  tvss_bunny_storage_zone text,
  tvss_bunny_cdn_url text,
  tvss_bunny_stream_library_id text,
  tvss_signed_url_expiry_seconds integer DEFAULT 3600,
  tvss_max_file_size_mb integer DEFAULT 500,
  tvss_auto_compress boolean DEFAULT true,
  tvss_created_at timestamptz DEFAULT now(),
  tvss_updated_at timestamptz DEFAULT now(),
  CONSTRAINT tvss_provider_check CHECK (
    tvss_active_provider IN ('supabase', 'cloudflare', 'bunny')
  )
);

-- Create video access grants table for tutor-controlled sharing
CREATE TABLE IF NOT EXISTS tbl_video_access_grants (
  tvag_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tvag_content_id uuid NOT NULL REFERENCES tbl_course_content(tcc_id) ON DELETE CASCADE,
  tvag_learner_id uuid NOT NULL REFERENCES tbl_users(tu_id) ON DELETE CASCADE,
  tvag_granted_by uuid NOT NULL REFERENCES tbl_users(tu_id) ON DELETE CASCADE,
  tvag_granted_at timestamptz DEFAULT now(),
  tvag_expires_at timestamptz,
  tvag_is_active boolean DEFAULT true,
  UNIQUE(tvag_content_id, tvag_learner_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_content_storage_provider 
  ON tbl_course_content(tcc_storage_provider);
CREATE INDEX IF NOT EXISTS idx_course_content_locked 
  ON tbl_course_content(tcc_is_locked) WHERE tcc_content_type = 'video';
CREATE INDEX IF NOT EXISTS idx_video_access_grants_content 
  ON tbl_video_access_grants(tvag_content_id);
CREATE INDEX IF NOT EXISTS idx_video_access_grants_learner 
  ON tbl_video_access_grants(tvag_learner_id);

-- Enable RLS on new tables
ALTER TABLE tbl_video_storage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_video_access_grants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tbl_video_storage_settings
CREATE POLICY "Admins can view storage settings"
  ON tbl_video_storage_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tu_id = auth.uid()
      AND tu_user_type = 'admin'
    )
  );

CREATE POLICY "Admins can modify storage settings"
  ON tbl_video_storage_settings FOR ALL
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

-- RLS Policies for tbl_video_access_grants
CREATE POLICY "Tutors can view their access grants"
  ON tbl_video_access_grants FOR SELECT
  TO authenticated
  USING (tvag_granted_by = auth.uid());

CREATE POLICY "Tutors can create access grants"
  ON tbl_video_access_grants FOR INSERT
  TO authenticated
  WITH CHECK (
    tvag_granted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tu_id = auth.uid()
      AND tu_user_type = 'tutor'
    )
  );

CREATE POLICY "Tutors can update their grants"
  ON tbl_video_access_grants FOR UPDATE
  TO authenticated
  USING (tvag_granted_by = auth.uid())
  WITH CHECK (tvag_granted_by = auth.uid());

CREATE POLICY "Learners can view their own access"
  ON tbl_video_access_grants FOR SELECT
  TO authenticated
  USING (tvag_learner_id = auth.uid());

CREATE POLICY "Admins can view all access grants"
  ON tbl_video_access_grants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tu_id = auth.uid()
      AND tu_user_type = 'admin'
    )
  );

-- Insert default storage settings
INSERT INTO tbl_video_storage_settings (
  tvss_active_provider,
  tvss_supabase_bucket,
  tvss_signed_url_expiry_seconds,
  tvss_max_file_size_mb,
  tvss_auto_compress
)
VALUES (
  'supabase',
  'course-videos',
  3600,
  500,
  true
)
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tvss_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tvss_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tvss_updated_at
  BEFORE UPDATE ON tbl_video_storage_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_tvss_updated_at();

-- Helper function to check if learner has access to locked video
CREATE OR REPLACE FUNCTION check_video_access(
  p_content_id uuid,
  p_learner_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_is_locked boolean;
  v_has_grant boolean;
  v_is_enrolled boolean;
BEGIN
  -- Get video lock status
  SELECT tcc_is_locked INTO v_is_locked
  FROM tbl_course_content
  WHERE tcc_id = p_content_id;
  
  -- If not locked, return true
  IF NOT v_is_locked THEN
    RETURN true;
  END IF;
  
  -- Check if learner is enrolled in the course
  SELECT EXISTS (
    SELECT 1 FROM tbl_course_enrollments tce
    JOIN tbl_course_content tcc ON tcc.tcc_course_id = tce.tce_course_id
    WHERE tcc.tcc_id = p_content_id
    AND tce.tce_user_id = p_learner_id
  ) INTO v_is_enrolled;
  
  IF NOT v_is_enrolled THEN
    RETURN false;
  END IF;
  
  -- Check for active access grant
  SELECT EXISTS (
    SELECT 1 FROM tbl_video_access_grants
    WHERE tvag_content_id = p_content_id
    AND tvag_learner_id = p_learner_id
    AND tvag_is_active = true
    AND (tvag_expires_at IS NULL OR tvag_expires_at > now())
  ) INTO v_has_grant;
  
  RETURN v_has_grant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;