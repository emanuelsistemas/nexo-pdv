-- Script para adicionar campos de valores por forma de pagamento na tabela pdv_cashiers
ALTER TABLE pdv_cashiers ADD COLUMN IF NOT EXISTS final_amount_money DECIMAL(10,2) DEFAULT 0;
ALTER TABLE pdv_cashiers ADD COLUMN IF NOT EXISTS final_amount_debit DECIMAL(10,2) DEFAULT 0;
ALTER TABLE pdv_cashiers ADD COLUMN IF NOT EXISTS final_amount_credit DECIMAL(10,2) DEFAULT 0;
ALTER TABLE pdv_cashiers ADD COLUMN IF NOT EXISTS final_amount_pix DECIMAL(10,2) DEFAULT 0;
ALTER TABLE pdv_cashiers ADD COLUMN IF NOT EXISTS final_amount_voucher DECIMAL(10,2) DEFAULT 0;

-- Comentário para documentação
COMMENT ON COLUMN pdv_cashiers.final_amount_money IS 'Valor em dinheiro no fechamento de caixa';
COMMENT ON COLUMN pdv_cashiers.final_amount_debit IS 'Valor em cartão de débito no fechamento de caixa';
COMMENT ON COLUMN pdv_cashiers.final_amount_credit IS 'Valor em cartão de crédito no fechamento de caixa';
COMMENT ON COLUMN pdv_cashiers.final_amount_pix IS 'Valor em PIX no fechamento de caixa';
COMMENT ON COLUMN pdv_cashiers.final_amount_voucher IS 'Valor em voucher/vale no fechamento de caixa';
