-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add category_id to product_keys table
ALTER TABLE product_keys ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);

-- Create some default categories
INSERT INTO product_categories (name, description) VALUES 
    ('Premium Cheat Package', 'High-tier cheats with advanced features'),
    ('VIP Access Package', 'VIP membership and exclusive access'),
    ('Elite Membership', 'Elite tier with all features'),
    ('Test Package', 'Testing and development keys')
ON CONFLICT (name) DO NOTHING;

-- Update existing keys to use categories based on their current product_name
UPDATE product_keys 
SET category_id = (
    SELECT id FROM product_categories 
    WHERE product_categories.name = product_keys.product_name
    LIMIT 1
)
WHERE category_id IS NULL;

-- For any keys that don't match, assign them to a default category
UPDATE product_keys 
SET category_id = (
    SELECT id FROM product_categories 
    WHERE name = 'Test Package'
    LIMIT 1
)
WHERE category_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_keys_category_id ON product_keys(category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);

-- Enable RLS on product_categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_categories
-- Everyone can view categories
CREATE POLICY "Everyone can view product categories" ON product_categories
    FOR SELECT USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage product categories" ON product_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM streamers 
            WHERE streamers.user_id = auth.uid()
            AND streamers.role = 'admin'
        )
    );

-- Update key_requests to use category_id instead of product_name
ALTER TABLE key_requests ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);
ALTER TABLE product_keys ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);

-- Update existing requests to use categories
UPDATE key_requests 
SET category_id = (
    SELECT id FROM product_categories 
    WHERE product_categories.name ILIKE '%' || key_requests.product_name || '%'
    LIMIT 1
)
WHERE category_id IS NULL; 