/*
  # Adicionar campo de email à tabela profiles

  1. Alterações
    - Adicionar coluna email à tabela profiles
    - Adicionar restrição de unicidade para evitar emails duplicados
    - Atualizar os emails existentes a partir da tabela auth.users
    - Criar índice para melhorar performance de consultas por email

  2. Segurança
    - Garantir integridade de dados com restrição de unicidade
    - Manter consistência entre auth.users e profiles
*/

-- Adicionar coluna email se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    -- Adicionar coluna email
    ALTER TABLE profiles 
    ADD COLUMN email TEXT;

    -- Preencher dados de email existentes com base na tabela auth.users
    UPDATE profiles 
    SET email = users.email
    FROM auth.users as users
    WHERE profiles.id = users.id;

    -- Tornar coluna obrigatória e única
    ALTER TABLE profiles 
    ALTER COLUMN email SET NOT NULL;

    -- Adicionar restrição de unicidade
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_email_unique UNIQUE (email);
    
    -- Adicionar índice para melhorar performance
    CREATE INDEX profiles_email_idx ON profiles (email);
  END IF;
END $$;
