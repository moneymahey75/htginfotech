/*
  Backfill enrollment-derived tutor assignment fields.

  Admin enrollment assignment stores `tta_enrollment_id`; learner/tutor frontend
  policies and screens also rely on `tta_learner_id`, `tta_course_id`, and
  `tta_status`. Keep those fields populated for existing and future rows.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tbl_tutor_assignments'
      AND column_name = 'tta_enrollment_id'
  ) THEN
    ALTER TABLE tbl_tutor_assignments
      ADD COLUMN tta_enrollment_id uuid REFERENCES tbl_course_enrollments(tce_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tbl_tutor_assignments'
      AND column_name = 'tta_learner_id'
  ) THEN
    ALTER TABLE tbl_tutor_assignments
      ADD COLUMN tta_learner_id uuid REFERENCES tbl_users(tu_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tbl_tutor_assignments'
      AND column_name = 'tta_course_id'
  ) THEN
    ALTER TABLE tbl_tutor_assignments
      ADD COLUMN tta_course_id uuid REFERENCES tbl_courses(tc_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tbl_tutor_assignments'
      AND column_name = 'tta_status'
  ) THEN
    ALTER TABLE tbl_tutor_assignments
      ADD COLUMN tta_status text DEFAULT 'active'
      CHECK (tta_status IN ('active', 'completed', 'cancelled'));
  END IF;
END $$;

UPDATE tbl_tutor_assignments AS assignment
SET
  tta_learner_id = COALESCE(assignment.tta_learner_id, enrollment.tce_user_id),
  tta_course_id = COALESCE(assignment.tta_course_id, enrollment.tce_course_id),
  tta_status = COALESCE(assignment.tta_status, 'active')
FROM tbl_course_enrollments AS enrollment
WHERE assignment.tta_enrollment_id = enrollment.tce_id
  AND (
    assignment.tta_learner_id IS NULL
    OR assignment.tta_course_id IS NULL
    OR assignment.tta_status IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_tutor_assignments_learner
ON tbl_tutor_assignments(tta_learner_id);

CREATE INDEX IF NOT EXISTS idx_tutor_assignments_course
ON tbl_tutor_assignments(tta_course_id);

CREATE OR REPLACE FUNCTION public.get_my_assigned_tutors()
RETURNS TABLE (
  tta_id uuid,
  tta_assigned_at timestamptz,
  tta_notes text,
  tta_status text,
  tutor_id uuid,
  tutor_email text,
  tutor_first_name text,
  tutor_last_name text,
  tutor_middle_name text,
  tutor_mobile text,
  tutor_bio text,
  tutor_experience_years integer,
  tutor_hourly_rate numeric,
  tutor_rating numeric,
  tutor_total_students integer,
  tutor_specializations jsonb,
  course_id uuid,
  course_title text,
  course_description text,
  course_thumbnail_url text,
  course_price numeric,
  course_difficulty_level text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    assignment.tta_id,
    assignment.tta_assigned_at,
    assignment.tta_notes,
    COALESCE(assignment.tta_status, 'active') AS tta_status,
    tutor.tu_id AS tutor_id,
    tutor.tu_email AS tutor_email,
    profile.tup_first_name AS tutor_first_name,
    profile.tup_last_name AS tutor_last_name,
    profile.tup_middle_name AS tutor_middle_name,
    profile.tup_mobile AS tutor_mobile,
    tutor_profile.tt_bio AS tutor_bio,
    tutor_profile.tt_experience_years AS tutor_experience_years,
    tutor_profile.tt_hourly_rate AS tutor_hourly_rate,
    tutor_profile.tt_rating AS tutor_rating,
    tutor_profile.tt_total_students AS tutor_total_students,
    tutor_profile.tt_specializations AS tutor_specializations,
    COALESCE(direct_course.tc_id, enrollment_course.tc_id) AS course_id,
    COALESCE(direct_course.tc_title, enrollment_course.tc_title) AS course_title,
    COALESCE(direct_course.tc_description, enrollment_course.tc_description) AS course_description,
    COALESCE(direct_course.tc_thumbnail_url, enrollment_course.tc_thumbnail_url) AS course_thumbnail_url,
    COALESCE(direct_course.tc_price, enrollment_course.tc_price) AS course_price,
    COALESCE(direct_course.tc_difficulty_level, enrollment_course.tc_difficulty_level) AS course_difficulty_level
  FROM public.tbl_tutor_assignments AS assignment
  LEFT JOIN public.tbl_course_enrollments AS enrollment
    ON enrollment.tce_id = assignment.tta_enrollment_id
  LEFT JOIN public.tbl_users AS tutor
    ON tutor.tu_id = assignment.tta_tutor_id
  LEFT JOIN public.tbl_user_profiles AS profile
    ON profile.tup_user_id = tutor.tu_id
  LEFT JOIN public.tbl_tutors AS tutor_profile
    ON tutor_profile.tt_user_id = tutor.tu_id
  LEFT JOIN public.tbl_courses AS direct_course
    ON direct_course.tc_id = assignment.tta_course_id
  LEFT JOIN public.tbl_courses AS enrollment_course
    ON enrollment_course.tc_id = enrollment.tce_course_id
  WHERE assignment.tta_is_active = true
    AND COALESCE(assignment.tta_status, 'active') = 'active'
    AND (
      assignment.tta_learner_id = auth.uid()
      OR enrollment.tce_user_id = auth.uid()
    )
  ORDER BY assignment.tta_assigned_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_assigned_tutors() TO authenticated;
