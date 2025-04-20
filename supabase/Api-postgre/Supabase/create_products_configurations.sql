-- Script para criar tabela específica para configurações de produtos

-- Verificar se a tabela existe e removê-la para uma implementação limpa
DROP TABLE IF EXISTS products_configurations;

-- Criar nova tabela de configurações de produtos
CREATE TABLE products_configurations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Configurações de exibição da listagem de produtos
    show_barcode BOOLEAN DEFAULT FALSE,
    show_ncm BOOLEAN DEFAULT FALSE,
    show_cfop BOOLEAN DEFAULT FALSE,
    show_cst BOOLEAN DEFAULT FALSE,
    show_pis BOOLEAN DEFAULT FALSE,
    show_cofins BOOLEAN DEFAULT FALSE,
    
    -- Campos para configurações futuras de produtos
    extra_settings JSONB DEFAULT '{}',
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Restrição para garantir que cada usuário tenha apenas uma configuração por empresa
    CONSTRAINT products_configurations_user_company_unique UNIQUE (user_id, company_id)
);

-- Adicionar índices para melhorar a performance das consultas
CREATE INDEX idx_products_configurations_user_id ON products_configurations(user_id);
CREATE INDEX idx_products_configurations_company_id ON products_configurations(company_id);

-- Comentários para documentação
COMMENT ON TABLE products_configurations IS 'Armazena configurações específicas para o módulo de produtos';
COMMENT ON COLUMN products_configurations.show_barcode IS 'Configuração para exibir código de barras na listagem de produtos';
COMMENT ON COLUMN products_configurations.show_ncm IS 'Configuração para exibir NCM na listagem de produtos';
COMMENT ON COLUMN products_configurations.show_cfop IS 'Configuração para exibir CFOP na listagem de produtos';
COMMENT ON COLUMN products_configurations.show_cst IS 'Configuração para exibir CST na listagem de produtos';
COMMENT ON COLUMN products_configurations.show_pis IS 'Configuração para exibir PIS na listagem de produtos';
COMMENT ON COLUMN products_configurations.show_cofins IS 'Configuração para exibir COFINS na listagem de produtos';
COMMENT ON COLUMN products_configurations.extra_settings IS 'Campo para armazenar configurações adicionais de produtos em formato JSONB';
