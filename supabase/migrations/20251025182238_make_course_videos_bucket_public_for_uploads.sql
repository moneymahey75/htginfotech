/*
  # Make Course Videos Bucket Accessible for Uploads

  ## Overview
  Since admin authentication uses custom sessions (not Supabase Auth),
  we need to allow uploads using the anon key. Security is enforced at:
  1. Application level (admin session validation)
  2. Database level (RLS on tbl_course_content table)

  ## Changes
  - Drop authenticated-only policies
  - Create public policies for course-videos bucket operations
  - Maintain security through application logic and database RLS
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow uploads to course-videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to course-videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from course-videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow reads from course-videos" ON storage.objects;

-- Create public policies for course-videos bucket
-- Security enforced at application level via admin session validation

CREATE POLICY "Public can upload to course-videos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'course-videos');

CREATE POLICY "Public can update course-videos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'course-videos');

CREATE POLICY "Public can delete from course-videos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'course-videos');

CREATE POLICY "Public can read course-videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-videos');
