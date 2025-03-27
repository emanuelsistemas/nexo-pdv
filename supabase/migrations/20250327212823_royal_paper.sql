/*
  # Create product groups table if not exists

  1. Changes
    - Check if table exists before creating
    - Add indexes and constraints safely
    - Add trigger for updated_at

  2. Security
    - Ensure table has proper constraints
    - Add indexes for performance
*/

DO $$ 
BEGIN
  -- Create product_groups table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'product_groups'
  ) THEN
    CREATE TABLE product_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add unique constraint for name per company
    ALTER TABLE product_groups
    ADD CONSTRAINT product_groups_name_company_unique 
    UNIQUE (company_id, name);
  END IF;

  -- Create index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'product_groups'
    AND indexname = 'product_groups_company_id_idx'
  ) THEN
    CREATE INDEX product_groups_company_id_idx 
    ON product_groups(company_id);
  END IF;

  -- Create trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_product_groups_updated_at'
  ) THEN
    CREATE TRIGGER update_product_groups_updated_at
      BEFORE UPDATE ON product_groups
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;