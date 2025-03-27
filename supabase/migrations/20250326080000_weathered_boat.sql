/*
  # Add company registration status to profiles if not exists

  1. Changes
    - Safely add status_cad_empresa column if it doesn't exist
    - Set default value as 'N'
    - Add check constraint for valid values ('N', 'S')

  2. Notes
    - Uses DO block to check column existence
    - Maintains data integrity with check constraint
    - Sets appropriate default value
*/

DO $$ 
BEGIN
  -- Check if the column doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'status_cad_empresa'
  ) THEN
    -- Add the column if it doesn't exist
    ALTER TABLE profiles 
    ADD COLUMN status_cad_empresa CHAR(1) NOT NULL DEFAULT 'N';

    -- Add the check constraint
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_status_cad_empresa_check 
    CHECK (status_cad_empresa IN ('N', 'S'));
  END IF;
END $$;