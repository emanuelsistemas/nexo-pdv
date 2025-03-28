/*
  # Add CFOP column to products table

  1. Changes
    - Add cfop column to products table
    - Set default value to '5405'
    - Make column not nullable
    - Add check constraint for valid CFOP values

  2. Notes
    - CFOP is a fiscal code required for Brazilian tax purposes
    - Common values are '5405' and '5102'
    - Column is required for all products
*/

-- Add cfop column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'cfop'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN cfop TEXT NOT NULL DEFAULT '5405';

    -- Add check constraint for valid CFOP values
    ALTER TABLE products 
    ADD CONSTRAINT products_cfop_check 
    CHECK (cfop IN ('5405', '5102'));
  END IF;
END $$;