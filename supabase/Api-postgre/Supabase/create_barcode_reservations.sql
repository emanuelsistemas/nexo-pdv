-- Tabela para gerenciar reservas de códigos de barras
CREATE TABLE IF NOT EXISTS product_barcode_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL,
  barcode VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 minutes',
  UNIQUE(company_id, barcode)
);

-- Função para verificar se um código de barras está disponível
-- Esta função verifica:
-- 1. Se o código de barras já existe em algum produto
-- 2. Se o código de barras já está reservado
-- 3. Se o código de barras conflita com algum código de produto existente
CREATE OR REPLACE FUNCTION is_barcode_available(
  p_company_id UUID,
  p_barcode VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  product_exists BOOLEAN;
  barcode_reserved BOOLEAN;
  code_conflict BOOLEAN;
BEGIN
  -- Verificar se já existe produto com esse código de barras
  SELECT EXISTS(
    SELECT 1 FROM products 
    WHERE company_id = p_company_id AND barcode = p_barcode
  ) INTO product_exists;
  
  -- Verificar se já existe produto com código igual ao código de barras
  SELECT EXISTS(
    SELECT 1 FROM products 
    WHERE company_id = p_company_id AND code = p_barcode
  ) INTO code_conflict;
  
  -- Verificar se o código de barras já está reservado
  SELECT EXISTS(
    SELECT 1 FROM product_barcode_reservations
    WHERE company_id = p_company_id 
      AND barcode = p_barcode
      AND expires_at > NOW()
  ) INTO barcode_reserved;
  
  -- O código de barras está disponível se não existir em produtos,
  -- não estiver reservado e não conflitar com códigos existentes
  RETURN NOT (product_exists OR barcode_reserved OR code_conflict);
END;
$$ LANGUAGE plpgsql;

-- Função para reservar um código de barras
CREATE OR REPLACE FUNCTION reserve_barcode(
  p_company_id UUID,
  p_user_id UUID,
  p_barcode VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  is_available BOOLEAN;
BEGIN
  -- Verificar disponibilidade
  SELECT is_barcode_available(p_company_id, p_barcode) INTO is_available;
  
  -- Se não estiver disponível, retornar falso
  IF NOT is_available THEN
    RETURN FALSE;
  END IF;
  
  -- Excluir qualquer reserva antiga desse usuário para esse barcode
  DELETE FROM product_barcode_reservations
  WHERE company_id = p_company_id 
    AND user_id = p_user_id
    AND barcode = p_barcode;
  
  -- Criar nova reserva
  INSERT INTO product_barcode_reservations
    (company_id, user_id, barcode)
  VALUES
    (p_company_id, p_user_id, p_barcode);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para liberar uma reserva de código de barras
CREATE OR REPLACE FUNCTION release_barcode_reservation(
  p_company_id UUID,
  p_user_id UUID,
  p_barcode VARCHAR
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM product_barcode_reservations
  WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND barcode = p_barcode;
END;
$$ LANGUAGE plpgsql;

-- Índice para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_product_barcode_reservations_company_barcode
ON product_barcode_reservations(company_id, barcode);

-- Job para limpar reservas expiradas (opcional)
CREATE OR REPLACE FUNCTION clean_expired_barcode_reservations()
RETURNS VOID AS $$
BEGIN
  DELETE FROM product_barcode_reservations
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Adicionar gatilho para execução periódica (opcional)
-- Obs: Se o Supabase já tiver um mecanismo de agendamento, utilizar ele no lugar
