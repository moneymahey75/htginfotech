/*
  # Fix User Profiles Unique Constraint
  
  This migration fixes the registration error by ensuring the tbl_user_profiles
  table has a proper unique constraint on tup_user_id column.
  
  1. Changes
    - Add unique constraint on tup_user_id if it doesn't exist
    - Ensure the register_user function can use ON CONFLICT properly
    - Fix any duplicate records that might prevent the constraint
*/

-- First, check if there are any duplicate user_id records and remove them
DELETE FROM tbl_user_profiles 
WHERE tup_id NOT IN (
  SELECT MIN(tup_id) 
  FROM tbl_user_profiles 
  GROUP BY tup_user_id
);

-- Add unique constraint on tup_user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tbl_user_profiles_tup_user_id_key'
  ) THEN
    ALTER TABLE tbl_user_profiles 
    ADD CONSTRAINT tbl_user_profiles_tup_user_id_key UNIQUE (tup_user_id);
  END IF;
END $$;

-- Also ensure there's a unique constraint on tup_username if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tbl_user_profiles_tup_username_key'
  ) THEN
    ALTER TABLE tbl_user_profiles 
    ADD CONSTRAINT tbl_user_profiles_tup_username_key UNIQUE (tup_username);
  END IF;
END $$;

-- Update the register_user function to handle conflicts properly
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
SELECT 'User profiles unique constraint added and register_user function updated!' as status;