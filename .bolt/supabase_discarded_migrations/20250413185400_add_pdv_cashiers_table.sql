/*
  # Criação da tabela pdv_cashiers
  
  1. Descrição
     - Cria uma tabela para armazenar as operações de abertura e fechamento de caixa
     - Cada usuário terá seu próprio controle de caixa
  
  2. Campos principais
     - id: identificador único UUID
     - user_id: referência ao ID do usuário (foreign key para auth.users)
     - company_id: referência ao ID da empresa (foreign key para companies)
     - initial_amount: valor de abertura do caixa
     - final_amount: valor de fechamento do caixa
     - status: situação do caixa (open ou closed)
     - opened_at: data e hora de abertura
     - closed_at: data e hora de fechamento
*/

-- Criar tabela pdv_cashiers
CREATE TABLE pdv_cashiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    initial_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    final_amount DECIMAL(10,2) DEFAULT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar políticas de segurança RLS
ALTER TABLE pdv_cashiers ENABLE ROW LEVEL SECURITY;

-- Política para visualização (SELECT)
CREATE POLICY pdv_cashiers_select_policy
ON pdv_cashiers FOR SELECT
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.company_id = pdv_cashiers.company_id
    )
);

-- Política para inserção (INSERT)
CREATE POLICY pdv_cashiers_insert_policy
ON pdv_cashiers FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

-- Política para atualização (UPDATE)
CREATE POLICY pdv_cashiers_update_policy
ON pdv_cashiers FOR UPDATE
USING (
    auth.uid() = user_id
);

-- Trigger para atualizar o campo updated_at
CREATE TRIGGER update_pdv_cashiers_modified
BEFORE UPDATE ON pdv_cashiers
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();
