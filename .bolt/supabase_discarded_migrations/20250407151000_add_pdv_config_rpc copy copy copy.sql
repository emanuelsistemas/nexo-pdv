/*
  # Criação de função RPC para criar a tabela pdv_configurations
  
  1. Descrição
     - Esta função permite a criação da tabela pdv_configurations via RPC
     - Será chamada pelo frontend para garantir que a tabela existe antes de usá-la
     - Evita problemas de permissões ao executar SQL diretamente

  2. Campos na tabela criada
     - id: identificador único UUID
     - user_id: referência ao ID do usuário (foreign key para auth.users)
     - company_id: referência ao ID da empresa (foreign key para companies)
     - group_items: agrupar itens iguais no carrinho
     - control_cashier: controlar abertura e fechamento de caixa
     - require_seller: exigir vendedor nas operações
     - full_screen: modo tela cheia 
*/

-- Função para criar a tabela pdv_configurations se não existir
CREATE OR REPLACE FUNCTION create_pdv_config_table() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER -- Executa com permissões do criador da função
AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- Verificar se a tabela já existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'pdv_configurations'
  ) INTO table_exists;

  -- Se a tabela não existir, criá-la
  IF NOT table_exists THEN
    -- Criar tabela pdv_configurations
    CREATE TABLE pdv_configurations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      group_items BOOLEAN NOT NULL DEFAULT FALSE,
      control_cashier BOOLEAN NOT NULL DEFAULT FALSE,
      require_seller BOOLEAN NOT NULL DEFAULT FALSE,
      full_screen BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT unique_user_company_config UNIQUE (user_id, company_id)
    );

    -- Adicionar políticas de segurança RLS
    ALTER TABLE pdv_configurations ENABLE ROW LEVEL SECURITY;

    -- Criar policy para leitura
    CREATE POLICY "Usuários podem ver suas próprias configurações" 
    ON pdv_configurations FOR SELECT
    USING (auth.uid() = user_id);

    -- Criar policy para inserção
    CREATE POLICY "Usuários podem criar suas próprias configurações" 
    ON pdv_configurations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    -- Criar policy para atualização
    CREATE POLICY "Usuários podem atualizar suas próprias configurações" 
    ON pdv_configurations FOR UPDATE
    USING (auth.uid() = user_id);

    -- Criar trigger para atualizar o campo updated_at automaticamente
    CREATE OR REPLACE FUNCTION update_modified_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_pdv_configurations_modified
    BEFORE UPDATE ON pdv_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
    
    RETURN TRUE;
  ELSE
    -- Tabela já existe
    RETURN FALSE;
  END IF;
END;
$$;

-- Permitir que a função seja chamada via RPC
GRANT EXECUTE ON FUNCTION create_pdv_config_table() TO authenticated;
GRANT EXECUTE ON FUNCTION create_pdv_config_table() TO service_role;
