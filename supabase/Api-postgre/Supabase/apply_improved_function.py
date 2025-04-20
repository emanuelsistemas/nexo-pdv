#!/usr/bin/env python3
import os
import psycopg2
import sys

def get_database_url():
    """Obtém a URL de conexão do banco de dados."""
    # Tenta ler a URL do banco de dados a partir da variável de ambiente
    db_url = os.getenv('DATABASE_URL')
    
    # Se não encontrar a variável de ambiente, usar a URL fixa
    if not db_url:
        db_url = "postgres://postgres:Gbu2yD76U38bUU@db.ahvgkqoktbsvepuhhepp.supabase.co:6543/postgres"
    
    return db_url

def execute_sql_file(sql_file_path):
    """Executa um arquivo SQL no banco de dados PostgreSQL."""
    try:
        # Obter a URL do banco de dados
        db_url = get_database_url()
        
        # Conectar ao banco de dados
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Ler o conteúdo do arquivo SQL
        with open(sql_file_path, 'r') as file:
            sql = file.read()
        
        # Executar o SQL
        print(f"Executando arquivo SQL: {sql_file_path}")
        cursor.execute(sql)
        conn.commit()
        
        print("✅ SQL executado com sucesso! A função melhorada de deleção foi instalada.")
        
        # Fechar conexão
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro ao executar o SQL: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    # Caminho para o arquivo SQL
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sql_file_path = os.path.join(current_dir, "improved_dynamic_delete_function.sql")
    
    # Verificar se o arquivo existe
    if not os.path.exists(sql_file_path):
        print(f"❌ Arquivo SQL não encontrado: {sql_file_path}")
        sys.exit(1)
    
    # Executar o SQL
    execute_sql_file(sql_file_path)
    print("\nFunção aprimorada instalada! Agora a tabela de autenticação também será tratada.")
