-- Script completo para configuração de revendedores no Supabase
-- Este arquivo contém todas as instruções necessárias para criar e configurar
-- a tabela de revendedores e suas funcionalidades relacionadas

-- 1. Criação da tabela de revendedores
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'resellers') THEN
    CREATE TABLE resellers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      document_number TEXT NOT NULL,
      legal_name TEXT NOT NULL,
      trade_name TEXT NOT NULL,
      address_cep TEXT,
      address_street TEXT,
      address_number TEXT,
      address_complement TEXT,
      address_district TEXT,
      address_city TEXT,
      address_state TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      code TEXT,
      website TEXT,
      opening_hours JSONB DEFAULT '{
        "monday": {"active": true, "open": "08:00", "close": "18:00"},
        "tuesday": {"active": true, "open": "08:00", "close": "18:00"},
        "wednesday": {"active": true, "open": "08:00", "close": "18:00"},
        "thursday": {"active": true, "open": "08:00", "close": "18:00"},
        "friday": {"active": true, "open": "08:00", "close": "18:00"},
        "saturday": {"active": false, "open": "08:00", "close": "13:00"},
        "sunday": {"active": false, "open": "00:00", "close": "00:00"}
      }'::jsonb,
      tech_support JSONB DEFAULT '[]'::jsonb,
      sales_contacts JSONB DEFAULT '[]'::jsonb,
      admin_contacts JSONB DEFAULT '[]'::jsonb,
      additional_info TEXT
    );
    
    RAISE NOTICE 'Tabela resellers criada com sucesso';
  ELSE
    RAISE NOTICE 'Tabela resellers já existe, pulando criação';
  END IF;
END $$;

-- 2. Criação de índices
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_resellers_code') THEN
    CREATE INDEX idx_resellers_code ON resellers(code);
    RAISE NOTICE 'Índice idx_resellers_code criado com sucesso';
  ELSE
    RAISE NOTICE 'Índice idx_resellers_code já existe, pulando criação';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'resellers_code_key') THEN
    CREATE UNIQUE INDEX resellers_code_key ON resellers(code);
    RAISE NOTICE 'Índice resellers_code_key criado com sucesso';
  ELSE
    RAISE NOTICE 'Índice resellers_code_key já existe, pulando criação';
  END IF;
END $$;

-- 3. Habilitação de RLS
DO $$
BEGIN
  EXECUTE 'ALTER TABLE resellers ENABLE ROW LEVEL SECURITY';
  RAISE NOTICE 'RLS habilitado para a tabela resellers';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela resellers não existe, pulando habilitação de RLS';
END $$;

-- 4. Criação de política de segurança
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resellers' AND policyname = 'auth_users_all'
  ) THEN
    CREATE POLICY "auth_users_all"
      ON resellers
      FOR ALL
      TO authenticated
      USING (true);
    RAISE NOTICE 'Política auth_users_all criada com sucesso';
  ELSE
    RAISE NOTICE 'Política auth_users_all já existe, pulando criação';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela resellers não existe, pulando criação de política';
END $$;

-- 5. Criação de função para atualização do campo updated_at
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION update_reseller_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  
  RAISE NOTICE 'Função update_reseller_updated_at criada/atualizada com sucesso';
END $$;

-- 6. Criação de trigger para atualização automática do campo updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reseller_updated_at') THEN
    DROP TRIGGER IF EXISTS update_reseller_updated_at ON resellers;
  END IF;

  CREATE TRIGGER update_reseller_updated_at
    BEFORE UPDATE ON resellers
    FOR EACH ROW
    EXECUTE FUNCTION update_reseller_updated_at();
  
  RAISE NOTICE 'Trigger update_reseller_updated_at criado com sucesso';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela resellers não existe, pulando criação de trigger';
END $$;

-- 7. Função para gerar código único de revendedor
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

-- 8. Função RPC para inserir revendedor com código gerado automaticamente
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

-- 9. Inserir revendedor padrão "Sem Revenda" com código 58105
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM resellers WHERE code = '58105') THEN
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
    );
    RAISE NOTICE 'Revendedor padrão "Sem Revenda" criado com sucesso';
  ELSE
    RAISE NOTICE 'Revendedor padrão "Sem Revenda" já existe, pulando criação';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela resellers não existe, pulando inserção do revendedor padrão';
END $$;

-- 10. Adicionar coluna reseller_id à tabela companies se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'reseller_id'
  ) THEN
    ALTER TABLE companies
    ADD COLUMN reseller_id UUID REFERENCES resellers(id);
    
    RAISE NOTICE 'Coluna reseller_id adicionada à tabela companies';
    
    -- Criar índice para melhor performance
    CREATE INDEX idx_companies_reseller_id ON companies(reseller_id);
    RAISE NOTICE 'Índice idx_companies_reseller_id criado com sucesso';
  ELSE
    RAISE NOTICE 'Coluna reseller_id já existe na tabela companies, pulando criação';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela companies não existe, pulando adição de coluna';
