/*
  # Add Secure Login Identifier Resolution

  1. New Functions
    - `resolve_login_identifier` resolves email or username to the account email
    - `check_user_login_eligibility` now also checks for locked accounts

  2. Security
    - Uses SECURITY DEFINER so anon login flows can resolve usernames safely
    - Returns only the fields needed for authentication
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
    SELECT tu_id, lower(tu_email)
    INTO v_user_id, v_email
    FROM tbl_users
    WHERE lower(tu_email) = v_identifier
    LIMIT 1;
  ELSE
    SELECT u.tu_id, lower(u.tu_email)
    INTO v_user_id, v_email
    FROM tbl_user_profiles p
    INNER JOIN tbl_users u ON u.tu_id = p.tup_user_id
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
SET search_path = public;

GRANT EXECUTE ON FUNCTION resolve_login_identifier(text) TO anon;
GRANT EXECUTE ON FUNCTION resolve_login_identifier(text) TO authenticated;

CREATE OR REPLACE FUNCTION check_user_login_eligibility(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_user_record RECORD;
  v_email_verification_required boolean;
  v_mobile_verification_required boolean;
  v_either_verification_required boolean;
  v_banned_until timestamptz;
BEGIN
  SELECT 
    tu_is_active,
    tu_email_verified,
    tu_mobile_verified,
    tu_user_type
  INTO v_user_record
  FROM tbl_users
  WHERE tu_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'error_code', 'USER_NOT_FOUND'
    );
  END IF;

  SELECT banned_until
  INTO v_banned_until
  FROM auth.users
  WHERE id = p_user_id;

  IF v_banned_until IS NOT NULL AND v_banned_until > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Your account is temporarily locked. Please contact support for assistance.',
      'error_code', 'ACCOUNT_LOCKED',
      'details', jsonb_build_object(
        'locked_until', v_banned_until
      )
    );
  END IF;

  IF NOT v_user_record.tu_is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Your account is inactive. Please contact support for assistance.',
      'error_code', 'ACCOUNT_INACTIVE'
    );
  END IF;

  SELECT COALESCE((tss_setting_value::text)::boolean, false)
  INTO v_email_verification_required
  FROM tbl_system_settings
  WHERE tss_setting_key = 'email_verification_required';

  SELECT COALESCE((tss_setting_value::text)::boolean, false)
  INTO v_mobile_verification_required
  FROM tbl_system_settings
  WHERE tss_setting_key = 'mobile_verification_required';

  SELECT COALESCE((tss_setting_value::text)::boolean, false)
  INTO v_either_verification_required
  FROM tbl_system_settings
  WHERE tss_setting_key = 'either_verification_required';

  IF v_either_verification_required THEN
    IF NOT v_user_record.tu_email_verified AND NOT v_user_record.tu_mobile_verified THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Please verify either your email or mobile number to continue.',
        'error_code', 'VERIFICATION_REQUIRED',
        'details', jsonb_build_object(
          'email_verified', v_user_record.tu_email_verified,
          'mobile_verified', v_user_record.tu_mobile_verified,
          'either_required', true
        )
      );
    END IF;
  ELSE
    IF v_email_verification_required AND NOT v_user_record.tu_email_verified THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Your email address is not verified. Please verify your email to continue.',
        'error_code', 'EMAIL_VERIFICATION_REQUIRED',
        'details', jsonb_build_object(
          'email_verified', v_user_record.tu_email_verified
        )
      );
    END IF;

    IF v_mobile_verification_required AND NOT v_user_record.tu_mobile_verified THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Please verify your mobile number to continue.',
        'error_code', 'MOBILE_VERIFICATION_REQUIRED',
        'details', jsonb_build_object(
          'mobile_verified', v_user_record.tu_mobile_verified
        )
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User is eligible to log in'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to check login eligibility: ' || SQLERRM,
      'error_code', 'SYSTEM_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION check_user_login_eligibility(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_login_eligibility(uuid) TO anon;
