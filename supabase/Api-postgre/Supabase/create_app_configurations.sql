-- Script para criar tabela de configurações organizadas por módulos
-- A estrutura usa JSONB para armazenar as configurações de cada módulo separadamente

-- Remover constraints existentes se existirem para evitar conflitos
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_company_config') THEN
        ALTER TABLE IF EXISTS app_configurations DROP CONSTRAINT IF EXISTS unique_user_company_config;
    END IF;
END$$;

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
        "groupItems": false,
        "controlCashier": false,
        "requireSeller": false
    }',
    
    -- Configurações do módulo produto
    product_config JSONB DEFAULT '{
        "showBarcode": false,
        "showNcm": false,
        "showCfop": false,
        "showCst": false,
        "showPis": false,
        "showCofins": false
    }',
    
    -- Campo para configurações futuras de outros módulos
    extra_config JSONB DEFAULT '{}',
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar constraint única após criar a tabela
ALTER TABLE app_configurations 
    ADD CONSTRAINT unique_user_company_config UNIQUE (user_id, company_id);

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
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pdv_configurations') THEN
        INSERT INTO app_configurations (user_id, company_id, cashier_config, product_config)
        SELECT 
            user_id, 
            company_id,
            jsonb_build_object(
                'groupItems', group_items,
                'controlCashier', control_cashier,
                'requireSeller', require_seller
            ) as cashier_config,
            jsonb_build_object(
                'showBarcode', COALESCE(show_barcode, false),
                'showNcm', COALESCE(show_ncm, false),
                'showCfop', COALESCE(show_cfop, false),
                'showCst', COALESCE(show_cst, false),
                'showPis', COALESCE(show_pis, false),
                'showCofins', COALESCE(show_cofins, false)
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
