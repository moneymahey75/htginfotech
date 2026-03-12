/*
  # Fix Login Verification and Active Status Checks

  1. New Functions
    - `check_user_login_eligibility` - Validates if user can log in based on:
      * Account active status (tu_is_active)
      * Email verification requirements
      * Mobile verification requirements
      * Either verification option

  2. Security
    - Function checks registration settings from tbl_system_settings
    - Returns detailed error messages for better UX
    - Maintains RLS policies
    
  3. Changes
    - Prevents deactivated users from logging in
    - Enforces verification requirements configured by admin
    - Provides clear error messages for each failure case
*/

-- Create function to check user login eligibility
CREATE OR REPLACE FUNCTION check_user_login_eligibility(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_user_record RECORD;
  v_email_verification_required boolean;
  v_mobile_verification_required boolean;
  v_either_verification_required boolean;
BEGIN
  -- Get user record
  SELECT 
    tu_is_active,
    tu_email_verified,
    tu_mobile_verified,
    tu_user_type
  INTO v_user_record
  FROM tbl_users
  WHERE tu_id = p_user_id;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'error_code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Check if user account is active
  IF NOT v_user_record.tu_is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Your account has been deactivated. Please contact support for assistance.',
      'error_code', 'ACCOUNT_DEACTIVATED'
    );
  END IF;

  -- Get registration verification settings
  SELECT 
    COALESCE((tss_setting_value::text)::boolean, false)
  INTO v_email_verification_required
  FROM tbl_system_settings
  WHERE tss_setting_key = 'email_verification_required';

  SELECT 
    COALESCE((tss_setting_value::text)::boolean, false)
  INTO v_mobile_verification_required
  FROM tbl_system_settings
  WHERE tss_setting_key = 'mobile_verification_required';

  SELECT 
    COALESCE((tss_setting_value::text)::boolean, false)
  INTO v_either_verification_required
  FROM tbl_system_settings
  WHERE tss_setting_key = 'either_verification_required';

  -- If "either" option is enabled, check if at least one is verified
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
    -- Check individual verification requirements
    IF v_email_verification_required AND NOT v_user_record.tu_email_verified THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Please verify your email address to continue. Check your inbox for the verification link.',
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

  -- All checks passed
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_login_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_login_eligibility TO anon;

-- Add index for faster lookups on tu_is_active
CREATE INDEX IF NOT EXISTS idx_users_is_active ON tbl_users(tu_is_active) WHERE tu_is_active = true;

-- Add comment
COMMENT ON FUNCTION check_user_login_eligibility IS 'Checks if a user is eligible to log in based on account status and verification requirements';
