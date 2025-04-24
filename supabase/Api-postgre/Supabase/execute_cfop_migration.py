#!/usr/bin/env python3
import os
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente do arquivo .env se existir
load_dotenv()

# Obtém a string de conexão do ambiente ou usa um valor padrão
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("AVISO: Variável DATABASE_URL não encontrada. Verifique suas variáveis de ambiente.")
    exit(1)

# Caminho para o arquivo SQL com as migrações
sql_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                          "migrations", "metodo_agora_nfce.sql")

print(f"Executando migração do arquivo: {sql_file_path}")

# Lê o conteúdo do arquivo SQL
with open(sql_file_path, 'r', encoding='utf-8') as file:
    sql_commands = file.read()

# Conecta ao banco de dados
conn = None
try:
    # Conecta ao banco de dados PostgreSQL
    conn = psycopg2.connect(DATABASE_URL)
    
    # Cria um cursor
    cursor = conn.cursor()
    
    # Executa os comandos SQL
    cursor.execute(sql_commands)
    
    # Commit das alterações
    conn.commit()
    
    print("Migração executada com sucesso!")
    
except Exception as e:
    print(f"Erro ao executar a migração: {e}")
    if conn:
        conn.rollback()
finally:
    # Fecha a conexão
    if conn:
        cursor.close()
        conn.close()
        print("Conexão com o banco de dados fechada.")
