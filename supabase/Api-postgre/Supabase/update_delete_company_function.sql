-- Atualização da função de deleção de empresas para lidar com novas tabelas
CREATE OR REPLACE FUNCTION delete_company_and_related_data(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_ids uuid[];
    tables_cursor CURSOR FOR
        SELECT tc.table_schema, tc.table_name, kcu.column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu 
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'companies'
        AND tc.table_schema = 'public'
        AND tc.table_name NOT IN ('profiles', 'companies');
    
    table_record RECORD;
    sql_command text;
    delete_count integer;
BEGIN
    -- Log de início do processo
    RAISE NOTICE 'Iniciando processo de deleção da empresa %', target_company_id;
    
    -- Get user IDs
    SELECT ARRAY_AGG(id) INTO user_ids
    FROM profiles
    WHERE profiles.company_id = target_company_id;

    -- 1. Vendas e Orçamentos (dados que dependem de outras tabelas primeiro)
    
    -- 1.1 Itens de venda
    DELETE FROM sales_items 
    WHERE sales_id IN (SELECT id FROM sales WHERE company_id = target_company_id);
    
    -- 1.2 Pagamentos de vendas
    DELETE FROM sales_payments 
    WHERE sales_id IN (SELECT id FROM sales WHERE company_id = target_company_id);
    
    -- 1.3 Vendas
    DELETE FROM sales WHERE company_id = target_company_id;
    
    -- 1.4 Itens de orçamento
    DELETE FROM budget_items 
    WHERE budget_id IN (SELECT id FROM budgets WHERE company_id = target_company_id);
    
    -- 1.5 Orçamentos
    DELETE FROM budgets WHERE company_id = target_company_id;
    
    -- 2. Clientes
    DELETE FROM customers WHERE company_id = target_company_id;
    
    -- 3. PDV
    
    -- 3.1 Movimentos de caixa
    DELETE FROM pdv_cashier_movements 
    WHERE pdv_cashier_id IN (SELECT id FROM pdv_cashiers WHERE company_id = target_company_id);
    
    -- 3.2 Caixas
    DELETE FROM pdv_cashiers WHERE company_id = target_company_id;
    
    -- 3.3 Configurações PDV
    DELETE FROM pdv_configurations WHERE company_id = target_company_id;

    -- 4. Produtos e Estoque
    
    -- 4.1 Imagens de produtos
    DELETE FROM product_images
    WHERE product_id IN (SELECT id FROM products WHERE company_id = target_company_id);
    
    -- 4.2 Movimentos de estoque
    DELETE FROM product_stock_movements WHERE company_id = target_company_id;
    
    -- 4.3 Produtos
    DELETE FROM products WHERE company_id = target_company_id;
    
    -- 4.4 Grupos de produtos
    DELETE FROM product_groups WHERE company_id = target_company_id;
    
    -- 4.5 Unidades de produtos
    DELETE FROM product_units WHERE company_id = target_company_id;
    
    -- 4.6 Configurações de produtos
    DELETE FROM products_configurations WHERE company_id = target_company_id;
    
    -- 5. Configurações do sistema
    DELETE FROM system_configurations WHERE company_id = target_company_id;
    
    -- 6. Tabelas adicionais detectadas dinamicamente
    RAISE NOTICE 'Verificando outras tabelas que referenciam a empresa...';
    
    -- 6.1 Verificar notificações
    BEGIN
        DELETE FROM notifications WHERE company_id = target_company_id;
        RAISE NOTICE 'Notificações removidas';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'Tabela notifications não existe, ignorando';
    END;
    
    -- 6.2 Verificar logs de atividade
    BEGIN
        DELETE FROM activity_logs WHERE company_id = target_company_id;
        RAISE NOTICE 'Logs de atividade removidos';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'Tabela activity_logs não existe, ignorando';
    END;
    
    -- 6.3 Buscar dinamicamente outras tabelas que referenciam companies
    RAISE NOTICE 'Verificando tabelas restantes...';
    
    OPEN tables_cursor;
    LOOP
        FETCH tables_cursor INTO table_record;
        EXIT WHEN NOT FOUND;
        
        -- Pular tabelas já tratadas explicitamente
        CONTINUE WHEN table_record.table_name IN (
            'sales_items', 'sales_payments', 'sales', 'budget_items', 
            'budgets', 'customers', 'pdv_cashier_movements', 'pdv_cashiers',
            'pdv_configurations', 'product_images', 'product_stock_movements',
            'products', 'product_groups', 'product_units', 'products_configurations',
            'system_configurations', 'notifications', 'activity_logs'
        );
        
        RAISE NOTICE 'Removendo dados de: %.%', table_record.table_schema, table_record.table_name;
        
        BEGIN
            sql_command := format('DELETE FROM %I.%I WHERE %I = $1', 
                          table_record.table_schema, 
                          table_record.table_name,
                          table_record.column_name);
            
            EXECUTE sql_command USING target_company_id;
            GET DIAGNOSTICS delete_count = ROW_COUNT;
            
            RAISE NOTICE 'Removidos % registros de %.%', 
                  delete_count, table_record.table_schema, table_record.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao remover %.%: %', 
                  table_record.table_schema, table_record.table_name, SQLERRM;
        END;
    END LOOP;
    
    CLOSE tables_cursor;
    
    -- 7. Atualizar perfis
    UPDATE profiles 
    SET company_id = NULL,
        status_cad_empresa = 'N'
    WHERE company_id = target_company_id;
    
    -- 8. Deletar a empresa
    DELETE FROM companies WHERE id = target_company_id;
    
    -- 9. Deletar usuários sem perfis
    IF array_length(user_ids, 1) > 0 THEN
        DELETE FROM auth.users 
        WHERE id = ANY(user_ids)
        AND id NOT IN (SELECT id FROM profiles WHERE id IS NOT NULL);
    END IF;
    
    RAISE NOTICE 'Processo de exclusão concluído com sucesso!';
END;
$$;
