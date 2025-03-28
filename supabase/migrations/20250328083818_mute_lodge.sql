/*
  # Add unit_id relationship to products table

  1. Changes
    - Add unit_id column to products table
    - Add foreign key constraint to product_units
    - Update products table schema to use unit_id instead of unit
    - Remove old unit column

  2. Security
    - Maintain data integrity with foreign key constraint
    - Ensure proper relationships between tables
*/

-- Add unit_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'unit_id'
  ) THEN
    -- Add unit_id column
    ALTER TABLE products 
    ADD COLUMN unit_id UUID REFERENCES product_units(id);

    -- Remove old unit column if it exists
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name = 'unit'
    ) THEN
      ALTER TABLE products 
      DROP COLUMN unit;
    END IF;
  END IF;
END $$;