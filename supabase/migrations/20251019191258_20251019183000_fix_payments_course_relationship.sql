/*
  # Fix Payment to Course Relationship

  ## Changes
  1. Add tp_course_id foreign key to tbl_payments if it doesn't exist
  2. Ensure proper relationship between payments and courses

  ## Details
  - Adds foreign key constraint from tbl_payments to tbl_courses
  - This fixes the Supabase query error when joining payments with courses
*/

-- Add tp_course_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_payments' AND column_name = 'tp_course_id'
  ) THEN
ALTER TABLE tbl_payments ADD COLUMN tp_course_id uuid REFERENCES tbl_courses(tc_id) ON DELETE SET NULL;
END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_course ON tbl_payments(tp_course_id);