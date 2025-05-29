-- Fix key_requests table to work with category_id instead of product_name
-- Make product_name nullable since we're using category_id now
ALTER TABLE key_requests ALTER COLUMN product_name DROP NOT NULL;

-- Add a default value for product_name when category_id is provided
-- This is for backwards compatibility with existing queries
CREATE OR REPLACE FUNCTION populate_product_name_from_category()
RETURNS TRIGGER AS $$
BEGIN
  -- If category_id is provided but product_name is not, populate it from the category
  IF NEW.category_id IS NOT NULL AND (NEW.product_name IS NULL OR NEW.product_name = '') THEN
    SELECT name INTO NEW.product_name 
    FROM product_categories 
    WHERE id = NEW.category_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate product_name from category
DROP TRIGGER IF EXISTS trigger_populate_product_name ON key_requests;
CREATE TRIGGER trigger_populate_product_name
  BEFORE INSERT OR UPDATE ON key_requests
  FOR EACH ROW
  EXECUTE FUNCTION populate_product_name_from_category();

-- Update existing records that have category_id but missing product_name
UPDATE key_requests 
SET product_name = product_categories.name
FROM product_categories 
WHERE key_requests.category_id = product_categories.id 
AND (key_requests.product_name IS NULL OR key_requests.product_name = ''); 