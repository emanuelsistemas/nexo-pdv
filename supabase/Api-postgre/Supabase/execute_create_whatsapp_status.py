#!/usr/bin/env python3
import os
import psycopg2
from dotenv import load_dotenv

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

# Configuração de conexão ao banco de dados
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@db.pwdnxuhljxglnzbfvxyd.supabase.co:5432/postgres')

def execute_sql_file(file_path):
    """
    Executa um arquivo SQL no banco de dados.
    
    Args:
        file_path (str): Caminho para o arquivo SQL
    """
    try:
        print(f"Conectando ao banco de dados...")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print(f"Lendo arquivo SQL: {file_path}")
        with open(file_path, 'r') as f:
            sql_script = f.read()
            
        print("Executando script SQL...")
        cursor.execute(sql_script)
        
        print("Script SQL executado com sucesso!")
        
    except Exception as e:
        print(f"Erro ao executar script SQL: {e}")
    finally:
        if conn:
            cursor.close()
            conn.close()
            print("Conexão com o banco de dados fechada.")

if __name__ == "__main__":
    sql_file = "create_whatsapp_status_table.sql"
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sql_path = os.path.join(script_dir, sql_file)
    
    execute_sql_file(sql_path)
