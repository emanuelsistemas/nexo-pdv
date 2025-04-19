/*
  # Adicionar função para criação automática de grupo padrão

  1. Alterações
    - Criar ou substituir função para adicionar grupo padrão "Diversos" quando uma empresa é criada
    - Verificar se o trigger já existe antes de criar
    - Garantir que cada empresa tenha um grupo padrão para produtos

  2. Notas
    - O grupo "Diversos" é essencial para o funcionamento do sistema
    - Mantém consistência com a criação automática de unidades
*/

-- Função para adicionar grupo padrão "Diversos" quando uma empresa é criada
CREATE OR REPLACE FUNCTION add_default_group_on_company_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir grupo padrão "Diversos" para a nova empresa
  INSERT INTO product_groups (company_id, name, description)
  VALUES (NEW.id, 'Diversos', 'Grupo padrão para itens diversos');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para adicionar grupo padrão quando uma empresa é criada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'company_default_group_trigger'
  ) THEN
    CREATE TRIGGER company_default_group_trigger
      AFTER INSERT
      ON companies
      FOR EACH ROW
      EXECUTE FUNCTION add_default_group_on_company_create();
  END IF;
END $$;