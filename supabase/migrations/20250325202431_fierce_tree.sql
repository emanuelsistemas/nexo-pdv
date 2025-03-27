/*
  # Fix Company RLS Policies

  1. Changes
    - Drop existing restrictive policies
    - Create new policies that properly handle company management
    - Allow users to insert a company and link it to their profile
    - Maintain security by ensuring users can only access their own company data

  2. Security
    - Users can only view and update their linked company
    - Users can insert a new company
    - Users can't modify other users' companies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can insert their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;

-- Create new policies
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