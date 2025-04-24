-- Adiciona campos necessários para emissão de NF-e/NFC-e na tabela companies
-- Código IBGE da UF e código do país

-- Adiciona coluna para código IBGE da UF (necessário para chave de acesso NF-e/NFC-e)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS address_state_code character varying;

COMMENT ON COLUMN public.companies.address_state_code IS 'Código IBGE da UF (necessário para chave de acesso NF-e/NFC-e)';

-- Adiciona coluna para código do país (necessário para XML NF-e/NFC-e)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS address_country_code character varying;

COMMENT ON COLUMN public.companies.address_country_code IS 'Código do país conforme tabela BACEN (1058 para Brasil)';

-- Atualiza valores padrão para registros existentes
UPDATE public.companies
SET 
  -- Código de UF baseado no valor atual do campo address_state
  address_state_code = CASE 
    WHEN address_state = 'AC' THEN '12'
    WHEN address_state = 'AL' THEN '27'
    WHEN address_state = 'AP' THEN '16'
    WHEN address_state = 'AM' THEN '13'
    WHEN address_state = 'BA' THEN '29'
    WHEN address_state = 'CE' THEN '23'
    WHEN address_state = 'DF' THEN '53'
    WHEN address_state = 'ES' THEN '32'
    WHEN address_state = 'GO' THEN '52'
    WHEN address_state = 'MA' THEN '21'
    WHEN address_state = 'MT' THEN '51'
    WHEN address_state = 'MS' THEN '50'
    WHEN address_state = 'MG' THEN '31'
    WHEN address_state = 'PA' THEN '15'
    WHEN address_state = 'PB' THEN '25'
    WHEN address_state = 'PR' THEN '41'
    WHEN address_state = 'PE' THEN '26'
    WHEN address_state = 'PI' THEN '22'
    WHEN address_state = 'RJ' THEN '33'
    WHEN address_state = 'RN' THEN '24'
    WHEN address_state = 'RS' THEN '43'
    WHEN address_state = 'RO' THEN '11'
    WHEN address_state = 'RR' THEN '14'
    WHEN address_state = 'SC' THEN '42'
    WHEN address_state = 'SP' THEN '35'
    WHEN address_state = 'SE' THEN '28'
    WHEN address_state = 'TO' THEN '17'
    ELSE NULL
  END,
  -- Código do país (1058 para Brasil)
  address_country_code = CASE 
    WHEN address_country = 'Brasil' OR address_country IS NULL THEN '1058'
    ELSE NULL
  END
WHERE id IS NOT NULL;
