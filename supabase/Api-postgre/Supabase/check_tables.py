import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração da conexão PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def check_table_structure(table_name):
    """Verifica a estrutura de uma tabela específica"""
    conn = None
    try:
        # Conectar ao banco de dados
        print(f"\n--- Estrutura da tabela '{table_name}' ---")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Consulta para obter informações sobre as colunas da tabela
        cursor.execute(f"""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        for col in columns:
            print(f"Coluna: {col['column_name']}, Tipo: {col['data_type']}, Nullable: {col['is_nullable']}")
        
        # Extrair uma amostra da tabela para ver os dados reais
        print(f"\n--- Exemplo de dados da tabela '{table_name}' ---")
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 1")
        sample = cursor.fetchone()
        
        if sample:
            for key, value in sample.items():
                value_preview = str(value)[:50] + "..." if value and len(str(value)) > 50 else value
                print(f"{key}: {value_preview}")
        else:
            print("Tabela vazia, nenhum dado para exibir.")
            
    except Exception as e:
        print(f"Erro ao verificar estrutura da tabela: {e}")
    finally:
        if conn:
            conn.close()

# Lista de tabelas identificadas anteriormente
tables = ["companies", "product_groups", "product_stock_movements", 
          "product_units", "products", "profiles", "system_units"]

# Verifica a estrutura de cada tabela
for table in tables:
    check_table_structure(table)
