#!/usr/bin/env python3
"""
Script para verificar a relação entre profiles e companies no Supabase
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração de conexão com Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def check_profiles_companies_relation():
    """Verifica a relação entre profiles e companies"""
    conn = None
    try:
        # Estabelece conexão com o banco de dados Supabase
        print("Conectando ao banco de dados Supabase...")
        conn = psycopg2.connect(DATABASE_URL)
        
        # Cria cursor
        cur = conn.cursor()
        
        # Verifica o esquema da tabela profiles
        print("Verificando esquema da tabela profiles...")
        cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'profiles'
        ORDER BY ordinal_position;
        """)
        
        columns = cur.fetchall()
        print("\nColunas da tabela profiles:")
        for column in columns:
            print(f"- {column[0]} ({column[1]})")
        
        # Verifica se existe o campo company_id na tabela profiles
        print("\nVerificando se existe relação com company_id na tabela profiles...")
        cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'company_id';
        """)
        
        company_id_column = cur.fetchall()
        if company_id_column:
            print("Campo company_id encontrado na tabela profiles!")
            
            # Verifica algumas linhas para entender a relação
            print("\nExemplo de relação (primeiras 5 linhas):")
            cur.execute("""
            SELECT p.id, p.email, p.company_id, c.trade_name 
            FROM profiles p 
            JOIN companies c ON p.company_id = c.id 
            LIMIT 5;
            """)
            
            sample_data = cur.fetchall()
            for row in sample_data:
                print(f"Profile ID: {row[0]}, Email: {row[1]}, Company ID: {row[2]}, Company Name: {row[3]}")
        else:
            print("Campo company_id NÃO encontrado na tabela profiles.")
            
        # Verificar a consulta original usada no AdminDashboard
        print("\nTestando a consulta original do AdminDashboard:")
        try:
            cur.execute("""
            SELECT c.*, p.email as admin_email
            FROM companies c
            INNER JOIN profiles p ON p.id = c.id
            LIMIT 5;
            """)
            
            query_result = cur.fetchall()
            print(f"Consulta original retornou {len(query_result)} resultados")
            
        except Exception as e:
            print(f"Erro na consulta original: {e}")
            
        # Verificar a existência da coluna owner_id
        print("\nVerificando se owner_id é uma coluna válida em companies:")
        cur.execute("""
        SELECT COUNT(*) 
        FROM companies 
        WHERE owner_id IS NOT NULL;
        """)
        
        owner_id_count = cur.fetchone()
        if owner_id_count and owner_id_count[0] > 0:
            print(f"Coluna owner_id tem {owner_id_count[0]} valores não nulos")
            
            # Verificar como owner_id se relaciona com auth.users
            print("\nTestando relação entre owner_id e auth.users:")
            try:
                cur.execute("""
                SELECT c.id, c.trade_name, c.owner_id, u.email
                FROM companies c
                JOIN auth.users u ON c.owner_id = u.id
                LIMIT 5;
                """)
                
                relation_result = cur.fetchall()
                print(f"Consulta de relação retornou {len(relation_result)} resultados")
                for row in relation_result:
                    print(f"Company: {row[1]}, Owner ID: {row[2]}, Email: {row[3]}")
                    
            except Exception as e:
                print(f"Erro na consulta de relação: {e}")
        else:
            print("Coluna owner_id não tem valores ou não existe")
            
    except Exception as e:
        print(f"Erro ao verificar relação: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            
if __name__ == "__main__":
    check_profiles_companies_relation()
