-- ═══════════════════════════════════════════════════════════
-- Supabase SQL: Run this in Supabase Dashboard → SQL Editor
-- Creates the `referrals` table for tracking team referrals
-- ═══════════════════════════════════════════════════════════

-- 1. Create the referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref         TEXT        NOT NULL DEFAULT 'direct',   -- team member code
  wallet      TEXT        NOT NULL,                     -- participant wallet pubkey
  amount      BIGINT      NOT NULL DEFAULT 0,           -- lamports transferred
  tx_signature TEXT       NOT NULL,                     -- on-chain tx signature
  user_agent  TEXT        DEFAULT '',                   -- browser UA
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index for fast lookups by team member code
CREATE INDEX IF NOT EXISTS idx_referrals_ref ON referrals (ref);

-- 3. Index for checking duplicate wallets
CREATE INDEX IF NOT EXISTS idx_referrals_wallet ON referrals (wallet);

-- 4. Index for checking duplicate tx signatures
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_tx ON referrals (tx_signature);

-- ═══════════════════════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════
-- Enable RLS on the table
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone (anon) can INSERT new referral records
CREATE POLICY "Allow anonymous inserts"
  ON referrals
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Anyone (anon) can SELECT / read all records
-- (the admin dashboard reads from the frontend)
CREATE POLICY "Allow anonymous reads"
  ON referrals
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow anonymous DELETE (for admin "Clear All" function)
-- If you want to restrict this, change TO anon → TO authenticated
-- and use a service_role key on a backend instead.
CREATE POLICY "Allow anonymous deletes"
  ON referrals
  FOR DELETE
  TO anon
  USING (true);
