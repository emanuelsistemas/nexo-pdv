#!/usr/bin/env python3
"""
Script para adicionar o campo user_pai à tabela companies e criar trigger relacionado
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração de conexão com Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def add_user_pai_field():
    """Adiciona o campo user_pai à tabela companies e cria trigger"""
    conn = None
    try:
        # Estabelece conexão com o banco de dados Supabase
        print("Conectando ao banco de dados Supabase...")
        conn = psycopg2.connect(DATABASE_URL)
        
        # Define o isolamento da transação
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
        
        # Cria cursor
        cur = conn.cursor()
        
        print("Iniciando criação do campo user_pai e trigger relacionado...")
        
        # Adiciona o campo à tabela companies
        cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS user_pai TEXT;")
        
        # Cria a função para o trigger
        trigger_function = """
        CREATE OR REPLACE FUNCTION set_user_pai_on_insert()
        RETURNS TRIGGER AS $$
        DECLARE
            user_email TEXT;
        BEGIN
            -- Get the user email from auth.users table
            SELECT email INTO user_email
            FROM auth.users
            WHERE id = NEW.created_by;
            
            -- Update the user_pai field with the email
            NEW.user_pai = user_email;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        """
        cur.execute(trigger_function)
        
        # Cria o trigger
        trigger_creation = """
        DROP TRIGGER IF EXISTS set_user_pai_trigger ON companies;
        CREATE TRIGGER set_user_pai_trigger
        BEFORE INSERT ON companies
        FOR EACH ROW
        EXECUTE FUNCTION set_user_pai_on_insert();
        """
        cur.execute(trigger_creation)
        
        # Commit das alterações
        conn.commit()
        
        print("Campo user_pai e trigger criados com sucesso!")
        
        # Atualiza registros existentes
        update_query = """
        UPDATE companies c
        SET user_pai = au.email
        FROM auth.users au
        WHERE c.created_by = au.id
        AND c.user_pai IS NULL
        """
        
        cur.execute(update_query)
        affected_rows = cur.rowcount
        conn.commit()
        
        print(f"Registros existentes atualizados: {affected_rows} registros modificados.")
        
    except Exception as e:
        print(f"Erro ao criar campo user_pai: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            
if __name__ == "__main__":
    add_user_pai_field()
