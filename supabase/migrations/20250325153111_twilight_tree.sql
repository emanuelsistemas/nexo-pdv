/*
  # Criar tabela de perfis de usuários

  1. Nova Tabela
    - `profiles`
      - `id` (uuid, chave primária, referencia auth.users)
      - `name` (texto, nome completo do usuário)
      - `created_at` (timestamp com timezone)
      - `updated_at` (timestamp com timezone)

  2. Segurança
    - Habilitar RLS na tabela `profiles`
    - Adicionar política para usuários autenticados lerem seus próprios dados
    - Adicionar política para usuários autenticados atualizarem seus próprios dados
*/

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ler seu próprio perfil"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger para atualizar o updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE
  ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();