#!/usr/bin/env python3
"""
Script para verificar o esquema da tabela companies no Supabase
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração de conexão com Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def check_table_schema():
    """Verifica o esquema da tabela companies"""
    conn = None
    try:
        # Estabelece conexão com o banco de dados Supabase
        print("Conectando ao banco de dados Supabase...")
        conn = psycopg2.connect(DATABASE_URL)
        
        # Cria cursor
        cur = conn.cursor()
        
        # Verifica as colunas da tabela companies
        print("Verificando esquema da tabela companies...")
        cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'companies'
        ORDER BY ordinal_position;
        """)
        
        columns = cur.fetchall()
        print("\nColunas da tabela companies:")
        for column in columns:
            print(f"- {column[0]} ({column[1]})")
        
        # Verifica se existe alguma coluna que possa referenciar o usuário
        print("\nProcurando colunas possíveis de referência ao usuário criador...")
        cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name LIKE '%user%' OR column_name LIKE '%created%' OR column_name LIKE '%owner%' OR column_name LIKE '%auth%'
        """)
        
        user_columns = cur.fetchall()
        if user_columns:
            print("Possíveis colunas de referência ao usuário:")
            for column in user_columns:
                print(f"- {column[0]}")
        else:
            print("Nenhuma coluna com referência clara ao usuário criador encontrada.")
            
        # Verifica as chaves estrangeiras
        print("\nVerificando referências a auth.users ou profiles...")
        cur.execute("""
        SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'companies';
        """)
        
        fk_constraints = cur.fetchall()
        if fk_constraints:
            print("Chaves estrangeiras encontradas:")
            for fk in fk_constraints:
                print(f"- Coluna: {fk[1]} -> Referencia: {fk[2]}.{fk[3]}")
        else:
            print("Nenhuma chave estrangeira encontrada na tabela companies.")
            
    except Exception as e:
        print(f"Erro ao verificar esquema da tabela: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            
if __name__ == "__main__":
    check_table_schema()
