/*
  # Add resilient user profile details RPC

  1. New function
    - `get_user_profile_details(uuid)` returns account + profile as JSON
    - Auto-creates a missing `tbl_users` row from `auth.users` for the signed-in user

  2. Security
    - Restricted to the authenticated user requesting their own profile
    - Uses SECURITY DEFINER to safely read `auth.users`
*/

CREATE OR REPLACE FUNCTION public.get_user_profile_details(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_auth_user RECORD;
  v_account RECORD;
  v_profile RECORD;
  v_user_type text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_request_user_id IS NULL OR v_request_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized profile access';
  END IF;

  SELECT id, email, raw_user_meta_data
  INTO v_auth_user
  FROM auth.users
  WHERE id = v_request_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated user record not found';
  END IF;

  SELECT
    tu_id,
    tu_email,
    tu_user_type,
    tu_is_verified,
    tu_email_verified,
    tu_mobile_verified,
    tu_is_active,
    tu_created_at,
    tu_updated_at
  INTO v_account
  FROM public.tbl_users
  WHERE tu_id = v_request_user_id;

  IF NOT FOUND THEN
    v_user_type := lower(trim(COALESCE(v_auth_user.raw_user_meta_data ->> 'user_type', 'learner')));

    IF v_user_type NOT IN ('learner', 'tutor', 'job_seeker', 'job_provider', 'admin') THEN
      v_user_type := 'learner';
    END IF;

    INSERT INTO public.tbl_users (
      tu_id,
      tu_email,
      tu_user_type,
      tu_is_verified,
      tu_email_verified,
      tu_mobile_verified,
      tu_is_active
    )
    VALUES (
      v_request_user_id,
      COALESCE(v_auth_user.email, ''),
      v_user_type,
      false,
      false,
      false,
      true
    )
    ON CONFLICT (tu_id) DO UPDATE
    SET
      tu_email = EXCLUDED.tu_email,
      tu_updated_at = now()
    RETURNING
      tu_id,
      tu_email,
      tu_user_type,
      tu_is_verified,
      tu_email_verified,
      tu_mobile_verified,
      tu_is_active,
      tu_created_at,
      tu_updated_at
    INTO v_account;
  END IF;

  SELECT
    tup_id,
    tup_user_id,
    tup_first_name,
    tup_middle_name,
    tup_last_name,
    tup_username,
    tup_mobile,
    tup_gender,
    tup_date_of_birth,
    tup_education_level,
    tup_interests,
    tup_learning_goals,
    tup_timezone,
    tup_created_at,
    tup_updated_at
  INTO v_profile
  FROM public.tbl_user_profiles
  WHERE tup_user_id = v_request_user_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'account',
    jsonb_build_object(
      'tu_id', v_account.tu_id,
      'tu_email', v_account.tu_email,
      'tu_user_type', v_account.tu_user_type,
      'tu_is_verified', v_account.tu_is_verified,
      'tu_email_verified', v_account.tu_email_verified,
      'tu_mobile_verified', v_account.tu_mobile_verified,
      'tu_is_active', v_account.tu_is_active,
      'tu_created_at', v_account.tu_created_at,
      'tu_updated_at', v_account.tu_updated_at
    ),
    'profile',
    CASE
      WHEN v_profile.tup_user_id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'tup_id', v_profile.tup_id,
        'tup_user_id', v_profile.tup_user_id,
        'tup_first_name', v_profile.tup_first_name,
        'tup_middle_name', v_profile.tup_middle_name,
        'tup_last_name', v_profile.tup_last_name,
        'tup_username', v_profile.tup_username,
        'tup_mobile', v_profile.tup_mobile,
        'tup_gender', v_profile.tup_gender,
        'tup_date_of_birth', v_profile.tup_date_of_birth,
        'tup_education_level', v_profile.tup_education_level,
        'tup_interests', COALESCE(v_profile.tup_interests, '[]'::jsonb),
        'tup_learning_goals', v_profile.tup_learning_goals,
        'tup_timezone', v_profile.tup_timezone,
        'tup_created_at', v_profile.tup_created_at,
        'tup_updated_at', v_profile.tup_updated_at
      )
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile_details(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_user_profile_details(uuid)
IS 'Returns the authenticated user account/profile and recreates a missing tbl_users row from auth.users when needed.';
