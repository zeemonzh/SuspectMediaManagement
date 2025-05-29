-- Fix payout_requests table to allow 'paid' status
-- This allows admins to mark payout requests as paid after PayPal payment

-- Drop the existing constraint
ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_status_check;

-- Add the new constraint with 'paid' status included
ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_status_check 
CHECK (status IN ('pending', 'approved', 'denied', 'paid'));

-- Add paid_at column to track when payment was completed
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_payout_requests_paid_at ON payout_requests(paid_at);

-- Add comment for documentation
COMMENT ON COLUMN payout_requests.paid_at IS 'Timestamp when payout was marked as paid'; 