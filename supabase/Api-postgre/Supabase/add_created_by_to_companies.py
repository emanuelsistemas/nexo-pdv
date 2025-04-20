import psycopg2
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Conectar ao banco de dados PostgreSQL do Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

try:
    # Estabelecer conexão
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    
    print("Conexão estabelecida com sucesso.")
    
    # Script SQL para adicionar a coluna created_by se não existir
    sql_add_column = """
    ALTER TABLE IF EXISTS companies 
    ADD COLUMN IF NOT EXISTS created_by UUID;
    """
    
    # Executar o script
    cursor.execute(sql_add_column)
    print("Coluna 'created_by' adicionada à tabela 'companies' com sucesso (ou já existia).")
    
    # Verificar se existe um trigger que necessita do campo created_by
    sql_check_triggers = """
    SELECT tgname, pg_get_triggerdef(t.oid)
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'companies';
    """
    
    cursor.execute(sql_check_triggers)
    triggers = cursor.fetchall()
    
    if triggers:
        print("Triggers encontrados na tabela 'companies':")
        for trigger in triggers:
            print(f"Nome: {trigger[0]}")
            print(f"Definição: {trigger[1]}")
            print("-" * 50)
    else:
        print("Nenhum trigger encontrado na tabela 'companies'.")
    
except Exception as e:
    print(f"Erro ao executar operação: {e}")
finally:
    # Fechar a conexão
    if 'conn' in locals() and conn is not None:
        conn.close()
        print("Conexão fechada.")
