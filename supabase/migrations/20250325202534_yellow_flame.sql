/*
  # Fix Company RLS Policies

  1. Changes
    - Drop existing policies
    - Create new policies with proper permissions
    - Ensure users can create and manage their companies

  2. Security
    - Users can create a company
    - Users can only view and update their linked company
    - Users can't access other users' companies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can insert their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;

-- Create new policies with proper permissions
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

CREATE POLICY "Users can insert their own company"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

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
  );

-- Ensure RLS is enabled
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;