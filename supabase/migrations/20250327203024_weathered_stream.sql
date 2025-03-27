/*
  # Adicionar unidades de medida padrão do sistema

  1. Alterações
    - Criar nova tabela para unidades do sistema
    - Inserir unidades padrão (UN e KG)
    - Atualizar trigger para usar as unidades do sistema

  2. Notas
    - Unidades do sistema são independentes de empresa
    - Todas as empresas terão acesso a estas unidades
    - Novas unidades específicas continuam vinculadas à empresa
*/

-- Criar tabela de unidades do sistema
CREATE TABLE system_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir unidades padrão
INSERT INTO system_units (code, name, description)
VALUES 
  ('UN', 'Unidade', 'Unidade padrão do sistema'),
  ('KG', 'Kilo', 'Unidade de medida para peso em quilogramas');

-- Atualizar a função que adiciona unidades padrão
CREATE OR REPLACE FUNCTION add_default_units_on_company_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir unidades do sistema para a nova empresa
  INSERT INTO product_units (company_id, code, name, description)
  SELECT 
    NEW.id,
    su.code,
    su.name,
    su.description
  FROM system_units su;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;