-- Função dinâmica para deleção de empresas que detecta automaticamente tabelas relacionadas
CREATE OR REPLACE FUNCTION delete_company_and_related_data(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_ids uuid[];
    ref_record record;
    delete_query text;
    table_name text;
    company_column text;
    ref_tables text[] := '{}';
    cleanup_tables text[] := '{}';
    skip_tables text[] := '{"companies"}'; -- Tabelas para pular (a própria companies)
    error_message text;
    delete_success boolean := true;
BEGIN
    -- Log início do processo
    RAISE NOTICE 'Iniciando exclusão da empresa ID: %', target_company_id;
    
    -- Obter IDs de usuários relacionados para limpar depois
    SELECT ARRAY_AGG(id) INTO user_ids
    FROM profiles
    WHERE company_id = target_company_id;
    
    -- Detectar automaticamente todas as tabelas que fazem referência à tabela companies
    FOR ref_record IN (
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            kcu.column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu 
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE 
            tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'companies'
            AND tc.table_schema = 'public'
        ORDER BY tc.table_schema, tc.table_name
    ) LOOP
        -- Ignorar tabelas da lista de exclusão
        IF NOT (ref_record.table_name = ANY(skip_tables)) THEN
            RAISE NOTICE 'Tabela encontrada que referencia companies: %.% (coluna: %)', 
                ref_record.table_schema, ref_record.table_name, ref_record.column_name;
            
            -- Verificar se a tabela tem outras FKs para tratar primeiro
            -- Adicionar à lista apropriada
            ref_tables := array_append(ref_tables, ref_record.table_name);
        END IF;
    END LOOP;
    
    -- Determinar ordem de exclusão (lidar com dependências aninhadas)
    -- Primeiro, deletar tabelas que referenciam outras tabelas que também referenciam companies
    FOR table_name IN 
        SELECT DISTINCT tc.table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = ANY(ref_tables)
        AND ccu.table_name = ANY(ref_tables)
        AND ccu.table_name != tc.table_name
        ORDER BY tc.table_name
    LOOP
        RAISE NOTICE 'Detectada tabela com referências aninhadas: %', table_name;
        -- Verificar se ainda não foi adicionada
        IF NOT (table_name = ANY(cleanup_tables)) THEN
            cleanup_tables := array_append(cleanup_tables, table_name);
        END IF;
    END LOOP;
    
    -- Adicionar tabelas restantes que não foram tratadas
    FOREACH table_name IN ARRAY ref_tables
    LOOP
        IF NOT (table_name = ANY(cleanup_tables)) THEN
            cleanup_tables := array_append(cleanup_tables, table_name);
        END IF;
    END LOOP;
    
    -- Processar tabelas dependentes na ordem determinada
    RAISE NOTICE 'Ordem de deleção: %', cleanup_tables;
    
    -- Deletar registros em cada tabela relacionada
    FOREACH table_name IN ARRAY cleanup_tables
    LOOP
        BEGIN
            -- Encontrar a coluna que referencia companies
            SELECT kcu.column_name INTO company_column
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu 
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE 
                tc.constraint_type = 'FOREIGN KEY' 
                AND ccu.table_name = 'companies'
                AND tc.table_schema = 'public'
                AND tc.table_name = table_name
            LIMIT 1;
            
            IF company_column IS NOT NULL THEN
                -- Construir e executar a consulta de deleção
                delete_query := format('DELETE FROM %I WHERE %I = %L', 
                                      table_name, company_column, target_company_id);
                
                RAISE NOTICE 'Executando: %', delete_query;
                EXECUTE delete_query;
                RAISE NOTICE 'Registros excluídos da tabela %', table_name;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Registrar erro, mas continuar tentando as outras tabelas
            error_message := format('Erro ao excluir da tabela %s: %s', table_name, SQLERRM);
            RAISE WARNING '%', error_message;
            delete_success := false;
        END;
    END LOOP;
    
    -- Caso especial para a tabela profiles (atualizar em vez de excluir)
    BEGIN
        UPDATE profiles 
        SET company_id = NULL,
            status_cad_empresa = 'N'
        WHERE company_id = target_company_id;
        
        RAISE NOTICE 'Perfis de usuários atualizados (company_id removido)';
    EXCEPTION WHEN OTHERS THEN
        error_message := format('Erro ao atualizar perfis: %s', SQLERRM);
        RAISE WARNING '%', error_message;
        delete_success := false;
    END;
    
    -- Excluir a empresa
    BEGIN
        DELETE FROM companies WHERE id = target_company_id;
        RAISE NOTICE 'Empresa excluída com sucesso';
    EXCEPTION WHEN OTHERS THEN
        error_message := format('Erro ao excluir a empresa: %s', SQLERRM);
        RAISE WARNING '%', error_message;
        delete_success := false;
    END;
    
    -- Deletar usuários órfãos (sem perfis)
    IF array_length(user_ids, 1) > 0 THEN
        BEGIN
            DELETE FROM auth.users 
            WHERE id = ANY(user_ids)
            AND id NOT IN (SELECT id FROM profiles WHERE id IS NOT NULL);
            
            RAISE NOTICE 'Usuários órfãos removidos';
        EXCEPTION WHEN OTHERS THEN
            error_message := format('Erro ao excluir usuários órfãos: %s', SQLERRM);
            RAISE WARNING '%', error_message;
            delete_success := false;
        END;
    END IF;
    
    -- Retornar resultado
    IF delete_success THEN
        RAISE NOTICE 'Processo de exclusão concluído com sucesso';
    ELSE
        RAISE WARNING 'Processo de exclusão concluído com avisos';
    END IF;
END;
$$;
