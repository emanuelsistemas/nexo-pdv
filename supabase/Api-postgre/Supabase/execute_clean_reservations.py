import psycopg2
import json
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Obter a string de conexão do banco de dados
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    # String de conexão padrão para desenvolvimento local
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"

def execute_clean_reservations_migration():
    """
    Executa a migração para criar a função de limpeza de reservas de códigos de produtos.
    """
    try:
        # Conectar ao banco de dados
        connection = psycopg2.connect(DATABASE_URL)
        cursor = connection.cursor()
        
        # Ler o arquivo SQL
        with open('../../migrations/20250420_clean_product_code_reservations.sql', 'r') as file:
            sql_script = file.read()
        
        # Executar o script SQL
        cursor.execute(sql_script)
        
        connection.commit()
        result = {
            "status": "success",
            "message": "Função de limpeza de reservas de códigos de produtos criada com sucesso"
        }
        
    except Exception as e:
        print(f"Erro ao executar migração: {e}")
        result = {
            "status": "error",
            "message": str(e)
        }
    finally:
        if connection:
            cursor.close()
            connection.close()
            
    return result

if __name__ == "__main__":
    # Executar a migração
    result = execute_clean_reservations_migration()
    print(json.dumps(result, indent=2))
