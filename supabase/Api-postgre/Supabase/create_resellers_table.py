#!/usr/bin/env python3
"""
Script para criar a tabela de revendas no banco de dados Supabase
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração de conexão com Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def create_resellers_table():
    """Cria a tabela de revendas no banco de dados Supabase"""
    conn = None
    try:
        # Estabelece conexão com o banco de dados Supabase
        print("Conectando ao banco de dados Supabase...")
        conn = psycopg2.connect(DATABASE_URL)
        
        # Define o isolamento da transação
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
        
        # Cria cursor
        cur = conn.cursor()
        
        print("Iniciando criação da tabela de revendas...")
        
        # SQL para criação da tabela
        create_table_sql = """
        -- Create resellers table
        CREATE TABLE IF NOT EXISTS public.resellers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            document_number TEXT NOT NULL,
            legal_name TEXT NOT NULL,
            trade_name TEXT NOT NULL,
            address_cep TEXT,
            address_street TEXT,
            address_number TEXT,
            address_complement TEXT,
            address_district TEXT,
            address_city TEXT,
            address_state TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create trigger to update updated_at timestamp
        CREATE OR REPLACE FUNCTION update_reseller_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS update_reseller_updated_at ON resellers;
        CREATE TRIGGER update_reseller_updated_at
        BEFORE UPDATE ON resellers
        FOR EACH ROW
        EXECUTE PROCEDURE update_reseller_updated_at();

        -- Create policy for access control
        ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;

        -- Permitir acesso para todos os usuários autenticados (controle será feito na aplicação)
        DROP POLICY IF EXISTS auth_users_all ON public.resellers;
        CREATE POLICY auth_users_all ON public.resellers 
        FOR ALL 
        TO authenticated
        USING (true);
        
        """
        
        # Executa o SQL
        cur.execute(create_table_sql)
        
        # Commit das alterações
        conn.commit()
        
        print("Tabela de revendas criada com sucesso!")
        
        # Verificar se a tabela foi criada
        cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resellers');")
        table_exists = cur.fetchone()[0]
        
        if table_exists:
            print("Verificação: tabela 'resellers' existe.")
            
            # Contar quantas colunas a tabela tem
            cur.execute("SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'resellers';")
            column_count = cur.fetchone()[0]
            print(f"Número de colunas na tabela: {column_count}")
            
            # Listar as colunas
            cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'resellers'
            ORDER BY ordinal_position;
            """)
            
            columns = cur.fetchall()
            print("\nColunas da tabela resellers:")
            for column in columns:
                print(f"- {column[0]} ({column[1]})")
        else:
            print("ERRO: A tabela 'resellers' não foi criada.")
        
    except Exception as e:
        print(f"Erro ao criar tabela de revendas: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            
if __name__ == "__main__":
    create_resellers_table()
