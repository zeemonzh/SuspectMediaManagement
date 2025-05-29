-- Add PayPal username to payout_requests table
ALTER TABLE payout_requests 
ADD COLUMN IF NOT EXISTS paypal_username TEXT;

-- Add PayPal username to streamers table for default value
ALTER TABLE streamers 
ADD COLUMN IF NOT EXISTS paypal_username TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payout_requests_paypal ON payout_requests(paypal_username);
CREATE INDEX IF NOT EXISTS idx_streamers_paypal ON streamers(paypal_username);

-- Add comment for documentation
COMMENT ON COLUMN payout_requests.paypal_username IS 'PayPal username for payment processing';
COMMENT ON COLUMN streamers.paypal_username IS 'Default PayPal username for streamers'; 