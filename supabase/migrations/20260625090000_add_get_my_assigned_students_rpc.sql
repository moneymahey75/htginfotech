/*
  Return students assigned to the current tutor.

  Covers both direct enrollment assignments and course-level assignments, where
  every active enrollment under the assigned course should appear for the tutor.
*/

CREATE OR REPLACE FUNCTION public.get_my_assigned_students()
RETURNS TABLE (
  enrollment_id uuid,
  learner_id uuid,
  learner_email text,
  learner_first_name text,
  learner_last_name text,
  course_id uuid,
  course_title text,
  progress_percentage numeric,
  enrollment_date timestamptz,
  completed_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_assignments AS (
    SELECT
      assignment.tta_id,
      assignment.tta_enrollment_id,
      assignment.tta_learner_id,
      assignment.tta_course_id
    FROM public.tbl_tutor_assignments AS assignment
    WHERE assignment.tta_tutor_id = auth.uid()
      AND assignment.tta_is_active = true
      AND COALESCE(assignment.tta_status, 'active') = 'active'
  ),
  matched_enrollments AS (
    SELECT
      enrollment.tce_id,
      enrollment.tce_user_id,
      enrollment.tce_course_id,
      enrollment.tce_progress_percentage,
      enrollment.tce_enrollment_date,
      enrollment.tce_completed_at
    FROM public.tbl_course_enrollments AS enrollment
    INNER JOIN active_assignments AS assignment
      ON (
        assignment.tta_enrollment_id IS NOT NULL
        AND enrollment.tce_id = assignment.tta_enrollment_id
      )
      OR (
        assignment.tta_enrollment_id IS NULL
        AND assignment.tta_learner_id IS NULL
        AND assignment.tta_course_id IS NOT NULL
        AND enrollment.tce_course_id = assignment.tta_course_id
      )
      OR (
        assignment.tta_enrollment_id IS NULL
        AND assignment.tta_learner_id IS NOT NULL
        AND assignment.tta_course_id IS NOT NULL
        AND enrollment.tce_user_id = assignment.tta_learner_id
        AND enrollment.tce_course_id = assignment.tta_course_id
      )
    WHERE COALESCE(enrollment.tce_is_active, true) = true
  )
  SELECT DISTINCT ON (enrollment.tce_id)
    enrollment.tce_id AS enrollment_id,
    learner.tu_id AS learner_id,
    learner.tu_email AS learner_email,
    profile.tup_first_name AS learner_first_name,
    profile.tup_last_name AS learner_last_name,
    course.tc_id AS course_id,
    course.tc_title AS course_title,
    enrollment.tce_progress_percentage AS progress_percentage,
    enrollment.tce_enrollment_date AS enrollment_date,
    enrollment.tce_completed_at AS completed_at
  FROM matched_enrollments AS enrollment
  INNER JOIN public.tbl_users AS learner
    ON learner.tu_id = enrollment.tce_user_id
  LEFT JOIN public.tbl_user_profiles AS profile
    ON profile.tup_user_id = learner.tu_id
  INNER JOIN public.tbl_courses AS course
    ON course.tc_id = enrollment.tce_course_id
  ORDER BY enrollment.tce_id, enrollment.tce_enrollment_date DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_assigned_students() TO authenticated;