END $$;

-- 11. Converter dados existentes de opening_hours para o novo formato
DO $$
DECLARE
    r RECORD;
    new_opening_hours JSONB;
BEGIN
    FOR r IN SELECT id, opening_hours FROM resellers WHERE opening_hours IS NOT NULL
    LOOP
        -- Verificar se opening_hours é um array (formato antigo)
        IF jsonb_typeof(r.opening_hours) = 'array' THEN
            -- Criar novo objeto com o formato correto
            new_opening_hours := jsonb_build_object(
                'monday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->0->>'active')::boolean, true),
                    'open', COALESCE(r.opening_hours->0->>'open', '08:00'),
                    'close', COALESCE(r.opening_hours->0->>'close', '18:00')
                ),
                'tuesday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->1->>'active')::boolean, true),
                    'open', COALESCE(r.opening_hours->1->>'open', '08:00'),
                    'close', COALESCE(r.opening_hours->1->>'close', '18:00')
                ),
                'wednesday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->2->>'active')::boolean, true),
                    'open', COALESCE(r.opening_hours->2->>'open', '08:00'),
                    'close', COALESCE(r.opening_hours->2->>'close', '18:00')
                ),
                'thursday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->3->>'active')::boolean, true),
                    'open', COALESCE(r.opening_hours->3->>'open', '08:00'),
                    'close', COALESCE(r.opening_hours->3->>'close', '18:00')
                ),
                'friday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->4->>'active')::boolean, true),
                    'open', COALESCE(r.opening_hours->4->>'open', '08:00'),
                    'close', COALESCE(r.opening_hours->4->>'close', '18:00')
                ),
                'saturday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->5->>'active')::boolean, false),
                    'open', COALESCE(r.opening_hours->5->>'open', '08:00'),
                    'close', COALESCE(r.opening_hours->5->>'close', '13:00')
                ),
                'sunday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->6->>'active')::boolean, false),
                    'open', COALESCE(r.opening_hours->6->>'open', '00:00'),
                    'close', COALESCE(r.opening_hours->6->>'close', '00:00')
                )
            );
            
            -- Atualizar o registro
            UPDATE resellers
            SET opening_hours = new_opening_hours
            WHERE id = r.id;
            
            RAISE NOTICE 'Formato de opening_hours atualizado para o revendedor %', r.id;
        END IF;
    END LOOP;
END $$;

-- 12. Adicionar colunas user_pai e created_by à tabela companies se não existirem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'user_pai'
  ) THEN
    ALTER TABLE companies
    ADD COLUMN user_pai TEXT;
    
    RAISE NOTICE 'Coluna user_pai adicionada à tabela companies';
  ELSE
    RAISE NOTICE 'Coluna user_pai já existe na tabela companies, pulando criação';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE companies
    ADD COLUMN created_by UUID REFERENCES auth.users(id);
    
    RAISE NOTICE 'Coluna created_by adicionada à tabela companies';
  ELSE
    RAISE NOTICE 'Coluna created_by já existe na tabela companies, pulando criação';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela companies não existe, pulando adição de colunas';
END $$;

-- 13. Criar função para definir o user_pai automaticamente
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION set_user_pai_on_insert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
      user_email TEXT;
  BEGIN
      -- Obter o email do usuário que está criando a empresa
      SELECT email INTO user_email
      FROM auth.users
      WHERE id = auth.uid();
      
      -- Definir o user_pai como o email do usuário
      NEW.user_pai := user_email;
      
      -- Definir o created_by como o ID do usuário
      NEW.created_by := auth.uid();
      
      RETURN NEW;
  END;
  $$;
  
  RAISE NOTICE 'Função set_user_pai_on_insert criada/atualizada com sucesso';
END $$;

-- 14. Criar trigger para executar a função ao inserir uma nova empresa
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_user_pai_trigger') THEN
    DROP TRIGGER IF EXISTS set_user_pai_trigger ON companies;
  END IF;

  CREATE TRIGGER set_user_pai_trigger
    BEFORE INSERT ON companies
    FOR EACH ROW
    EXECUTE FUNCTION set_user_pai_on_insert();
  
  RAISE NOTICE 'Trigger set_user_pai_trigger criado com sucesso';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela companies não existe, pulando criação de trigger';
END $$;

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Configuração de revendedores concluída com sucesso!';
  RAISE NOTICE '================================================';
END $$;