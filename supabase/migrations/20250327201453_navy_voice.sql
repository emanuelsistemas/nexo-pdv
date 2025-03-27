/*
  # Create product units table if not exists

  1. Changes
    - Safely create product_units table if it doesn't exist
    - Add indexes and constraints only if they don't exist
    - Add trigger for updated_at column

  2. Security
    - Maintain data integrity with proper constraints
    - Ensure unique codes per company
    - Add proper indexing for performance
*/

DO $$ 
BEGIN
  -- Create product_units table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'product_units'
  ) THEN
    CREATE TABLE product_units (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id),
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add unique constraint for code per company
    ALTER TABLE product_units
    ADD CONSTRAINT product_units_code_company_unique 
    UNIQUE (company_id, code);
  END IF;

  -- Create index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'product_units'
    AND indexname = 'product_units_company_id_idx'
  ) THEN
    CREATE INDEX product_units_company_id_idx 
    ON product_units(company_id);
  END IF;

  -- Create trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_product_units_updated_at'
  ) THEN
    CREATE TRIGGER update_product_units_updated_at
      BEFORE UPDATE ON product_units
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;