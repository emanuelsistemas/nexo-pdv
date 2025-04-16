/*
  # Fix company deletion with complete data cleanup

  1. Changes
    - Drop existing function
    - Create new function that properly handles all related data
    - Include auth.users deletion
    - Handle profile updates
    - Ensure proper order of deletion to avoid foreign key conflicts

  2. Security
    - Function remains security definer for proper permissions
    - Maintains data integrity during deletion process
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS delete_company_and_related_data(uuid);

-- Create new function with complete cleanup
CREATE OR REPLACE FUNCTION delete_company_and_related_data(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_ids uuid[];
BEGIN
    -- Get all user IDs associated with this company
    SELECT ARRAY_AGG(id) INTO user_ids
    FROM profiles
    WHERE profiles.company_id = target_company_id;

    -- Delete all related data in correct order to avoid foreign key conflicts
    
    -- 1. Delete PDV related data
    DELETE FROM pdv_cashier_movements 
    WHERE pdv_cashier_movements.company_id = target_company_id;
    
    DELETE FROM pdv_cashiers 
    WHERE pdv_cashiers.company_id = target_company_id;
    
    DELETE FROM pdv_configurations 
    WHERE pdv_configurations.company_id = target_company_id;

    -- 2. Delete product related data
    DELETE FROM product_stock_movements 
    WHERE product_stock_movements.company_id = target_company_id;
    
    DELETE FROM products 
    WHERE products.company_id = target_company_id;
    
    DELETE FROM product_groups 
    WHERE product_groups.company_id = target_company_id;
    
    DELETE FROM product_units 
    WHERE product_units.company_id = target_company_id;
    
    DELETE FROM products_configurations 
    WHERE products_configurations.company_id = target_company_id;

    -- 3. Update profiles to remove company association
    UPDATE profiles 
    SET company_id = NULL,
        status_cad_empresa = 'N'
    WHERE profiles.company_id = target_company_id;

    -- 4. Delete the company
    DELETE FROM companies 
    WHERE companies.id = target_company_id;

    -- 5. Delete auth.users entries if we have any user IDs
    IF array_length(user_ids, 1) > 0 THEN
        DELETE FROM auth.users 
        WHERE auth.users.id = ANY(user_ids);
    END IF;
END;
$$;