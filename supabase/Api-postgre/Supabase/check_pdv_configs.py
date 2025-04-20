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
    
    # Verificar estrutura da tabela pdv_configurations
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'pdv_configurations'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    print("\nEstrutura da tabela pdv_configurations:")
    for column in columns:
        print(f"- {column['column_name']} ({column['data_type']}) {'NULL' if column['is_nullable'] == 'YES' else 'NOT NULL'}")
    
except Exception as e:
    print(f"❌ Erro: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
