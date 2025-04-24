#!/usr/bin/env python3
"""
Script para criar a função RPC que insere uma revenda com código único
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração de conexão com Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def create_insert_reseller_function():
    """Cria a função RPC para inserir uma revenda com código único"""
    conn = None
    try:
        # Estabelece conexão com o banco de dados Supabase
        print("Conectando ao banco de dados Supabase...")
        conn = psycopg2.connect(DATABASE_URL)
        
        # Define o isolamento da transação
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
        
        # Cria cursor
        cur = conn.cursor()
        
        print("Criando função RPC para inserir revenda com código único...")
        
        # Criar a função RPC
        create_function_sql = """
        CREATE OR REPLACE FUNCTION insert_reseller_with_code(
            p_trade_name TEXT,
            p_legal_name TEXT,
            p_document_number TEXT,
            p_address_cep TEXT DEFAULT NULL,
            p_address_street TEXT DEFAULT NULL,
            p_address_number TEXT DEFAULT NULL,
            p_address_complement TEXT DEFAULT NULL,
            p_address_district TEXT DEFAULT NULL,
            p_address_city TEXT DEFAULT NULL,
            p_address_state TEXT DEFAULT NULL,
            p_status TEXT DEFAULT 'active'
        )
        RETURNS VOID
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            v_code TEXT;
        BEGIN
            -- Gerar código único
            v_code := generate_unique_reseller_code();
            
            -- Inserir nova revenda com o código gerado
            INSERT INTO resellers (
                trade_name,
                legal_name,
                document_number,
                address_cep,
                address_street,
                address_number,
                address_complement,
                address_district,
                address_city,
                address_state,
                status,
                code
            ) VALUES (
                p_trade_name,
                p_legal_name,
                p_document_number,
                p_address_cep,
                p_address_street,
                p_address_number,
                p_address_complement,
                p_address_district,
                p_address_city,
                p_address_state,
                p_status,
                v_code
            );
        END;
        $$;
        """
        
        # Executa o SQL
        cur.execute(create_function_sql)
        
        # Commit das alterações
        conn.commit()
        
        print("Função RPC para inserir revenda com código único criada com sucesso!")
        
        # Verificar se a função foi criada
        cur.execute("SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_reseller_with_code');")
        function_exists = cur.fetchone()[0]
        
        if function_exists:
            print("Verificação: função 'insert_reseller_with_code' existe.")
        else:
            print("ERRO: A função 'insert_reseller_with_code' não foi criada.")
        
    except Exception as e:
        print(f"Erro ao criar função RPC: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            
if __name__ == "__main__":
    create_insert_reseller_function()
