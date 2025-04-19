/*
  # Desabilitar RLS para tabela product_images

  1. Alterações
    - Desabilitar RLS na tabela product_images
    - Remover políticas existentes para evitar conflitos

  2. Notas
    - Esta alteração permite acesso direto à tabela sem restrições de RLS
    - Similar à configuração da tabela resellers
*/

-- Desabilitar RLS na tabela product_images
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view their company's product images" ON product_images;
DROP POLICY IF EXISTS "Users can create images for their company's products" ON product_images;
DROP POLICY IF EXISTS "Users can update their company's product images" ON product_images;
DROP POLICY IF EXISTS "Users can delete their company's product images" ON product_images;