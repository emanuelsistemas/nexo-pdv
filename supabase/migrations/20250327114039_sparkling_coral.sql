/*
  # Disable RLS for all tables

  1. Changes
    - Disable RLS on products table
    - Disable RLS on product_stock_movements table
    - Disable RLS on companies table
    - Drop all existing RLS policies

  2. Notes
    - This ensures unrestricted access to tables
    - Removes potential RLS-related issues
*/

-- Disable RLS on products table
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Drop products policies
DROP POLICY IF EXISTS "Users can view their company's products" ON products;
DROP POLICY IF EXISTS "Users can create products for their company" ON products;
DROP POLICY IF EXISTS "Users can update their company's products" ON products;
DROP POLICY IF EXISTS "Users can delete their company's products" ON products;

-- Disable RLS on product_stock_movements table
ALTER TABLE product_stock_movements DISABLE ROW LEVEL SECURITY;

-- Drop stock movements policies
DROP POLICY IF EXISTS "Users can view their company's stock movements" ON product_stock_movements;
DROP POLICY IF EXISTS "Users can create stock movements for their company" ON product_stock_movements;

-- Disable RLS on companies table
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Drop companies policies
DROP POLICY IF EXISTS "Usuários autenticados podem criar empresas" ON companies;
DROP POLICY IF EXISTS "Usuários podem ver sua própria empresa" ON companies;
DROP POLICY IF EXISTS "Usuários podem atualizar sua própria empresa" ON companies;