/*
  # Criação da tabela de revendedores

  1. Nova Tabela
    - `resellers`
      - `id` (uuid, chave primária)
      - `document_number` (texto, número do documento)
      - `legal_name` (texto, razão social)
      - `trade_name` (texto, nome fantasia)
      - Campos de endereço (cep, rua, número, etc.)
      - `status` (texto, status do revendedor)
      - `code` (texto, código único de 5 dígitos)
      - Campos para contatos e horários de funcionamento

  2. Segurança
    - Habilitar RLS na tabela
    - Adicionar política para usuários autenticados
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
    NULL; -- Ignora o erro se a tabela não existir
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
    NULL; -- Ignora o erro se a tabela não existir
END $$;

-- Criar função e trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_reseller_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se o trigger já existe antes de criar
DO $$
BEGIN
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
    NULL; -- Ignora o erro se a tabela não existir
END $$;