-- Função para limpar reservas de códigos de produtos para um usuário específico
CREATE OR REPLACE FUNCTION clean_user_product_code_reservations(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Limpar todas as reservas de códigos de produtos feitas pelo usuário
    DELETE FROM product_code_reservations 
    WHERE user_id = p_user_id;
    
    -- Limpar todas as reservas de códigos de barras feitas pelo usuário
    DELETE FROM product_barcode_reservations 
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
