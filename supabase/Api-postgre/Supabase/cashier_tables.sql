-- Tabela para controle de caixa (Abertura e Fechamento)
CREATE TABLE IF NOT EXISTS pdv_cashiers (
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

-- Tabela para movimentações de caixa (Suprimentos e Sangrias)
CREATE TABLE IF NOT EXISTS pdv_cashier_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES pdv_cashiers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('suprimento', 'sangria')),
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabelas criadas sem Row Level Security (RLS), totalmente desprotegidas
-- conforme solicitado pelo usuário

-- Trigger para atualizar o campo updated_at em pdv_cashiers
CREATE TRIGGER update_pdv_cashiers_modified
BEFORE UPDATE ON pdv_cashiers
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();

-- Trigger para atualizar o campo updated_at em pdv_cashier_movements
CREATE TRIGGER update_pdv_cashier_movements_modified
BEFORE UPDATE ON pdv_cashier_movements
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();
