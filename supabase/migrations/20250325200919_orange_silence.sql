/*
  # Create companies table and update profiles

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `segment` (text, company segment/industry)
      - `document_type` (text, either 'CNPJ' or 'CPF')
      - `document_number` (text, the actual document number)
      - `legal_name` (text, company's legal/registered name)
      - `trade_name` (text, company's trade/brand name)
      - `email` (text)
      - `whatsapp` (text)
      - `state_registration` (text, I.E. - Inscrição Estadual)
      - `tax_regime` (text, either 'Simples Nacional' or 'Normal')
      - `created_at` (timestamp with timezone)
      - `updated_at` (timestamp with timezone)

  2. Changes to Existing Tables
    - Add `company_id` to `profiles` table referencing `companies.id`

  3. Security
    - Enable RLS on companies table
    - Add policies for authenticated users to manage their company data
*/

-- Create companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('CNPJ', 'CPF')),
  document_number TEXT NOT NULL UNIQUE,
  legal_name TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  state_registration TEXT,
  tax_regime TEXT NOT NULL CHECK (tax_regime IN ('Simples Nacional', 'Normal')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add company_id to profiles
ALTER TABLE profiles 
ADD COLUMN company_id UUID REFERENCES companies(id);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create policies
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
  )
  WITH CHECK (
    id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();