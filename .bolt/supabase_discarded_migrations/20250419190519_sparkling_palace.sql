/*
  # Adicionar campo user_pai à tabela companies

  1. Alterações
    - Adicionar coluna user_pai para armazenar o email do usuário que criou a empresa
    - Adicionar coluna created_by para armazenar o ID do usuário que criou a empresa
    - Criar função e trigger para preencher automaticamente o campo user_pai

  2. Notas
    - O campo user_pai armazena o email do usuário que criou a empresa
    - O campo created_by armazena o ID do usuário que criou a empresa
    - A função set_user_pai_on_insert é executada automaticamente ao inserir uma nova empresa
*/

-- Adicionar coluna user_pai
ALTER TABLE companies
ADD COLUMN user_pai TEXT;

-- Adicionar coluna created_by
ALTER TABLE companies
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Criar função para definir o user_pai automaticamente
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

-- Criar trigger para executar a função ao inserir uma nova empresa
CREATE TRIGGER set_user_pai_trigger
BEFORE INSERT ON companies
FOR EACH ROW
EXECUTE FUNCTION set_user_pai_on_insert();