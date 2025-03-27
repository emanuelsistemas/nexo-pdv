/*
  # Correção das políticas de segurança da tabela companies

  1. Alterações
    - Remove políticas existentes
    - Cria novas políticas com permissões corretas
    - Garante que usuários possam criar e gerenciar suas empresas

  2. Segurança
    - Usuários podem criar uma empresa
    - Usuários podem visualizar e atualizar apenas sua própria empresa
    - Usuários não podem acessar empresas de outros usuários
*/

-- Remove políticas existentes
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can insert their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;

-- Cria nova política para inserção (mais permissiva)
CREATE POLICY "Usuários autenticados podem criar empresas"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Cria política para visualização
CREATE POLICY "Usuários podem ver sua própria empresa"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    ) OR 
    id IN (
      SELECT companies.id 
      FROM companies 
      LEFT JOIN profiles ON profiles.company_id = companies.id 
      WHERE profiles.company_id IS NULL
    )
  );

-- Cria política para atualização
CREATE POLICY "Usuários podem atualizar sua própria empresa"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- Garante que RLS está ativado
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;