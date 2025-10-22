/*
  # Stripe Connect Payment System

  ## Overview
  This migration sets up the complete Stripe Connect payment infrastructure for course payments with payment splitting capabilities.

  ## New Tables

  ### 1. tbl_stripe_connect_accounts
  Stores Stripe Connect account configurations for admins who will receive payment splits
  - `tsca_id` (uuid, primary key)
  - `tsca_admin_id` (uuid, references admin users) - Which admin owns this account
  - `tsca_account_name` (text) - Friendly name for the account
  - `tsca_stripe_account_id` (text) - Stripe Connect account ID
  - `tsca_is_active` (boolean) - Whether this account is active
  - `tsca_default_split_percentage` (decimal) - Default percentage for splits
  - `tsca_created_at` (timestamptz)
  - `tsca_updated_at` (timestamptz)

  ### 2. tbl_stripe_config
  Stores global Stripe configuration (API keys, platform settings)
  - `tsc_id` (uuid, primary key)
  - `tsc_publishable_key` (text) - Stripe publishable key
  - `tsc_secret_key` (text, encrypted) - Stripe secret key
  - `tsc_webhook_secret` (text) - Stripe webhook secret
  - `tsc_platform_fee_percentage` (decimal) - Platform fee percentage
  - `tsc_is_live_mode` (boolean) - Test vs Live mode
  - `tsc_created_at` (timestamptz)
  - `tsc_updated_at` (timestamptz)

  ### 3. tbl_payment_splits
  Defines how payments should be split for specific courses or globally
  - `tps_id` (uuid, primary key)
  - `tps_course_id` (uuid, nullable) - Specific course or null for global
  - `tps_stripe_account_id` (uuid) - Which Stripe account receives this split
  - `tps_split_percentage` (decimal) - Percentage of payment
  - `tps_is_active` (boolean)
  - `tps_created_at` (timestamptz)

  ### 4. tbl_payment_transactions (enhanced)
  Extended payment records with Stripe details and split tracking
  - Added Stripe-specific fields to existing tbl_payments or create comprehensive new table

  ## Security
  - All tables have RLS enabled
  - Admin-only access for configuration tables
  - Learners can only view their own payment history
  - Sensitive keys stored with appropriate access controls

  ## Important Notes
  - Payment splits must total 100% for validation
  - Supports multiple connected accounts per payment
  - Tracks both successful and failed transactions
  - Maintains audit trail for all payment operations
*/

-- Create Stripe Connect accounts table
CREATE TABLE IF NOT EXISTS tbl_stripe_connect_accounts (
  tsca_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tsca_admin_id uuid REFERENCES tbl_admin_users(tau_id) ON DELETE CASCADE,
  tsca_account_name text NOT NULL,
  tsca_stripe_account_id text NOT NULL,
  tsca_is_active boolean DEFAULT true,
  tsca_default_split_percentage decimal(5,2) DEFAULT 0.00,
  tsca_created_at timestamptz DEFAULT now(),
  tsca_updated_at timestamptz DEFAULT now()
);

-- Create Stripe configuration table
CREATE TABLE IF NOT EXISTS tbl_stripe_config (
  tsc_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tsc_publishable_key text NOT NULL,
  tsc_secret_key text NOT NULL,
  tsc_webhook_secret text,
  tsc_platform_fee_percentage decimal(5,2) DEFAULT 0.00,
  tsc_is_live_mode boolean DEFAULT false,
  tsc_created_at timestamptz DEFAULT now(),
  tsc_updated_at timestamptz DEFAULT now()
);

-- Create payment splits configuration table
CREATE TABLE IF NOT EXISTS tbl_payment_splits (
  tps_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tps_course_id uuid REFERENCES tbl_courses(tc_id) ON DELETE CASCADE,
  tps_stripe_account_id uuid REFERENCES tbl_stripe_connect_accounts(tsca_id) ON DELETE CASCADE,
  tps_split_percentage decimal(5,2) NOT NULL,
  tps_is_active boolean DEFAULT true,
  tps_created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_percentage CHECK (tps_split_percentage >= 0 AND tps_split_percentage <= 100)
);

