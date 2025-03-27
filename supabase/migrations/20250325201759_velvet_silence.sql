/*
  # Fix Company RLS Policies

  1. Changes
    - Drop all existing company policies
    - Create new, properly scoped policies for companies table
    - Ensure users can only have one company
    - Allow users to view and update their own company

  2. Security
    - Users can only insert if they don't have a company
    - Users can only view and update their own company
    - Maintains data isolation between users
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
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.company_id IS NOT NULL
    )
  );

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