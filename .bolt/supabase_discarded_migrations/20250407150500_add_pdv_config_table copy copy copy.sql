/*
  # Criação da tabela pdv_configurations
  
  1. Descrição
     - Cria uma tabela para armazenar as configurações do PDV por usuário e empresa
     - Cada usuário pode ter configurações personalizadas vinculadas à sua empresa
  
  2. Campos principais
     - id: identificador único UUID
     - user_id: referência ao ID do usuário (foreign key para auth.users)
     - company_id: referência ao ID da empresa (foreign key para companies)
     - group_items: agrupar itens iguais no carrinho
     - control_cashier: controlar abertura e fechamento de caixa
     - require_seller: exigir vendedor nas operações
     - full_screen: modo tela cheia 
     - outras configurações podem ser adicionadas no futuro
*/

-- Criar tabela pdv_configurations
CREATE TABLE pdv_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    group_items BOOLEAN NOT NULL DEFAULT FALSE,
    control_cashier BOOLEAN NOT NULL DEFAULT FALSE,
    require_seller BOOLEAN NOT NULL DEFAULT FALSE,
    full_screen BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_company_config UNIQUE (user_id, company_id)
);

-- Adicionar políticas de segurança RLS
ALTER TABLE pdv_configurations ENABLE ROW LEVEL SECURITY;

-- Criar policy para leitura (usuários só podem ver suas próprias configurações)
CREATE POLICY "Usuários podem ver suas próprias configurações" 
ON pdv_configurations FOR SELECT
USING (auth.uid() = user_id);

-- Criar policy para inserção (usuários só podem criar configurações para si próprios)
CREATE POLICY "Usuários podem criar suas próprias configurações" 
ON pdv_configurations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Criar policy para atualização (usuários só podem atualizar suas próprias configurações)
CREATE POLICY "Usuários podem atualizar suas próprias configurações" 
ON pdv_configurations FOR UPDATE
USING (auth.uid() = user_id);

-- Criar trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pdv_configurations_modified
BEFORE UPDATE ON pdv_configurations
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
