import os
import psycopg2
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Obter string de conexão do ambiente ou usar valor padrão
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/postgres')

def execute_sql_file(file_path):
    """Executa um arquivo SQL no banco de dados PostgreSQL."""
    try:
        # Conectar ao banco
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Ler o arquivo SQL
        with open(file_path, 'r') as sql_file:
            sql_commands = sql_file.read()
        
        # Executar os comandos SQL
        cursor.execute(sql_commands)
        
        print(f"Execução do arquivo {file_path} concluída com sucesso!")
        
    except Exception as e:
        print(f"Erro ao executar o arquivo SQL: {e}")
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    # Caminho para o arquivo SQL
    sql_file_path = os.path.join(os.path.dirname(__file__), 'create_barcode_reservations.sql')
    
    # Executar o arquivo SQL
    execute_sql_file(sql_file_path)
    print("Sistema de reserva de códigos de barras implementado com sucesso!")
