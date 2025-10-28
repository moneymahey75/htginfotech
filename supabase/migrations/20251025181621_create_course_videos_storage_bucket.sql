/*
  # Create Course Videos Storage Bucket and Policies

  ## Overview
  Creates the course-videos storage bucket and sets up RLS policies for video uploads and access.

  ## Changes
  1. Create course-videos bucket for video storage
  2. Set up RLS policies for admins to upload/manage videos
  3. Set up policies for authenticated users to access videos via signed URLs
*/

-- Create the course-videos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-videos',
  'course-videos',
  false,
  524288000,
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload videos
CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-videos'
  AND EXISTS (
    SELECT 1 FROM tbl_admin_users
    WHERE tau_id = auth.uid()
    AND tau_is_active = true
  )
);

-- Allow admins to update videos
CREATE POLICY "Admins can update videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-videos'
  AND EXISTS (
    SELECT 1 FROM tbl_admin_users
    WHERE tau_id = auth.uid()
    AND tau_is_active = true
  )
);

-- Allow admins to delete videos
CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-videos'
  AND EXISTS (
    SELECT 1 FROM tbl_admin_users
    WHERE tau_id = auth.uid()
    AND tau_is_active = true
  )
);

-- Allow authenticated users to read videos (for signed URL generation)
CREATE POLICY "Authenticated users can read videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course-videos');
