#!/usr/bin/env python3
"""
Script para adicionar o campo 'code' à tabela de revendas
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração de conexão com Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def add_code_field_to_resellers():
    """Adiciona o campo 'code' à tabela de revendas"""
    conn = None
    try:
        # Estabelece conexão com o banco de dados Supabase
        print("Conectando ao banco de dados Supabase...")
        conn = psycopg2.connect(DATABASE_URL)
        
        # Define o isolamento da transação
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
        
        # Cria cursor
        cur = conn.cursor()
        
        print("Verificando se o campo 'code' já existe...")
        cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resellers' AND column_name = 'code');")
        code_exists = cur.fetchone()[0]
        
        if code_exists:
            print("O campo 'code' já existe na tabela 'resellers'.")
        else:
            print("Adicionando o campo 'code' à tabela 'resellers'...")
            
            # Adicionar o campo 'code'
            alter_table_sql = """
            ALTER TABLE resellers ADD COLUMN code TEXT UNIQUE;
            
            -- Criar índice para melhorar a performance das consultas por código
            CREATE INDEX IF NOT EXISTS idx_resellers_code ON resellers(code);
            """
            
            # Executa o SQL
            cur.execute(alter_table_sql)
            
            # Commit das alterações
            conn.commit()
            
            print("Campo 'code' adicionado com sucesso!")
        
        # Criar função de verificação e geração de código único
        print("Criando função para gerar código único...")
        create_function_sql = """
        CREATE OR REPLACE FUNCTION generate_unique_reseller_code(length INTEGER DEFAULT 5)
        RETURNS TEXT AS $$
        DECLARE
            chars TEXT := '0123456789';
            result TEXT := '';
            i INTEGER;
            rand_int INTEGER;
            code_exists BOOLEAN;
        BEGIN
            -- Gerar um código aleatório
            FOR i IN 1..length LOOP
                rand_int := floor(random() * length(chars)) + 1;
                result := result || substr(chars, rand_int, 1);
            END LOOP;
            
            -- Verificar se o código já existe
            LOOP
                EXECUTE 'SELECT EXISTS(SELECT 1 FROM resellers WHERE code = $1)' INTO code_exists USING result;
                EXIT WHEN NOT code_exists;
                
                -- Se existe, gerar um novo código
                result := '';
                FOR i IN 1..length LOOP
                    rand_int := floor(random() * length(chars)) + 1;
                    result := result || substr(chars, rand_int, 1);
                END LOOP;
            END LOOP;
            
            RETURN result;
        END;
        $$ LANGUAGE plpgsql;
        """
        
        # Executa o SQL da função
        cur.execute(create_function_sql)
        
        # Commit das alterações
        conn.commit()
        
        print("Função para gerar código único criada com sucesso!")
        
        # Atualizar registros existentes com códigos aleatórios (se houver)
        print("Verificando se existem registros sem código...")
        cur.execute("SELECT COUNT(*) FROM resellers WHERE code IS NULL;")
        null_codes_count = cur.fetchone()[0]
        
        if null_codes_count > 0:
            print(f"Atualizando {null_codes_count} registros sem código...")
            cur.execute("UPDATE resellers SET code = generate_unique_reseller_code() WHERE code IS NULL;")
            conn.commit()
            print("Códigos atualizados com sucesso!")
        else:
            print("Não há registros sem código na tabela.")
        
    except Exception as e:
        print(f"Erro ao adicionar campo 'code': {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            
if __name__ == "__main__":
    add_code_field_to_resellers()
