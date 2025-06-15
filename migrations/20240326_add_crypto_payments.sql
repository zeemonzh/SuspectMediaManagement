-- Add crypto payment support to payout_requests table
ALTER TABLE payout_requests 
ADD COLUMN IF NOT EXISTS ltc_address TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('paypal', 'ltc')) DEFAULT 'paypal';

-- Add crypto payment info to streamers table for default values
ALTER TABLE streamers 
ADD COLUMN IF NOT EXISTS ltc_address TEXT,
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT CHECK (preferred_payment_method IN ('paypal', 'ltc')) DEFAULT 'paypal';

-- Replace average_viewers and peak_viewers with total_viewers
ALTER TABLE payout_requests 
DROP COLUMN IF EXISTS average_viewers,
DROP COLUMN IF EXISTS peak_viewers,
ADD COLUMN IF NOT EXISTS total_viewers INTEGER;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payout_requests_ltc ON payout_requests(ltc_address);
CREATE INDEX IF NOT EXISTS idx_streamers_ltc ON streamers(ltc_address);
CREATE INDEX IF NOT EXISTS idx_payout_requests_payment_method ON payout_requests(payment_method);
CREATE INDEX IF NOT EXISTS idx_streamers_payment_method ON streamers(preferred_payment_method);
CREATE INDEX IF NOT EXISTS idx_payout_requests_total_viewers ON payout_requests(total_viewers);

-- Add comments for documentation
COMMENT ON COLUMN payout_requests.ltc_address IS 'Litecoin address for crypto payments';
COMMENT ON COLUMN payout_requests.payment_method IS 'Payment method chosen for this payout (paypal or ltc)';
COMMENT ON COLUMN payout_requests.total_viewers IS 'Total viewers for the stream session';
COMMENT ON COLUMN streamers.ltc_address IS 'Default Litecoin address for streamer payments';
COMMENT ON COLUMN streamers.preferred_payment_method IS 'Preferred payment method for streamer (paypal or ltc)'; 