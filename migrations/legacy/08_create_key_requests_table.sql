-- Create key_requests table
CREATE TABLE IF NOT EXISTS key_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    streamer_id UUID NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    admin_notes TEXT,
    assigned_key_id UUID REFERENCES product_keys(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_key_requests_streamer_id ON key_requests(streamer_id);
CREATE INDEX IF NOT EXISTS idx_key_requests_status ON key_requests(status);
CREATE INDEX IF NOT EXISTS idx_key_requests_created_at ON key_requests(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE key_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Streamers can view their own requests
CREATE POLICY "Streamers can view own key requests" ON key_requests
    FOR SELECT USING (auth.uid()::text = streamer_id::text);

-- Streamers can create their own requests
CREATE POLICY "Streamers can create key requests" ON key_requests
    FOR INSERT WITH CHECK (auth.uid()::text = streamer_id::text);

-- Admins can view all key requests
CREATE POLICY "Admins can view all key requests" ON key_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM streamers 
            WHERE streamers.user_id = auth.uid()
            AND streamers.role = 'admin'
        )
    );

-- Admins can update all key requests
CREATE POLICY "Admins can update key requests" ON key_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM streamers 
            WHERE streamers.user_id = auth.uid()
            AND streamers.role = 'admin'
        )
    ); 