import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Carrega variáveis de ambiente
load_dotenv()

# Configuração da conexão PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def get_db_connection():
    """
    Cria e retorna uma conexão com o banco de dados PostgreSQL
    
    Returns:
        Um objeto de conexão PostgreSQL
    """
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        conn.autocommit = False  # Configuramos para False para podermos controlar transações
        return conn
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        raise e
