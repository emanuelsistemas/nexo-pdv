/*
  # Criar tabela de revendedores (resellers) se não existir

  1. Alterações
    - Verifica se a tabela já existe antes de criar
    - Adiciona índices e constraints apenas se necessário
    - Configura RLS e políticas de segurança
    - Cria trigger para atualização automática do campo updated_at

  2. Segurança
    - Habilita RLS na tabela resellers
    - Adiciona política para usuários autenticados
*/

-- Verificar se a tabela resellers já existe antes de criar
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'resellers') THEN
    -- Criar tabela de revendedores
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
      opening_hours JSONB DEFAULT '[{"day": "Segunda-feira", "open": "09:00", "close": "18:00", "active": true}, {"day": "Terça-feira", "open": "09:00", "close": "18:00", "active": true}, {"day": "Quarta-feira", "open": "09:00", "close": "18:00", "active": true}, {"day": "Quinta-feira", "open": "09:00", "close": "18:00", "active": true}, {"day": "Sexta-feira", "open": "09:00", "close": "18:00", "active": true}, {"day": "Sábado", "open": "09:00", "close": "13:00", "active": false}, {"day": "Domingo", "open": "00:00", "close": "00:00", "active": false}]'::jsonb,
      tech_support JSONB DEFAULT '[]'::jsonb,
      sales_contacts JSONB DEFAULT '[]'::jsonb,
      admin_contacts JSONB DEFAULT '[]'::jsonb,
      additional_info TEXT
    );
  END IF;
END $$;

-- Criar índices apenas se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_resellers_code') THEN
    CREATE INDEX idx_resellers_code ON resellers(code);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'resellers_code_key') THEN
    CREATE UNIQUE INDEX resellers_code_key ON resellers(code);
  END IF;
END $$;

-- Habilitar RLS se a tabela existir
DO $$
BEGIN
  EXECUTE 'ALTER TABLE resellers ENABLE ROW LEVEL SECURITY';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela resellers não existe, pulando habilitação de RLS';
END $$;

-- Criar política apenas se não existir
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
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela resellers não existe, pulando criação de política';
END $$;

-- Criar função e trigger para atualizar o campo updated_at
DO $$
BEGIN
  -- Verifica se a função já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_reseller_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION update_reseller_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;

  -- Verifica se o trigger já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_reseller_updated_at'
  ) THEN
    CREATE TRIGGER update_reseller_updated_at
      BEFORE UPDATE ON resellers
      FOR EACH ROW
      EXECUTE FUNCTION update_reseller_updated_at();
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela resellers não existe, pulando criação de trigger';
END $$;