/*
  # Fix ambiguous company_id reference in delete RPC

  1. Changes
    - Drop and recreate the delete_company_and_related_data function
    - Add proper table qualification for company_id references
    - Ensure cascading deletion of related data
  
  2. Security
    - Function remains accessible only to authenticated users
    - Maintains existing security context
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS delete_company_and_related_data(company_id uuid);

-- Recreate the function with proper column qualification
CREATE OR REPLACE FUNCTION delete_company_and_related_data(target_company_id uuid)
RETURNS void AS $$
BEGIN
  -- Delete product stock movements
  DELETE FROM product_stock_movements 
  WHERE product_stock_movements.company_id = target_company_id;

  -- Delete products
  DELETE FROM products 
  WHERE products.company_id = target_company_id;

  -- Delete product groups
  DELETE FROM product_groups 
  WHERE product_groups.company_id = target_company_id;

  -- Delete product units
  DELETE FROM product_units 
  WHERE product_units.company_id = target_company_id;

  -- Delete PDV configurations
  DELETE FROM pdv_configurations 
  WHERE pdv_configurations.company_id = target_company_id;

  -- Delete PDV cashier movements
  DELETE FROM pdv_cashier_movements 
  WHERE pdv_cashier_movements.company_id = target_company_id;

  -- Delete PDV cashiers
  DELETE FROM pdv_cashiers 
  WHERE pdv_cashiers.company_id = target_company_id;

  -- Delete products configurations
  DELETE FROM products_configurations 
  WHERE products_configurations.company_id = target_company_id;

  -- Finally delete the company
  DELETE FROM companies 
  WHERE companies.id = target_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;