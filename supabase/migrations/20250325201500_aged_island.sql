/*
  # Fix Company RLS Policies

  1. Changes
    - Drop and recreate the insert policy with proper checks
    - Ensure users can only insert one company
    - Ensure users can only insert if they don't already have a company

  2. Security
    - Users can only insert if they don't already have a company
    - Maintains existing select and update policies
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert their own company" ON companies;

-- Create new insert policy with proper checks
CREATE POLICY "Users can insert their own company"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.company_id IS NOT NULL
    )
  );