import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Carrega variáveis de ambiente
load_dotenv()

# Configuração da conexão PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

try:
    # Conectar ao banco de dados
    print(f"Conectando ao banco de dados...")
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Verificar se a tabela app_configurations existe
    cursor.execute("""
        SELECT EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_schema = 'public'
           AND table_name = 'app_configurations'
        );
    """)
    
    exists = cursor.fetchone()
    print(f"\nTabela app_configurations existe: {exists['exists']}")
    
    # Listar todas as tabelas no schema public
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    
    tables = cursor.fetchall()
    print("\nLista de tabelas no schema public:")
    for table in tables:
        print(f"- {table['table_name']}")
    
    # Se a tabela existe, mostrar sua estrutura
    if exists['exists']:
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'app_configurations'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print("\nEstrutura da tabela app_configurations:")
        for column in columns:
            print(f"- {column['column_name']} ({column['data_type']}) {'NULL' if column['is_nullable'] == 'YES' else 'NOT NULL'}")
    
except Exception as e:
    print(f"❌ Erro: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
