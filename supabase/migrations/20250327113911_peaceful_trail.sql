/*
  # Create products table with company isolation

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `code` (text, unique per company)
      - `barcode` (text)
      - `name` (text)
      - `unit` (text)
      - `group` (text)
      - `cost_price` (numeric)
      - `profit_margin` (numeric)
      - `selling_price` (numeric)
      - `stock` (numeric)
      - `cst` (text)
      - `pis` (text)
      - `cofins` (text)
      - `ncm` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on products table
    - Add policies for company-based isolation
    - Ensure users can only access products from their company

  3. Constraints
    - Product code must be unique within each company
    - Foreign key to companies table
    - Check constraints for valid status values
*/

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  code TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  "group" TEXT NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL,
  profit_margin NUMERIC(5,2) NOT NULL,
  selling_price NUMERIC(10,2) NOT NULL,
  stock NUMERIC(10,2) DEFAULT 0,
  cst TEXT NOT NULL,
  pis TEXT NOT NULL,
  cofins TEXT NOT NULL,
  ncm TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT products_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT products_code_company_unique UNIQUE (company_id, code)
);

-- Create index for better query performance
CREATE INDEX products_company_id_idx ON products(company_id);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their company's products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can create products for their company"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's products"
  ON products
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create stock movement history table
CREATE TABLE product_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  quantity NUMERIC(10,2) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS on stock movements
ALTER TABLE product_stock_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stock movements
CREATE POLICY "Users can view their company's stock movements"
  ON product_stock_movements
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can create stock movements for their company"
  ON product_stock_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX product_stock_movements_product_id_idx ON product_stock_movements(product_id);
CREATE INDEX product_stock_movements_company_id_idx ON product_stock_movements(company_id);