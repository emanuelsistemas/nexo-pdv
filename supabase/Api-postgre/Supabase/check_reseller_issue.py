#!/usr/bin/env python3
"""
Script para verificar a estrutura das tabelas resellers e companies
e verificar se existe o registro com código 20053
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração de conexão com Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def check_table_structure(table_name):
    """Verifica a estrutura de uma tabela específica"""
    conn = None
    try:
        # Conectar ao banco de dados
        print(f"\n--- Estrutura da tabela '{table_name}' ---")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Consulta para obter informações sobre as colunas da tabela
        cursor.execute(f"""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        for col in columns:
            print(f"Coluna: {col['column_name']}, Tipo: {col['data_type']}, Nullable: {col['is_nullable']}")
        
    except Exception as e:
        print(f"Erro ao verificar estrutura da tabela: {e}")
    finally:
        if conn:
            conn.close()

def check_reseller_by_code(code):
    """Verifica se existe um revendedor com o código especificado"""
    conn = None
    try:
        # Conectar ao banco de dados
        print(f"\n--- Verificando revendedor com código '{code}' ---")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Consulta para buscar o revendedor pelo código
        cursor.execute(f"""
            SELECT id, code, trade_name, legal_name, document_number, status
            FROM resellers
            WHERE code = '{code}';
        """)
        
        reseller = cursor.fetchone()
        if reseller:
            print("Revendedor encontrado:")
            for key, value in reseller.items():
                print(f"{key}: {value}")
            return reseller
        else:
            print(f"Nenhum revendedor encontrado com o código '{code}'")
            return None
        
    except Exception as e:
        print(f"Erro ao verificar revendedor: {e}")
        return None
    finally:
        if conn:
            conn.close()

def check_companies_with_reseller(reseller_id):
    """Verifica se existem empresas vinculadas ao revendedor especificado"""
    conn = None
    try:
        # Conectar ao banco de dados
        print(f"\n--- Verificando empresas vinculadas ao revendedor '{reseller_id}' ---")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Consulta para buscar empresas vinculadas ao revendedor
        cursor.execute(f"""
            SELECT id, trade_name, document_number, reseller_id
            FROM companies
            WHERE reseller_id = '{reseller_id}';
        """)
        
        companies = cursor.fetchall()
        if companies:
            print(f"Encontradas {len(companies)} empresas vinculadas ao revendedor:")
            for company in companies:
                print(f"ID: {company['id']}, Nome: {company['trade_name']}")
        else:
            print("Nenhuma empresa vinculada a este revendedor")
        
    except Exception as e:
        print(f"Erro ao verificar empresas: {e}")
    finally:
        if conn:
            conn.close()

def check_foreign_key_constraint():
    """Verifica a restrição de chave estrangeira entre companies e resellers"""
    conn = None
    try:
        # Conectar ao banco de dados
        print("\n--- Verificando restrição de chave estrangeira ---")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Consulta para verificar a restrição de chave estrangeira
        cursor.execute("""
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
        
        constraints = cursor.fetchall()
        if constraints:
            for constraint in constraints:
                print(f"Restrição: {constraint['constraint_name']}")
                print(f"Tabela: {constraint['table_name']}")
                print(f"Coluna: {constraint['column_name']}")
                print(f"Referencia Tabela: {constraint['foreign_table_name']}")
                print(f"Referencia Coluna: {constraint['foreign_column_name']}")
        else:
            print("Nenhuma restrição de chave estrangeira encontrada")
        
    except Exception as e:
        print(f"Erro ao verificar restrição de chave estrangeira: {e}")
    finally:
        if conn:
            conn.close()

def main():
    """Função principal"""
    print("Iniciando verificação das tabelas e dados...")
    
    # Verificar estrutura das tabelas
    check_table_structure('resellers')
    check_table_structure('companies')
    
    # Verificar restrição de chave estrangeira
    check_foreign_key_constraint()
    
    # Verificar revendedor com código 20053
    reseller = check_reseller_by_code('20053')
    
    # Se encontrou o revendedor, verificar empresas vinculadas
    if reseller:
        check_companies_with_reseller(reseller['id'])
    
    # Verificar revendedor padrão (código 58105)
    default_reseller = check_reseller_by_code('58105')
    
    # Se encontrou o revendedor padrão, verificar empresas vinculadas
    if default_reseller:
        check_companies_with_reseller(default_reseller['id'])
    
    print("\nVerificação concluída!")

if __name__ == "__main__":
    main()