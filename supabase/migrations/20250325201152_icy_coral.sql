/*
  # Update companies table and add company relationship to profiles

  1. Changes
    - Add company_id to profiles table if it doesn't exist
    - Add RLS policies for companies table if they don't exist
    - Add trigger for updated_at if it doesn't exist

  2. Security
    - Enable RLS on companies table
    - Add policies for authenticated users to manage their company data
*/

-- Add company_id to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN company_id UUID REFERENCES companies(id);
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Users can view their own company'
  ) THEN
    CREATE POLICY "Users can view their own company"
      ON companies
      FOR SELECT
      TO authenticated
      USING (
        id IN (
          SELECT company_id 
          FROM profiles 
          WHERE profiles.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Users can insert their own company'
  ) THEN
    CREATE POLICY "Users can insert their own company"
      ON companies
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Users can update their own company'
  ) THEN
    CREATE POLICY "Users can update their own company"
      ON companies
      FOR UPDATE
      TO authenticated
      USING (
        id IN (
          SELECT company_id 
          FROM profiles 
          WHERE profiles.id = auth.uid()
        )
      )
      WITH CHECK (
        id IN (
          SELECT company_id 
          FROM profiles 
          WHERE profiles.id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create trigger for updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_companies_updated_at'
  ) THEN
    CREATE TRIGGER update_companies_updated_at
      BEFORE UPDATE ON companies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;