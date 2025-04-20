-- Verificar se a tabela app_configurations existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'app_configurations'
) AS tabela_existe;

-- Listar todas as tabelas no schema public
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
