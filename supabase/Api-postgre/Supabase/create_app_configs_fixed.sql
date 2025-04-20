-- Script para criar tabela de configurações organizadas por módulos
-- A estrutura usa JSONB para armazenar as configurações de cada módulo separadamente

-- Verificar se a tabela existe e removê-la para uma implementação limpa
DROP TABLE IF EXISTS app_configs;

-- Criar nova tabela de configurações
CREATE TABLE app_configs (
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Restrição para garantir que cada usuário tenha apenas uma configuração por empresa
    CONSTRAINT app_configs_user_company_unique UNIQUE (user_id, company_id)
);

-- Adicionar índices para melhorar a performance das consultas
CREATE INDEX idx_app_configs_user_id ON app_configs(user_id);
CREATE INDEX idx_app_configs_company_id ON app_configs(company_id);

-- Comentários para documentação
COMMENT ON TABLE app_configs IS 'Armazena configurações do aplicativo organizadas por módulos usando JSONB';
COMMENT ON COLUMN app_configs.system_config IS 'Configurações do módulo sistema (tema, idioma, etc.)';
COMMENT ON COLUMN app_configs.cashier_config IS 'Configurações do módulo caixa (agrupamento de itens, controle de caixa, etc.)';
COMMENT ON COLUMN app_configs.product_config IS 'Configurações do módulo produto (exibição de campos na listagem, etc.)';
COMMENT ON COLUMN app_configs.extra_config IS 'Campo para armazenar configurações de módulos futuros';

-- Migrar dados da tabela antiga (se existir) - APENAS AS COLUNAS QUE EXISTEM
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pdv_configurations') THEN
        INSERT INTO app_configs (user_id, company_id, cashier_config)
        SELECT 
            user_id, 
            company_id,
            jsonb_build_object(
                'groupItems', group_items,
                'controlCashier', control_cashier,
                'requireSeller', require_seller
            ) as cashier_config
        FROM pdv_configurations
        ON CONFLICT (user_id, company_id) DO UPDATE 
        SET 
            cashier_config = EXCLUDED.cashier_config,
            updated_at = NOW();
    END IF;
END
$$;
