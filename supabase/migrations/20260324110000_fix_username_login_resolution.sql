/*
  # Fix Username Login Resolution

  ## Problem
  Username login was resolving against `tbl_users.tu_email`, which can drift from
  `auth.users.email`. When that happens, email login still works but username login fails.

  ## Fix
  Resolve usernames to the canonical email stored in `auth.users`, with a fallback to
  `tbl_users.tu_email` for safety.
*/

CREATE OR REPLACE FUNCTION resolve_login_identifier(p_login_identifier text)
RETURNS jsonb AS $$
DECLARE
  v_identifier text := lower(trim(coalesce(p_login_identifier, '')));
  v_user_id uuid;
  v_email text;
BEGIN
  IF v_identifier = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_IDENTIFIER'
    );
  END IF;

  IF position('@' in v_identifier) > 0 THEN
    SELECT
      u.tu_id,
      lower(coalesce(au.email, u.tu_email))
    INTO v_user_id, v_email
    FROM public.tbl_users u
    LEFT JOIN auth.users au ON au.id = u.tu_id
    WHERE lower(coalesce(au.email, u.tu_email)) = v_identifier
       OR lower(u.tu_email) = v_identifier
    LIMIT 1;
  ELSE
    SELECT
      u.tu_id,
      lower(coalesce(au.email, u.tu_email))
    INTO v_user_id, v_email
    FROM public.tbl_user_profiles p
    INNER JOIN public.tbl_users u ON u.tu_id = p.tup_user_id
    LEFT JOIN auth.users au ON au.id = u.tu_id
    WHERE lower(p.tup_username) = v_identifier
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'success', v_email IS NOT NULL,
    'user_id', v_user_id,
    'email', v_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION resolve_login_identifier(text) TO anon;
GRANT EXECUTE ON FUNCTION resolve_login_identifier(text) TO authenticated;
