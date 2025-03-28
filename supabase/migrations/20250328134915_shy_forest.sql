/*
  # Fix products and product_units relationship

  1. Changes
    - Add foreign key constraint between products and product_units tables
    - Handle existing invalid unit_id references
    - Create index for better performance
    - Ensure data integrity

  2. Security
    - Maintain data integrity with proper foreign key constraint
    - Add index for better query performance
    - Clean up invalid references before adding constraint
*/

-- First, identify and fix any products with invalid unit_id references
DO $$ 
BEGIN
  -- Get the ID of the first UN unit (which should exist in product_units)
  WITH default_unit AS (
    SELECT id 
    FROM product_units 
    WHERE code = 'UN' 
    LIMIT 1
  )
  UPDATE products p
  SET unit_id = (SELECT id FROM default_unit)
  WHERE unit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM product_units pu 
    WHERE pu.id = p.unit_id
  );
END $$;

-- Now add the foreign key constraint
DO $$ 
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'products_unit_id_fkey'
    AND table_name = 'products'
  ) THEN
    -- Create index first if it doesn't exist
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE tablename = 'products'
      AND indexname = 'products_unit_id_idx'
    ) THEN
      CREATE INDEX products_unit_id_idx ON products(unit_id);
    END IF;

    -- Add the foreign key constraint
    ALTER TABLE products
    ADD CONSTRAINT products_unit_id_fkey
    FOREIGN KEY (unit_id)
    REFERENCES product_units(id);
  END IF;
END $$;