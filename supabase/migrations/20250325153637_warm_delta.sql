/*
  # Adicionar política de inserção para perfis

  1. Alterações
    - Adicionar política para permitir que usuários autenticados insiram seus próprios perfis

  2. Segurança
    - A política garante que o usuário só pode inserir um perfil com seu próprio ID
*/

CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);