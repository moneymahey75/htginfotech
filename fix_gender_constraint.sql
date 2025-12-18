/*
  # Fix Gender Field Check Constraint

  This migration fixes the gender field constraint to allow NULL values
  when gender is not specified. This prevents errors when updating profiles
  without selecting a gender.

  ## Changes
  - Drop existing check constraint on tup_gender
  - Add new constraint that allows NULL or valid gender values
*/

-- Drop the existing check constraint
ALTER TABLE tbl_user_profiles
DROP CONSTRAINT IF EXISTS tbl_user_profiles_tup_gender_check;

-- Add new constraint that allows NULL
ALTER TABLE tbl_user_profiles
ADD CONSTRAINT tbl_user_profiles_tup_gender_check
CHECK (tup_gender IS NULL OR tup_gender IN ('male', 'female', 'other'));

-- Success message
SELECT 'Gender field constraint updated successfully! NULL values are now allowed.' as status;
