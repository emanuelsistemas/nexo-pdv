-- Script para verificar a função de deleção de empresa e adicionar logs detalhados
DO $$
DECLARE
    func_text text;
    func_security text;
    is_definer boolean;
    company_count integer;
    company_name text;
    company_id uuid := '7979a667-c775-4199-8dce-063d5932aa45'; -- ID da VALESIS INFORMATICA que encontramos
BEGIN
    -- Verificar a função
    SELECT 
        pg_get_functiondef(oid), 
        CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END,
        prosecdef
    INTO func_text, func_security, is_definer
    FROM pg_proc 
    WHERE proname = 'delete_company_and_related_data';
    
    -- Verificar se a empresa existe
    SELECT COUNT(*), MAX(trade_name) INTO company_count, company_name
    FROM companies 
    WHERE id = company_id;
    
    -- Mostrar resultados
    RAISE NOTICE 'Função delete_company_and_related_data:';
    RAISE NOTICE 'Segurança: %', func_security;
    RAISE NOTICE 'É SECURITY DEFINER: %', is_definer;
    
    RAISE NOTICE 'Empresa % existe: % (%)', company_id, company_count > 0, company_name;
    
    -- Verificar se a função está sendo executada no contexto correto
    RAISE NOTICE 'Usuário atual: %', current_user;
    RAISE NOTICE 'Sessão atual: %', session_user;
    RAISE NOTICE 'Esquema atual: %', current_schema;
END $$;
