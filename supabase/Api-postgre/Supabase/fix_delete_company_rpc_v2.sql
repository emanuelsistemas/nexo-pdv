-- Correção da função de deleção de empresas baseada na estrutura real das tabelas
CREATE OR REPLACE FUNCTION delete_company_and_related_data(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_ids uuid[];
BEGIN
    -- Obter IDs de usuários relacionados
    SELECT ARRAY_AGG(id) INTO user_ids
    FROM profiles
    WHERE company_id = target_company_id;
    
    -- 1. Dados PDV
    DELETE FROM pdv_cashier_movements 
    WHERE cashier_id IN (
        SELECT id FROM pdv_cashiers 
        WHERE company_id = target_company_id
    );
    
    DELETE FROM pdv_cashiers 
    WHERE company_id = target_company_id;
    
    DELETE FROM pdv_configurations 
    WHERE company_id = target_company_id;
    
    -- 2. Dados de Produtos
    DELETE FROM product_stock_movements 
    WHERE company_id = target_company_id;
    
    DELETE FROM products 
    WHERE company_id = target_company_id;
    
    DELETE FROM product_groups 
    WHERE company_id = target_company_id;
    
    DELETE FROM product_units 
    WHERE company_id = target_company_id;
    
    DELETE FROM products_configurations 
    WHERE company_id = target_company_id;
    
    -- 3. Atualizar perfis
    UPDATE profiles 
    SET company_id = NULL,
        status_cad_empresa = 'N'
    WHERE company_id = target_company_id;
    
    -- 4. Deletar a empresa
    DELETE FROM companies 
    WHERE id = target_company_id;
    
    -- 5. Deletar usuários sem perfis
    IF array_length(user_ids, 1) > 0 THEN
        DELETE FROM auth.users 
        WHERE id = ANY(user_ids)
        AND id NOT IN (SELECT id FROM profiles WHERE id IS NOT NULL);
    END IF;
END;
$$;
