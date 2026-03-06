/*
  # Optimize RLS Policies Part 2 - Course & Enrollment Tables
  
  ## Changes - Part 2
  Optimizing policies for:
  - tbl_courses
  - tbl_course_enrollments
  - tbl_sessions
  - tbl_session_participants
  - tbl_reviews_ratings
*/

-- TBL_COURSES
DROP POLICY IF EXISTS "Only admins can create courses" ON tbl_courses;
CREATE POLICY "Only admins can create courses"
ON tbl_courses FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

DROP POLICY IF EXISTS "Public read access for active courses" ON tbl_courses;
CREATE POLICY "Public read access for active courses"
ON tbl_courses FOR SELECT
TO authenticated
USING (
  tc_is_active = true OR
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

-- TBL_COURSE_ENROLLMENTS
DROP POLICY IF EXISTS "Users can create pending enrollments" ON tbl_course_enrollments;
CREATE POLICY "Users can create pending enrollments"
ON tbl_course_enrollments FOR INSERT
TO authenticated
WITH CHECK (
  tce_user_id = (SELECT auth.uid()) AND
  tce_payment_status = 'pending'
);

DROP POLICY IF EXISTS "Users can view own enrollments" ON tbl_course_enrollments;
CREATE POLICY "Users can view own enrollments"
ON tbl_course_enrollments FOR SELECT
TO authenticated
USING (tce_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their progress" ON tbl_course_enrollments;
CREATE POLICY "Users can update their progress"
ON tbl_course_enrollments FOR UPDATE
TO authenticated
USING (tce_user_id = (SELECT auth.uid()) AND tce_is_active = true)
WITH CHECK (tce_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their progress simplified" ON tbl_course_enrollments;
CREATE POLICY "Users can update their progress simplified"
ON tbl_course_enrollments FOR UPDATE
TO authenticated
USING (tce_user_id = (SELECT auth.uid()))
WITH CHECK (tce_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all enrollments" ON tbl_course_enrollments;
CREATE POLICY "Admins can view all enrollments"
ON tbl_course_enrollments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

DROP POLICY IF EXISTS "Admins can update all enrollments" ON tbl_course_enrollments;
CREATE POLICY "Admins can update all enrollments"
ON tbl_course_enrollments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

DROP POLICY IF EXISTS "Admins can delete enrollments" ON tbl_course_enrollments;
CREATE POLICY "Admins can delete enrollments"
ON tbl_course_enrollments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tbl_admin_users 
    WHERE tau_email = (SELECT auth.jwt()->>'email') 
    AND tau_is_active = true
  )
);

-- TBL_SESSIONS
DROP POLICY IF EXISTS "Tutors can create sessions" ON tbl_sessions;
CREATE POLICY "Tutors can create sessions"
ON tbl_sessions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tbl_tutors
    WHERE tt_user_id = (SELECT auth.uid())
    AND tt_is_active = true
  )
);

-- TBL_SESSION_PARTICIPANTS
DROP POLICY IF EXISTS "Users can read own participation" ON tbl_session_participants;
CREATE POLICY "Users can read own participation"
ON tbl_session_participants FOR SELECT
TO authenticated
USING (tsp_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can join sessions" ON tbl_session_participants;
CREATE POLICY "Users can join sessions"
ON tbl_session_participants FOR INSERT
TO authenticated
WITH CHECK (tsp_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can leave sessions" ON tbl_session_participants;
CREATE POLICY "Users can leave sessions"
ON tbl_session_participants FOR UPDATE
TO authenticated
USING (tsp_user_id = (SELECT auth.uid()))
WITH CHECK (tsp_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own records" ON tbl_session_participants;
CREATE POLICY "Users can delete own records"
ON tbl_session_participants FOR DELETE
TO authenticated
USING (tsp_user_id = (SELECT auth.uid()));

-- TBL_REVIEWS_RATINGS
DROP POLICY IF EXISTS "Users can insert own reviews" ON tbl_reviews_ratings;
CREATE POLICY "Users can insert own reviews"
ON tbl_reviews_ratings FOR INSERT
TO authenticated
WITH CHECK (trr_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own reviews" ON tbl_reviews_ratings;
CREATE POLICY "Users can update own reviews"
ON tbl_reviews_ratings FOR UPDATE
TO authenticated
USING (trr_user_id = (SELECT auth.uid()))
WITH CHECK (trr_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own reviews" ON tbl_reviews_ratings;
CREATE POLICY "Users can delete own reviews"
ON tbl_reviews_ratings FOR DELETE
TO authenticated
USING (trr_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Tutors can see their own reviews" ON tbl_reviews_ratings;
CREATE POLICY "Tutors can see their own reviews"
ON tbl_reviews_ratings FOR SELECT
TO authenticated
USING (
  trr_review_type = 'tutor' AND
  EXISTS (
    SELECT 1 FROM tbl_tutors
    WHERE tt_id = trr_tutor_id
    AND tt_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Instructors can see course reviews" ON tbl_reviews_ratings;
CREATE POLICY "Instructors can see course reviews"
ON tbl_reviews_ratings FOR SELECT
TO authenticated
USING (
  trr_review_type = 'course' AND
  EXISTS (
    SELECT 1 FROM tbl_courses
    WHERE tc_id = trr_course_id
    AND tc_created_by = (SELECT auth.uid())
  )
);
