-- Migration: Adicionar campo reseller_id à tabela companies
-- Descrição: Adiciona referência para tabela de revendas

-- Adicionar campo reseller_id à tabela companies
ALTER TABLE companies ADD COLUMN reseller_id UUID REFERENCES resellers(id);

-- Adicionar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_companies_reseller_id ON companies(reseller_id);

-- Atualizar política RLS para incluir o novo campo
ALTER POLICY "Empresas são visíveis para seus usuários" ON companies
  USING (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = id
    ) OR 
    auth.uid() IN (
      SELECT au.id 
      FROM auth.users au 
      WHERE au.email = user_pai
    )
  );

COMMENT ON COLUMN companies.reseller_id IS 'ID da revenda associada à empresa';
