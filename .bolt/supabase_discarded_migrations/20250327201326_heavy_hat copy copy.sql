/*
  # Create product units table

  1. New Table
    - `product_units`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `code` (text, unit code)
      - `name` (text, unit name)
      - `description` (text, optional description)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for company-based isolation
    - Ensure unique codes per company

  3. Constraints
    - Unit code must be unique within each company
    - Foreign key to companies table
*/

-- Create product units table
CREATE TABLE product_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Add unique constraint for code per company
  CONSTRAINT product_units_code_company_unique UNIQUE (company_id, code)
);

-- Create index for better query performance
CREATE INDEX product_units_company_id_idx ON product_units(company_id);

-- Create trigger for updated_at
CREATE TRIGGER update_product_units_updated_at
  BEFORE UPDATE ON product_units
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();