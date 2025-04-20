#!/usr/bin/env python3
"""
Script para corrigir a restrição de chave estrangeira entre companies e resellers
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração de conexão com Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def fix_foreign_key_constraint():
    """Corrige a restrição de chave estrangeira entre companies e resellers"""
    conn = None
    try:
        # Estabelece conexão com o banco de dados Supabase
        print("Conectando ao banco de dados Supabase...")
        conn = psycopg2.connect(DATABASE_URL)
        
        # Define o isolamento da transação
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
        
        # Cria cursor
        cur = conn.cursor()
        
        print("Verificando a restrição de chave estrangeira atual...")
        cur.execute("""
            SELECT
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'companies'
                AND kcu.column_name = 'reseller_id';
        """)
        
        constraint = cur.fetchone()
        if constraint:
            constraint_name = constraint[0]
            print(f"Restrição encontrada: {constraint_name}")
            print(f"Tabela: {constraint[1]}")
            print(f"Coluna: {constraint[2]}")
            print(f"Referencia Tabela: {constraint[3]}")
            print(f"Referencia Coluna: {constraint[4]}")
            
            # Remover a restrição atual
            print(f"Removendo a restrição atual '{constraint_name}'...")
            cur.execute(f"ALTER TABLE companies DROP CONSTRAINT {constraint_name};")
            
            # Adicionar a nova restrição correta
            print("Adicionando a nova restrição correta...")
            cur.execute("""
                ALTER TABLE companies 
                ADD CONSTRAINT companies_reseller_id_fkey 
                FOREIGN KEY (reseller_id) 
                REFERENCES resellers(id);
            """)
            
            # Commit das alterações
            conn.commit()
            
            print("Restrição de chave estrangeira corrigida com sucesso!")
        else:
            print("Nenhuma restrição de chave estrangeira encontrada para 'reseller_id'")
            
            # Adicionar a restrição correta
            print("Adicionando a restrição de chave estrangeira...")
            cur.execute("""
                ALTER TABLE companies 
                ADD CONSTRAINT companies_reseller_id_fkey 
                FOREIGN KEY (reseller_id) 
                REFERENCES resellers(id);
            """)
            
            # Commit das alterações
            conn.commit()
            
            print("Restrição de chave estrangeira adicionada com sucesso!")
        
        # Verificar se a restrição foi corrigida
        print("\nVerificando a nova restrição de chave estrangeira...")
        cur.execute("""
            SELECT
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'companies'
                AND kcu.column_name = 'reseller_id';
        """)
        
        new_constraint = cur.fetchone()
        if new_constraint:
            print(f"Nova restrição: {new_constraint[0]}")
            print(f"Tabela: {new_constraint[1]}")
            print(f"Coluna: {new_constraint[2]}")
            print(f"Referencia Tabela: {new_constraint[3]}")
            print(f"Referencia Coluna: {new_constraint[4]}")
        else:
            print("Erro: A nova restrição não foi encontrada!")
        
    except Exception as e:
        print(f"Erro ao corrigir restrição de chave estrangeira: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    fix_foreign_key_constraint()