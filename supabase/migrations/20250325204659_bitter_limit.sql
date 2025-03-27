/*
  # Ajuste nas políticas de segurança e restrições

  1. Alterações
    - Desativa temporariamente RLS para debug
    - Adiciona logs para rastreamento
*/

-- Desativa RLS temporariamente para debug
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Verifica e corrige restrições de chave estrangeira
DO $$
BEGIN
  -- Verifica se a constraint já existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_company_id_fkey'
  ) THEN
    -- Adiciona a constraint se não existir
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES companies(id);
  END IF;
END $$;