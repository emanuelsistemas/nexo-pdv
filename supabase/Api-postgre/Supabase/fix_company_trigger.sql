-- Recriar a função para adicionar unidades padrão sem depender da tabela system_units
CREATE OR REPLACE FUNCTION add_default_units_on_company_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir unidades padrão diretamente (sem consultar a tabela system_units)
  INSERT INTO product_units (company_id, code, name, description)
  VALUES
    (NEW.id, 'UN', 'Unidade', 'Unidade padrão do sistema'),
    (NEW.id, 'KG', 'Kilo', 'Unidade padrão do sistema para peso em quilogramas');
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Ignorar erro de duplicação
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
