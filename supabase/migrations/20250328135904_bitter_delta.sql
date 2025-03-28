/*
  # Fix products unit_id foreign key constraint

  1. Changes
    - Drop existing foreign key constraint if it exists
    - Update any invalid unit_id references to use a valid unit from product_units
    - Re-add the foreign key constraint with proper validation

  2. Notes
    - Ensures data integrity by fixing invalid references
    - Maintains proper relationships between tables
    - Prevents orphaned records
*/

-- First, drop the existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'products_unit_id_fkey'
    AND table_name = 'products'
  ) THEN
    ALTER TABLE products
    DROP CONSTRAINT products_unit_id_fkey;
  END IF;
END $$;

-- Update any products with invalid unit_id to use a valid unit
DO $$ 
DECLARE
  valid_unit_id uuid;
BEGIN
  -- Get a valid unit_id from product_units
  SELECT id INTO valid_unit_id
  FROM product_units
  LIMIT 1;

  IF valid_unit_id IS NOT NULL THEN
    -- Update products with invalid unit_id
    UPDATE products p
    SET unit_id = valid_unit_id
    WHERE unit_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM product_units pu 
      WHERE pu.id = p.unit_id
    );
  END IF;

  -- Now add the foreign key constraint back
  ALTER TABLE products
  ADD CONSTRAINT products_unit_id_fkey
  FOREIGN KEY (unit_id)
  REFERENCES product_units(id);
END $$;