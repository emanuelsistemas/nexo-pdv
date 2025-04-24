-- Adicionar coluna created_by à tabela companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_by UUID;

-- Atualizar trigger ou função que pode estar esperando esse campo
-- Verificar e atualizar a função do trigger se necessário
DO $$
BEGIN
    -- Verificar se existe um trigger na tabela companies
    IF EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgrelid = 'companies'::regclass
    ) THEN
        -- Esta parte depende da lógica específica do trigger
        -- e precisaria ser ajustada adequadamente
        RAISE NOTICE 'Existem triggers na tabela companies que podem precisar ser atualizados';
    END IF;
END
$$;
