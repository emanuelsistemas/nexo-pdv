/*
  # Criação da tabela de marcas de produtos

  1. Nova Tabela
    - `product_marca`
      - `id` (uuid, chave primária)
      - `company_id` (uuid, referência para companies)
      - `user_id` (uuid, referência para auth.users)
      - `name` (texto, nome da marca)
      - `created_at` (timestamp com timezone)
      - `updated_at` (timestamp com timezone)

  2. Segurança
    - Habilitar RLS na tabela product_marca
    - Adicionar políticas para isolamento baseado em empresa
    - Garantir que usuários só possam acessar marcas de sua empresa

  3. Índices e Triggers
    - Criar índice para melhorar performance de consultas
    - Adicionar trigger para atualizar o campo updated_at
*/

-- Criar tabela de marcas de produtos
CREATE TABLE IF NOT EXISTS product_marca (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar comentários para documentação
COMMENT ON TABLE product_marca IS 'Tabela para armazenar marcas de produtos.';
COMMENT ON COLUMN product_marca.name IS 'Nome da marca.';
COMMENT ON COLUMN product_marca.company_id IS 'ID da empresa proprietária da marca.';
COMMENT ON COLUMN product_marca.user_id IS 'ID do usuário que criou/modificou a marca.';

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS brands_pkey ON product_marca(id);

-- Habilitar RLS
ALTER TABLE product_marca ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Allow SELECT for company members" 
ON product_marca FOR SELECT
USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Allow INSERT for company members" 
ON product_marca FOR INSERT
WITH CHECK ((company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) AND (user_id = auth.uid()));

CREATE POLICY "Allow UPDATE for company members" 
ON product_marca FOR UPDATE
USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1))
WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Allow DELETE for company members" 
ON product_marca FOR DELETE
USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

-- Criar trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION moddatetime() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON product_marca
FOR EACH ROW
EXECUTE FUNCTION moddatetime();

-- Adicionar coluna brand_id à tabela products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES product_marca(id) ON DELETE SET NULL;

-- Adicionar comentário para documentação
COMMENT ON COLUMN products.brand_id IS 'ID da marca associada ao produto.';