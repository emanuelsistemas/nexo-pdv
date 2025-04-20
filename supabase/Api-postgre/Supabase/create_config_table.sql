-- Script para criar tabela de configurações organizadas por módulos
-- A estrutura usa JSONB para armazenar as configurações de cada módulo separadamente

-- Verificar se a tabela existe e removê-la para uma implementação limpa
DROP TABLE IF EXISTS app_configurations;

-- Criar nova tabela de configurações
CREATE TABLE app_configurations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Configurações do módulo sistema
    system_config JSONB DEFAULT '{
        "theme": "dark",
        "language": "pt-BR"
    }',
    
    -- Configurações do módulo caixa
    cashier_config JSONB DEFAULT '{
        "group_items": false,
        "control_cashier": false,
        "require_seller": false
    }',
    
    -- Configurações do módulo produto
    product_config JSONB DEFAULT '{
        "show_barcode": false,
        "show_ncm": false,
        "show_cfop": false,
        "show_cst": false,
        "show_pis": false,
        "show_cofins": false
    }',
    
    -- Campo para configurações futuras de outros módulos
    extra_config JSONB DEFAULT '{}',
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Restrição para garantir que cada usuário tenha apenas uma configuração por empresa
    CONSTRAINT unique_user_company_config UNIQUE (user_id, company_id)
);

-- Adicionar índices para melhorar a performance das consultas
CREATE INDEX idx_app_configurations_user_id ON app_configurations(user_id);
CREATE INDEX idx_app_configurations_company_id ON app_configurations(company_id);

-- Comentários para documentação
COMMENT ON TABLE app_configurations IS 'Armazena configurações do aplicativo organizadas por módulos usando JSONB';
COMMENT ON COLUMN app_configurations.system_config IS 'Configurações do módulo sistema (tema, idioma, etc.)';
COMMENT ON COLUMN app_configurations.cashier_config IS 'Configurações do módulo caixa (agrupamento de itens, controle de caixa, etc.)';
COMMENT ON COLUMN app_configurations.product_config IS 'Configurações do módulo produto (exibição de campos na listagem, etc.)';
COMMENT ON COLUMN app_configurations.extra_config IS 'Campo para armazenar configurações de módulos futuros';

-- Migrar dados da tabela antiga (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pdv_configurations') THEN
        INSERT INTO app_configurations (user_id, company_id, cashier_config, product_config)
        SELECT 
            user_id, 
            company_id,
            jsonb_build_object(
                'group_items', group_items,
                'control_cashier', control_cashier,
                'require_seller', require_seller
            ) as cashier_config,
            jsonb_build_object(
                'show_barcode', COALESCE(show_barcode, false),
                'show_ncm', COALESCE(show_ncm, false),
                'show_cfop', COALESCE(show_cfop, false),
                'show_cst', COALESCE(show_cst, false),
                'show_pis', COALESCE(show_pis, false),
                'show_cofins', COALESCE(show_cofins, false)
            ) as product_config
        FROM pdv_configurations
        ON CONFLICT (user_id, company_id) DO UPDATE 
        SET 
            cashier_config = EXCLUDED.cashier_config,
            product_config = EXCLUDED.product_config,
            updated_at = NOW();
    END IF;
END
$$;
