/*
  # Fix Sponsorship Number Trigger Error
  
  This migration fixes the registration error caused by a trigger trying to access
  a non-existent tup_sponsorship_number field in the tbl_user_profiles table.
  
  1. Changes
    - Drop the auto_generate_sponsorship_number trigger
    - Drop the generate_sponsorship_number function (no longer needed)
    - Remove the trigger that's causing the registration failure
*/

-- Drop the trigger that's causing the error
DROP TRIGGER IF EXISTS trigger_auto_sponsorship_number ON tbl_user_profiles;

-- Drop the function that's no longer needed
DROP FUNCTION IF EXISTS auto_generate_sponsorship_number();
DROP FUNCTION IF EXISTS generate_sponsorship_number();

-- Verify the register_user function works without the sponsorship trigger
CREATE OR REPLACE FUNCTION register_user(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_middle_name text,
  p_last_name text,
  p_username text,
  p_mobile text,
  p_user_type text
) RETURNS void AS $$
BEGIN
  -- Insert user record
  INSERT INTO tbl_users (tu_id, tu_email, tu_user_type, tu_is_active)
  VALUES (p_user_id, p_email, p_user_type, true)
  ON CONFLICT (tu_id) DO UPDATE SET
    tu_email = EXCLUDED.tu_email,
    tu_user_type = EXCLUDED.tu_user_type,
    tu_is_active = EXCLUDED.tu_is_active,
    tu_updated_at = now();
  
  -- Insert profile record with proper conflict handling
  INSERT INTO tbl_user_profiles (
    tup_user_id, 
    tup_first_name, 
    tup_middle_name, 
    tup_last_name, 
    tup_username, 
    tup_mobile
  ) VALUES (
    p_user_id, 
    p_first_name, 
    p_middle_name, 
    p_last_name,
    p_username, 
    p_mobile
  )
  ON CONFLICT (tup_user_id) DO UPDATE SET
    tup_first_name = EXCLUDED.tup_first_name,
    tup_middle_name = EXCLUDED.tup_middle_name,
    tup_last_name = EXCLUDED.tup_last_name,
    tup_username = EXCLUDED.tup_username,
    tup_mobile = EXCLUDED.tup_mobile,
    tup_updated_at = now();
  
  -- Insert tutor record if user type is tutor
  IF p_user_type = 'tutor' THEN
    INSERT INTO tbl_tutors (tt_user_id, tt_is_active)
    VALUES (p_user_id, true)
    ON CONFLICT (tt_user_id) DO UPDATE SET
      tt_is_active = EXCLUDED.tt_is_active,
      tt_updated_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION register_user TO authenticated;

-- Success message
SELECT 'Sponsorship number trigger removed and register_user function updated!' as status;