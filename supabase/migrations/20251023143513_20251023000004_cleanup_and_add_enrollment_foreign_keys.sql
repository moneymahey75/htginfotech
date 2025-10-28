/*
  # Cleanup Invalid Data and Add Foreign Key Relationships

  ## Changes
  1. Remove enrollment records that reference non-existent users
  2. Add foreign key constraint from tbl_course_enrollments.tce_user_id to tbl_users.tu_id
  
  ## Details
  - Cleans up orphaned enrollment records
  - Ensures referential integrity between enrollments and users
  - Enables proper joins in Supabase queries
  - Adds ON DELETE CASCADE to clean up enrollments when user is deleted
*/

-- Clean up orphaned enrollment records
DELETE FROM tbl_course_enrollments
WHERE tce_user_id NOT IN (SELECT tu_id FROM tbl_users);

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tbl_course_enrollments_tce_user_id_fkey'
    AND table_name = 'tbl_course_enrollments'
  ) THEN
    ALTER TABLE tbl_course_enrollments
    ADD CONSTRAINT tbl_course_enrollments_tce_user_id_fkey
    FOREIGN KEY (tce_user_id)
    REFERENCES tbl_users(tu_id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON tbl_course_enrollments(tce_user_id);