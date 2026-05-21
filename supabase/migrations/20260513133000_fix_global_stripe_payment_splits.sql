/*
  # Fix global Stripe split lookup

  Allows payment split resolution to:
  - prefer course-specific split rules when they exist
  - otherwise fall back to global split rules where tps_course_id is null
*/

CREATE OR REPLACE FUNCTION get_payment_splits_for_course(p_course_id uuid)
RETURNS TABLE (
  account_id uuid,
  account_name text,
  stripe_account_id text,
  split_percentage decimal(5,2)
) AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM tbl_payment_splits
    WHERE tps_course_id = p_course_id
      AND tps_is_active = true
  ) THEN
    RETURN QUERY
    SELECT
      tsca.tsca_id,
      tsca.tsca_account_name,
      tsca.tsca_stripe_account_id,
      tps.tps_split_percentage
    FROM tbl_payment_splits tps
    JOIN tbl_stripe_connect_accounts tsca ON tps.tps_stripe_account_id = tsca.tsca_id
    WHERE tps.tps_course_id = p_course_id
      AND tps.tps_is_active = true
      AND tsca.tsca_is_active = true
    ORDER BY tps.tps_split_percentage DESC;
  ELSE
    RETURN QUERY
    SELECT
      tsca.tsca_id,
      tsca.tsca_account_name,
      tsca.tsca_stripe_account_id,
      tps.tps_split_percentage
    FROM tbl_payment_splits tps
    JOIN tbl_stripe_connect_accounts tsca ON tps.tps_stripe_account_id = tsca.tsca_id
    WHERE tps.tps_course_id IS NULL
      AND tps.tps_is_active = true
      AND tsca.tsca_is_active = true
    ORDER BY tps.tps_split_percentage DESC;
  END IF;
END;
$$ LANGUAGE plpgsql;
