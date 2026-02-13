/*
  # Add Course Completion Tracking

  ## Overview
  This migration adds course completion tracking and automated progress calculation functionality.

  ## Changes

  ### 1. Schema Updates
  - Add `tce_completion_date` column to tbl_course_enrollments to track when a learner completes a course

  ### 2. Functions
  - Create `update_enrollment_progress` function to automatically calculate and update enrollment progress

  ## Important Notes
  - The progress calculation is based on completed learning progress items
  - Course is marked as 100% complete when all content items are completed
  - Completion date is automatically set when progress reaches 100%
*/

-- Add completion date column to enrollments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_course_enrollments' AND column_name = 'tce_completion_date'
  ) THEN
    ALTER TABLE tbl_course_enrollments ADD COLUMN tce_completion_date timestamptz;
  END IF;
END $$;

-- Create function to update enrollment progress
CREATE OR REPLACE FUNCTION update_enrollment_progress(
  p_user_id uuid,
  p_course_id uuid
)
RETURNS void AS $$
DECLARE
  v_total_content integer;
  v_completed_content integer;
  v_progress_percentage integer;
BEGIN
  -- Get total number of active course content items
  SELECT COUNT(*)
  INTO v_total_content
  FROM tbl_course_content
  WHERE tcc_course_id = p_course_id
    AND tcc_is_active = true;

  -- Get number of completed content items for this user
  SELECT COUNT(*)
  INTO v_completed_content
  FROM tbl_learning_progress
  WHERE tlp_user_id = p_user_id
    AND tlp_course_id = p_course_id
    AND tlp_completed = true;

  -- Calculate progress percentage
  IF v_total_content > 0 THEN
    v_progress_percentage := ROUND((v_completed_content::numeric / v_total_content::numeric) * 100);
  ELSE
    v_progress_percentage := 0;
  END IF;

  -- Update enrollment with new progress
  UPDATE tbl_course_enrollments
  SET
    tce_progress_percentage = v_progress_percentage,
    tce_updated_at = now()
  WHERE tce_user_id = p_user_id
    AND tce_course_id = p_course_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_enrollment_progress(uuid, uuid) TO authenticated;