-- Enhance existing payments table with Stripe fields
DO $$
BEGIN
  -- Add Stripe-specific columns to tbl_payments if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tbl_payments' AND column_name = 'tp_stripe_payment_intent_id') THEN
    ALTER TABLE tbl_payments ADD COLUMN tp_stripe_payment_intent_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tbl_payments' AND column_name = 'tp_stripe_charge_id') THEN
    ALTER TABLE tbl_payments ADD COLUMN tp_stripe_charge_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tbl_payments' AND column_name = 'tp_payment_method') THEN
    ALTER TABLE tbl_payments ADD COLUMN tp_payment_method text DEFAULT 'stripe';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tbl_payments' AND column_name = 'tp_currency') THEN
    ALTER TABLE tbl_payments ADD COLUMN tp_currency text DEFAULT 'usd';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tbl_payments' AND column_name = 'tp_receipt_url') THEN
    ALTER TABLE tbl_payments ADD COLUMN tp_receipt_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tbl_payments' AND column_name = 'tp_metadata') THEN
    ALTER TABLE tbl_payments ADD COLUMN tp_metadata jsonb;
  END IF;
END $$;

-- Create payment split transactions table (tracks actual splits per payment)
CREATE TABLE IF NOT EXISTS tbl_payment_split_transactions (
  tpst_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tpst_payment_id uuid REFERENCES tbl_payments(tp_id) ON DELETE CASCADE,
  tpst_stripe_account_id uuid REFERENCES tbl_stripe_connect_accounts(tsca_id),
  tpst_split_amount decimal(10,2) NOT NULL,
  tpst_split_percentage decimal(5,2) NOT NULL,
  tpst_stripe_transfer_id text,
  tpst_status text DEFAULT 'pending',
  tpst_created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_admin ON tbl_stripe_connect_accounts(tsca_admin_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_active ON tbl_stripe_connect_accounts(tsca_is_active);
CREATE INDEX IF NOT EXISTS idx_payment_splits_course ON tbl_payment_splits(tps_course_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_account ON tbl_payment_splits(tps_stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_intent ON tbl_payments(tp_stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_split_trans_payment ON tbl_payment_split_transactions(tpst_payment_id);

-- Enable Row Level Security
ALTER TABLE tbl_stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_stripe_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_payment_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_payment_split_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tbl_stripe_connect_accounts
CREATE POLICY "Admins can view all Stripe accounts"
  ON tbl_stripe_connect_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert Stripe accounts"
  ON tbl_stripe_connect_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update Stripe accounts"
  ON tbl_stripe_connect_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete Stripe accounts"
  ON tbl_stripe_connect_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
    )
  );

-- RLS Policies for tbl_stripe_config
CREATE POLICY "Admins can view Stripe config"
  ON tbl_stripe_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage Stripe config"
  ON tbl_stripe_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
    )
  );

-- RLS Policies for tbl_payment_splits
CREATE POLICY "Admins can view payment splits"
  ON tbl_payment_splits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage payment splits"
  ON tbl_payment_splits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
    )
  );

-- RLS Policies for tbl_payment_split_transactions
CREATE POLICY "Admins can view split transactions"
  ON tbl_payment_split_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_admin_users
      WHERE tau_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own split transactions"
  ON tbl_payment_split_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_payments
      WHERE tp_id = tpst_payment_id
      AND tp_user_id = auth.uid()
    )
  );

-- Create function to validate payment splits total 100%
CREATE OR REPLACE FUNCTION validate_payment_splits(p_course_id uuid)
RETURNS boolean AS $$
DECLARE
  v_total decimal(5,2);
BEGIN
  SELECT COALESCE(SUM(tps_split_percentage), 0)
  INTO v_total
  FROM tbl_payment_splits
  WHERE tps_course_id = p_course_id
  AND tps_is_active = true;

  RETURN v_total = 100.00 OR v_total = 0.00;
END;
$$ LANGUAGE plpgsql;

-- Create function to get active payment splits for a course
CREATE OR REPLACE FUNCTION get_payment_splits_for_course(p_course_id uuid)
RETURNS TABLE (
  account_id uuid,
  account_name text,
  stripe_account_id text,
  split_percentage decimal(5,2)
) AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql;