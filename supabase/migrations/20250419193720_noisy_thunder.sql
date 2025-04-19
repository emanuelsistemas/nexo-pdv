/*
  # Add product images table

  1. New Tables
    - `product_images`
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products)
      - `url` (text, the public URL of the image)
      - `is_primary` (boolean, indicates if this is the primary product image)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on product_images table
    - Add policies for company-based isolation
    - Ensure users can only access images from their company's products

  3. Constraints
    - Foreign key to products table
    - Default value for is_primary is false
*/

-- Create product_images table
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX product_images_product_id_idx ON product_images(product_id);

-- Enable RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their company's product images"
  ON product_images
  FOR SELECT
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE company_id IN (
        SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create images for their company's products"
  ON product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    product_id IN (
      SELECT id FROM products WHERE company_id IN (
        SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their company's product images"
  ON product_images
  FOR UPDATE
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE company_id IN (
        SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their company's product images"
  ON product_images
  FOR DELETE
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE company_id IN (
        SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
      )
    )
  );

-- Create function to ensure only one primary image per product
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated row is marked as primary
  IF NEW.is_primary THEN
    -- Update all other images for this product to not be primary
    UPDATE product_images
    SET is_primary = false
    WHERE product_id = NEW.product_id
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single primary image
CREATE TRIGGER ensure_single_primary_image_trigger
BEFORE INSERT OR UPDATE ON product_images
FOR EACH ROW
EXECUTE FUNCTION ensure_single_primary_image();