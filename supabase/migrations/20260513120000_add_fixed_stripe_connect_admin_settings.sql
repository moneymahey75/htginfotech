/*
  # Add fixed Stripe Connect admin settings

  Adds configuration columns needed for a fixed two-account Stripe Connect setup:
  - Charge strategy selection
  - Fixed split percentages
  - Currency and enable flag
  - Connected account controller settings required by Stripe
*/

ALTER TABLE tbl_stripe_config
  ADD COLUMN IF NOT EXISTS tsc_connect_charge_type text DEFAULT 'direct_charges',
  ADD COLUMN IF NOT EXISTS tsc_default_currency text DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS tsc_split_primary_percentage decimal(5,2) DEFAULT 70.00,
  ADD COLUMN IF NOT EXISTS tsc_split_secondary_percentage decimal(5,2) DEFAULT 30.00,
  ADD COLUMN IF NOT EXISTS tsc_split_is_fixed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tsc_connect_enabled boolean DEFAULT false;

ALTER TABLE tbl_stripe_connect_accounts
  ADD COLUMN IF NOT EXISTS tsca_account_role text,
  ADD COLUMN IF NOT EXISTS tsca_controller_losses_payments text DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS tsca_controller_fees_payer text DEFAULT 'account',
  ADD COLUMN IF NOT EXISTS tsca_controller_requirement_collection text DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS tsca_controller_stripe_dashboard_type text DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS tsca_capabilities_transfers_requested boolean DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tbl_stripe_config_charge_type_check'
  ) THEN
    ALTER TABLE tbl_stripe_config
      ADD CONSTRAINT tbl_stripe_config_charge_type_check
      CHECK (tsc_connect_charge_type IN ('direct_charges', 'destination_charges'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tbl_stripe_connect_accounts_role_check'
  ) THEN
    ALTER TABLE tbl_stripe_connect_accounts
      ADD CONSTRAINT tbl_stripe_connect_accounts_role_check
      CHECK (
        tsca_account_role IS NULL OR
        tsca_account_role IN ('primary_recipient', 'secondary_recipient')
      );
  END IF;
END $$;
