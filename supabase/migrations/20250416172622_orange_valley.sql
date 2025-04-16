/*
  # Adicionar campo de revendedor à tabela companies

  1. Alterações
    - Adicionar coluna reseller_id que referencia a própria tabela companies
    - Permitir que seja nulo (para empresas sem revendedor)
    - Adicionar índice para melhor performance

  2. Notas
    - O campo é auto-referencial, permitindo que uma empresa seja revendedora de outras
    - Valor nulo indica que a empresa não tem revendedor
*/

-- Adicionar coluna reseller_id
ALTER TABLE companies
ADD COLUMN reseller_id UUID REFERENCES companies(id);

-- Criar índice para melhor performance
CREATE INDEX idx_companies_reseller_id ON companies(reseller_id);