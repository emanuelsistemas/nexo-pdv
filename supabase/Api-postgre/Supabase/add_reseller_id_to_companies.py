#!/usr/bin/env python3
"""
Script para adicionar o campo reseller_id à tabela companies
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração de conexão com Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def add_reseller_id_to_companies():
    """Adiciona o campo reseller_id à tabela companies e cria o índice"""
    conn = None
    try:
        # Estabelece conexão com o banco de dados Supabase
        print("Conectando ao banco de dados Supabase...")
        conn = psycopg2.connect(DATABASE_URL)
        
        # Define o isolamento da transação
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
        
        # Cria cursor
        cur = conn.cursor()
        
        print("Verificando se o campo 'reseller_id' já existe...")
        cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'reseller_id');")
        reseller_id_exists = cur.fetchone()[0]
        
        if reseller_id_exists:
            print("O campo 'reseller_id' já existe na tabela 'companies'.")
        else:
            print("Adicionando o campo 'reseller_id' à tabela 'companies'...")
            
            # Adicionar o campo 'reseller_id'
            alter_table_sql = """
            -- Adicionar campo reseller_id à tabela companies
            ALTER TABLE companies ADD COLUMN reseller_id UUID REFERENCES resellers(id);
            
            -- Adicionar índice para melhorar performance de consultas
            CREATE INDEX IF NOT EXISTS idx_companies_reseller_id ON companies(reseller_id);
            
            -- Adicionar comentário explicativo
            COMMENT ON COLUMN companies.reseller_id IS 'ID da revenda associada à empresa';
            """
            
            # Executa o SQL
            cur.execute(alter_table_sql)
            
            # Commit das alterações
            conn.commit()
            
            print("Campo 'reseller_id' adicionado com sucesso à tabela 'companies'!")
        
    except Exception as e:
        print(f"Erro ao adicionar campo 'reseller_id': {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            
if __name__ == "__main__":
    add_reseller_id_to_companies()
