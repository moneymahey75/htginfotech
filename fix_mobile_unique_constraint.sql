/*
  # Fix Mobile Field Unique Constraint

  This migration fixes the mobile field unique constraint to allow NULL values
  when mobile number is not specified. This prevents errors when updating profiles
  without providing a mobile number.

  ## Changes
  - Drop existing unique constraint on tup_mobile if it exists
  - Create a partial unique index that only applies to non-NULL values
  - This allows multiple NULL values while ensuring actual mobile numbers remain unique
*/

-- Drop the existing unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tbl_user_profiles'
    AND constraint_name = 'unique_tup_mobile'
  ) THEN
    ALTER TABLE tbl_user_profiles DROP CONSTRAINT unique_tup_mobile;
    RAISE NOTICE 'Dropped unique_tup_mobile constraint';
  END IF;
END $$;

-- Drop the unique index if it exists (in case it was created as an index instead of constraint)
DROP INDEX IF EXISTS unique_tup_mobile;
DROP INDEX IF EXISTS tbl_user_profiles_tup_mobile_key;

-- Create a partial unique index that only applies to non-NULL mobile numbers
-- This allows multiple NULL values while ensuring actual mobile numbers are unique
CREATE UNIQUE INDEX IF NOT EXISTS tbl_user_profiles_tup_mobile_unique_idx
ON tbl_user_profiles (tup_mobile)
WHERE tup_mobile IS NOT NULL AND tup_mobile != '';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Mobile field constraint updated successfully!';
  RAISE NOTICE 'NULL and empty mobile values are now allowed, but actual mobile numbers must be unique.';
END $$;
