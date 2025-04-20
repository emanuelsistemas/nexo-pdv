#!/usr/bin/env python3
"""
Script para atualizar o campo user_pai em registros existentes da tabela companies
com o email do usuário que criou a empresa.
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configurações de conexão
db_host = os.getenv("DB_HOST")
db_name = os.getenv("DB_NAME")
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")
db_port = os.getenv("DB_PORT", "5432")

def update_user_pai_field():
    """Atualiza o campo user_pai na tabela companies para registros existentes"""
    conn = None
    try:
        # Estabelece conexão com o banco de dados
        conn = psycopg2.connect(
            host=db_host,
            database=db_name,
            user=db_user,
            password=db_password,
            port=db_port
        )
        
        # Define o isolamento da transação
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
        
        # Cria cursor
        cur = conn.cursor()
        
        print("Iniciando atualização do campo user_pai para registros existentes...")
        
        # Query para atualizar o campo user_pai com base no criador (created_by)
        update_query = """
        UPDATE companies c
        SET user_pai = au.email
        FROM auth.users au
        WHERE c.created_by = au.id
        AND c.user_pai IS NULL
        """
        
        cur.execute(update_query)
        affected_rows = cur.rowcount
        
        # Commit das alterações
        conn.commit()
        
        print(f"Atualização concluída. {affected_rows} registros atualizados.")
        
    except Exception as e:
        print(f"Erro ao atualizar o campo user_pai: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            
if __name__ == "__main__":
    update_user_pai_field()
