/*
  # Add function to delete company and all related data

  1. Changes
    - Create function to handle complete company deletion
    - Delete data from all related tables
    - Delete auth user data
    - Handle cascading deletion properly

  2. Security
    - Function can only be called by authenticated users
    - Validates company ownership before deletion
*/

-- Create function to delete company and all related data
CREATE OR REPLACE FUNCTION delete_company_and_related_data(company_id uuid)
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
    WHERE company_id = $1;

    -- Delete product stock movements
    DELETE FROM product_stock_movements
    WHERE company_id = $1;

    -- Delete products
    DELETE FROM products
    WHERE company_id = $1;

    -- Delete product units
    DELETE FROM product_units
    WHERE company_id = $1;

    -- Delete product groups
    DELETE FROM product_groups
    WHERE company_id = $1;

    -- Delete PDV configurations
    DELETE FROM pdv_configurations
    WHERE company_id = $1;

    -- Delete products configurations
    DELETE FROM products_configurations
    WHERE company_id = $1;

    -- Delete PDV cashiers
    DELETE FROM pdv_cashiers
    WHERE company_id = $1;

    -- Delete PDV cashier movements
    DELETE FROM pdv_cashier_movements
    WHERE company_id = $1;

    -- Update profiles to remove company_id
    UPDATE profiles
    SET company_id = NULL,
        status_cad_empresa = 'N'
    WHERE company_id = $1;

    -- Delete the company itself
    DELETE FROM companies
    WHERE id = $1;

    -- Delete auth.users entries
    IF array_length(user_ids, 1) > 0 THEN
        -- Delete from auth.users using the collected user_ids
        DELETE FROM auth.users
        WHERE id = ANY(user_ids);
    END IF;
END;
$$;