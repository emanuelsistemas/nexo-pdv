/*
  # Fix products unit_id foreign key constraint

  1. Changes
    - Drop existing foreign key constraint if it exists
    - Update any invalid unit_id references to use a valid system unit
    - Re-add the foreign key constraint

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

-- Get the first system unit (UN) to use as default
DO $$ 
DECLARE
  default_unit_id uuid;
BEGIN
  -- Get the ID of the UN unit from system_units
  SELECT id INTO default_unit_id
  FROM system_units
  WHERE code = 'UN'
  LIMIT 1;

  -- Update any products with invalid unit_id to use the default unit
  UPDATE products p
  SET unit_id = default_unit_id
  WHERE unit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM product_units pu 
    WHERE pu.id = p.unit_id
  );

  -- Now add the foreign key constraint back
  ALTER TABLE products
  ADD CONSTRAINT products_unit_id_fkey
  FOREIGN KEY (unit_id)
  REFERENCES product_units(id);
END $$;