/*
  # Add company status management

  1. Changes
    - Add status column to companies table
    - Update existing status check constraint
    - Add default status as 'active'

  2. Notes
    - Status values: 'active', 'defaulter', 'blocked', 'cancelled'
    - Default value is 'active'
*/

-- First drop existing status check constraint if it exists
ALTER TABLE companies 
DROP CONSTRAINT IF EXISTS companies_status_check;

-- Update status column with new values
ALTER TABLE companies 
ALTER COLUMN status SET DEFAULT 'active',
ADD CONSTRAINT companies_status_check 
CHECK (status IN ('active', 'defaulter', 'blocked', 'cancelled'));

-- Update any NULL status values to 'active'
UPDATE companies 
SET status = 'active' 
WHERE status IS NULL;

-- Make status column NOT NULL
ALTER TABLE companies 
ALTER COLUMN status SET NOT NULL;