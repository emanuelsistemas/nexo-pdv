-- Primeiro remover a função existente
DROP FUNCTION IF EXISTS delete_company_and_related_data(uuid);

-- Função simples para teste de deleção de empresa
-- Objetivo: Verificar se conseguimos realizar a operação básica de deleção
CREATE OR REPLACE FUNCTION delete_company_and_related_data(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    company_exists boolean;
    affected_rows integer;
BEGIN
    -- Verificar se a empresa existe
    SELECT EXISTS(SELECT 1 FROM companies WHERE id = target_company_id) INTO company_exists;
    
    IF NOT company_exists THEN
        RAISE NOTICE 'Empresa % não existe', target_company_id;
        RETURN;
    END IF;
    
    -- Remover referências em cada tabela, usando operações explícitas
    
    -- 1. pdv_cashier_movements
    DELETE FROM pdv_cashier_movements
    WHERE cashier_id IN (
        SELECT id FROM pdv_cashiers WHERE company_id = target_company_id
    );
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Registros removidos de pdv_cashier_movements: %', affected_rows;
    
    -- 2. pdv_cashiers
    DELETE FROM pdv_cashiers 
    WHERE company_id = target_company_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Registros removidos de pdv_cashiers: %', affected_rows;
    
    -- 3. pdv_configurations
    DELETE FROM pdv_configurations
    WHERE company_id = target_company_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Registros removidos de pdv_configurations: %', affected_rows;
    
    -- 4. product_stock_movements
    DELETE FROM product_stock_movements
    WHERE company_id = target_company_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Registros removidos de product_stock_movements: %', affected_rows;
    
    -- 5. products
    DELETE FROM products
    WHERE company_id = target_company_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Registros removidos de products: %', affected_rows;
    
    -- 6. product_groups
    DELETE FROM product_groups
    WHERE company_id = target_company_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Registros removidos de product_groups: %', affected_rows;
    
    -- 7. product_units
    DELETE FROM product_units
    WHERE company_id = target_company_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Registros removidos de product_units: %', affected_rows;
    
    -- 8. products_configurations
    DELETE FROM products_configurations
    WHERE company_id = target_company_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Registros removidos de products_configurations: %', affected_rows;
    
    -- 9. Atualizar perfis (em vez de excluir)
    UPDATE profiles
    SET company_id = NULL, status_cad_empresa = 'N'
    WHERE company_id = target_company_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Perfis atualizados: %', affected_rows;
    
    -- IMPORTANTE: Finalmente, remover a empresa
    DELETE FROM companies 
    WHERE id = target_company_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- Verificar se a empresa foi removida
    IF affected_rows > 0 THEN
        RAISE NOTICE 'Empresa % removida com sucesso', target_company_id;
    ELSE
        RAISE NOTICE 'Falha ao remover empresa %', target_company_id;
    END IF;
END;
$$;
