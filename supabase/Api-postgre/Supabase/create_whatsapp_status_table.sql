-- Script para criar a tabela whatsapp_revenda_status
-- Esta tabela armazena o status das conversas de WhatsApp por revenda

-- Verificar se a tabela já existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_revenda_status') THEN
        -- Criar a tabela
        CREATE TABLE whatsapp_revenda_status (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            revenda_id UUID NOT NULL,
            phone VARCHAR(50) NOT NULL,
            conversation_id VARCHAR(255),
            name VARCHAR(255),
            last_message TEXT,
            last_message_time BIGINT NOT NULL,
            status VARCHAR(50) DEFAULT 'Aguardando',
            status_msg VARCHAR(50) DEFAULT 'fechada',
            unread_count INT DEFAULT 0,
            setor VARCHAR(100) DEFAULT 'Geral',
            scroll_position INT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE(revenda_id, phone)
        );

        -- Adicionar índices para otimizar consultas
        CREATE INDEX idx_whatsapp_revenda_status_revenda_id ON whatsapp_revenda_status(revenda_id);
        CREATE INDEX idx_whatsapp_revenda_status_phone ON whatsapp_revenda_status(phone);
        CREATE INDEX idx_whatsapp_revenda_status_last_message_time ON whatsapp_revenda_status(last_message_time);
        
        -- Criar trigger para atualizar o campo updated_at automaticamente
        CREATE OR REPLACE FUNCTION trigger_set_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER set_timestamp_whatsapp_revenda_status
        BEFORE UPDATE ON whatsapp_revenda_status
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();

        -- Trigger para garantir que mensagens "abertas" tenham unread_count = 0
        CREATE OR REPLACE FUNCTION reset_unread_count_if_aberta()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.status_msg = 'aberta' AND NEW.unread_count > 0 THEN
                NEW.unread_count = 0;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER ensure_zero_unread_count_when_aberta
        BEFORE INSERT OR UPDATE ON whatsapp_revenda_status
        FOR EACH ROW
        EXECUTE FUNCTION reset_unread_count_if_aberta();

        -- Remover colunas redundantes da tabela whatsapp_revenda_msg
        ALTER TABLE IF EXISTS whatsapp_revenda_msg 
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS status_msg,
        DROP COLUMN IF EXISTS unread_count,
        DROP COLUMN IF EXISTS setor;

        RAISE NOTICE 'Tabela whatsapp_revenda_status criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela whatsapp_revenda_status já existe!';
    END IF;
END $$;
