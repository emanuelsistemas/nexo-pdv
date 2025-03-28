/*
  # Fix products and product_units relationship

  1. Changes
    - Add foreign key constraint between products and product_units tables
    - Create index for better performance
    - Ensure unit_id is required

  2. Security
    - Maintain data integrity with proper foreign key constraint
    - Add index for better query performance
*/

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  -- First check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'products_unit_id_fkey'
    AND table_name = 'products'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE products
    ADD CONSTRAINT products_unit_id_fkey
    FOREIGN KEY (unit_id)
    REFERENCES product_units(id);

    -- Create index for better performance if it doesn't exist
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE tablename = 'products'
      AND indexname = 'products_unit_id_idx'
    ) THEN
      CREATE INDEX products_unit_id_idx ON products(unit_id);
    END IF;
  END IF;
END $$;