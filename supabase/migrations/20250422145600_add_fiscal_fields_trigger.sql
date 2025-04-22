-- Criar função para atualizar automaticamente os códigos fiscais
CREATE OR REPLACE FUNCTION public.update_fiscal_codes()
RETURNS TRIGGER AS $$
BEGIN
  -- Código UF baseado no campo address_state
  NEW.address_state_code := CASE 
    WHEN NEW.address_state = 'AC' THEN '12'
    WHEN NEW.address_state = 'AL' THEN '27'
    WHEN NEW.address_state = 'AP' THEN '16'
    WHEN NEW.address_state = 'AM' THEN '13'
    WHEN NEW.address_state = 'BA' THEN '29'
    WHEN NEW.address_state = 'CE' THEN '23'
    WHEN NEW.address_state = 'DF' THEN '53'
    WHEN NEW.address_state = 'ES' THEN '32'
    WHEN NEW.address_state = 'GO' THEN '52'
    WHEN NEW.address_state = 'MA' THEN '21'
    WHEN NEW.address_state = 'MT' THEN '51'
    WHEN NEW.address_state = 'MS' THEN '50'
    WHEN NEW.address_state = 'MG' THEN '31'
    WHEN NEW.address_state = 'PA' THEN '15'
    WHEN NEW.address_state = 'PB' THEN '25'
    WHEN NEW.address_state = 'PR' THEN '41'
    WHEN NEW.address_state = 'PE' THEN '26'
    WHEN NEW.address_state = 'PI' THEN '22'
    WHEN NEW.address_state = 'RJ' THEN '33'
    WHEN NEW.address_state = 'RN' THEN '24'
    WHEN NEW.address_state = 'RS' THEN '43'
    WHEN NEW.address_state = 'RO' THEN '11'
    WHEN NEW.address_state = 'RR' THEN '14'
    WHEN NEW.address_state = 'SC' THEN '42'
    WHEN NEW.address_state = 'SP' THEN '35'
    WHEN NEW.address_state = 'SE' THEN '28'
    WHEN NEW.address_state = 'TO' THEN '17'
    ELSE NULL
  END;
  
  -- Código do país (1058 para Brasil)
  NEW.address_country_code := CASE 
    WHEN NEW.address_country = 'Brasil' OR NEW.address_country IS NULL THEN '1058'
    ELSE NULL
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para novos registros e atualizações na tabela companies
DROP TRIGGER IF EXISTS update_fiscal_codes_trigger ON public.companies;

CREATE TRIGGER update_fiscal_codes_trigger
BEFORE INSERT OR UPDATE OF address_state, address_country
ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_fiscal_codes();

-- Adicionar comentário ao trigger
COMMENT ON TRIGGER update_fiscal_codes_trigger ON public.companies IS 'Atualiza automaticamente os códigos fiscais (UF e país) ao inserir ou atualizar um registro na tabela companies';
