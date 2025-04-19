/*
  # Criar função para gerar código único de revendedor

  1. Alterações
    - Criar função para gerar código único de 5 dígitos para revendedores
    - Criar função RPC para inserir revendedor com código gerado automaticamente
    - Garantir que o código seja único

  2. Notas
    - O código é gerado como um número de 5 dígitos (10000-99999)
    - A função verifica se o código já existe e gera um novo se necessário
*/

-- Função para gerar código único de revendedor
CREATE OR REPLACE FUNCTION generate_unique_reseller_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Gerar código aleatório de 5 dígitos (entre 10000 e 99999)
        new_code := (floor(random() * 90000) + 10000)::TEXT;
        
        -- Verificar se o código já existe
        SELECT EXISTS(
            SELECT 1 FROM resellers WHERE code = new_code
        ) INTO code_exists;
        
        -- Se o código não existir, retorná-lo
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$;

-- Função RPC para inserir revendedor com código gerado automaticamente
CREATE OR REPLACE FUNCTION insert_reseller_with_code(
    p_trade_name TEXT,
    p_legal_name TEXT,
    p_document_number TEXT,
    p_address_cep TEXT,
    p_address_street TEXT,
    p_address_number TEXT,
    p_address_complement TEXT,
    p_address_district TEXT,
    p_address_city TEXT,
    p_address_state TEXT,
    p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_code TEXT;
BEGIN
    -- Gerar código único
    new_code := generate_unique_reseller_code();
    
    -- Inserir revendedor com o código gerado
    INSERT INTO resellers (
        trade_name,
        legal_name,
        document_number,
        address_cep,
        address_street,
        address_number,
        address_complement,
        address_district,
        address_city,
        address_state,
        status,
        code
    ) VALUES (
        p_trade_name,
        p_legal_name,
        p_document_number,
        p_address_cep,
        p_address_street,
        p_address_number,
        p_address_complement,
        p_address_district,
        p_address_city,
        p_address_state,
        p_status,
        new_code
    );
END;
$$;

-- Inserir revendedor padrão "Sem Revenda" com código 58105
INSERT INTO resellers (
    trade_name,
    legal_name,
    document_number,
    status,
    code
) VALUES (
    'Sem Revenda',
    'Sem Revenda',
    '00.000.000/0000-00',
    'active',
    '58105'
) ON CONFLICT (code) DO NOTHING;