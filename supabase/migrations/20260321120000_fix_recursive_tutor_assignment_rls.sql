/*
  # Fix recursive RLS between tbl_user_profiles, tbl_tutors, and tbl_tutor_assignments

  ## Problem
  Some SELECT policies query other RLS-protected tables in a loop:
  - tbl_user_profiles -> tbl_tutor_assignments
  - tbl_tutor_assignments -> tbl_tutors
  - tbl_tutors -> tbl_tutor_assignments

  This causes:
  - 42P17 infinite recursion detected in policy for relation "tbl_tutor_assignments"

  ## Solution
  Move assignment/tutor membership checks into SECURITY DEFINER helpers so
  policy evaluation does not recursively invoke other table policies.
*/

CREATE OR REPLACE FUNCTION public.is_current_user_tutor_for_assignment(p_tutor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tbl_tutors t
    WHERE t.tt_id = p_tutor_id
      AND t.tt_user_id = auth.uid()
      AND t.tt_is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_assigned_to_tutor(p_tutor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tbl_tutor_assignments ta
    WHERE ta.tta_tutor_id = p_tutor_id
      AND ta.tta_learner_id = auth.uid()
      AND ta.tta_status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_current_user_view_profile(p_profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_profile_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.tbl_tutor_assignments ta
      JOIN public.tbl_tutors t ON t.tt_id = ta.tta_tutor_id
      WHERE ta.tta_learner_id = auth.uid()
        AND t.tt_user_id = p_profile_user_id
        AND ta.tta_status = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.tbl_tutor_assignments ta
      JOIN public.tbl_tutors t ON t.tt_id = ta.tta_tutor_id
      WHERE ta.tta_learner_id = p_profile_user_id
        AND t.tt_user_id = auth.uid()
        AND ta.tta_status = 'active'
    );
$$;

DROP POLICY IF EXISTS "Users can view relevant tutor assignments" ON public.tbl_tutor_assignments;
DROP POLICY IF EXISTS "Admins can view all tutor assignments" ON public.tbl_tutor_assignments;
DROP POLICY IF EXISTS "Tutors can view their assignments" ON public.tbl_tutor_assignments;
DROP POLICY IF EXISTS "Learners can view their assignments" ON public.tbl_tutor_assignments;
DROP POLICY IF EXISTS "Users can read own assignments" ON public.tbl_tutor_assignments;

CREATE POLICY "Users can view relevant tutor assignments"
ON public.tbl_tutor_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tbl_admin_users a
    WHERE a.tau_auth_uid = auth.uid()
      AND a.tau_is_active = true
  )
  OR tta_learner_id = auth.uid()
  OR public.is_current_user_tutor_for_assignment(tta_tutor_id)
);

DROP POLICY IF EXISTS "Learners can view assigned tutors" ON public.tbl_tutors;

CREATE POLICY "Learners can view assigned tutors"
ON public.tbl_tutors
FOR SELECT
TO authenticated
USING (
  tt_is_active = true
  AND public.is_current_user_assigned_to_tutor(tt_id)
);

DROP POLICY IF EXISTS "Users can read own profile" ON public.tbl_user_profiles;
DROP POLICY IF EXISTS "Learners can view assigned tutor profiles" ON public.tbl_user_profiles;
DROP POLICY IF EXISTS "Tutors can view assigned learner profiles" ON public.tbl_user_profiles;

CREATE POLICY "Users can read own profile"
ON public.tbl_user_profiles
FOR SELECT
TO authenticated
USING (public.can_current_user_view_profile(tup_user_id));
