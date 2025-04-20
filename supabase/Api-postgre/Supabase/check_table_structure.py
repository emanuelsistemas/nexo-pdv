#!/usr/bin/env python3
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json

def get_database_url():
    """Obtém a URL de conexão do banco de dados."""
    # Tenta ler a URL do banco de dados a partir da variável de ambiente
    db_url = os.getenv('DATABASE_URL')
    
    # Se não encontrar a variável de ambiente, tenta ler de um arquivo .env
    if not db_url:
        try:
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL='):
                        db_url = line.split('=', 1)[1].strip()
                        break
        except:
            pass
    
    return db_url

def check_table_structure():
    """
    Verifica a estrutura das tabelas relacionadas à empresa
    
    Returns:
        dict: Informações sobre as tabelas
    """
    conn = None
    try:
        conn = psycopg2.connect(get_database_url(), cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        # Lista de tabelas para verificar
        tables_to_check = [
            "pdv_cashier_movements", "pdv_cashiers", "pdv_configurations",
            "product_stock_movements", "products", "product_groups",
            "product_units", "products_configurations", "profiles", "companies"
        ]
        
        tables_info = {}
        
        for table in tables_to_check:
            print(f"\nInspecionando tabela: {table}")
            
            # Verificar colunas
            cursor.execute(
                """
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = %s
                ORDER BY ordinal_position
                """,
                (table,)
            )
            
            columns = cursor.fetchall()
            
            print(f"Colunas da tabela {table}:")
            for col in columns:
                print(f"  - {col['column_name']} ({col['data_type']})")
            
            tables_info[table] = {"columns": columns}
            
            # Verificar chaves estrangeiras
            cursor.execute(
                """
                SELECT
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM
                    information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                WHERE
                    tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = 'public'
                    AND tc.table_name = %s
                """,
                (table,)
            )
            
            foreign_keys = cursor.fetchall()
            
            if foreign_keys:
                print(f"Chaves estrangeiras da tabela {table}:")
                for fk in foreign_keys:
                    print(f"  - {fk['column_name']} -> {fk['foreign_table_name']}.{fk['foreign_column_name']}")
            
            tables_info[table]["foreign_keys"] = foreign_keys
        
        return {"status": "success", "tables_info": tables_info}
    
    except Exception as e:
        print(f"Erro: {str(e)}")
        return {"status": "error", "message": str(e)}
    
    finally:
        if conn:
            conn.close()
            print("\nConexão com o banco de dados fechada.")

if __name__ == "__main__":
    result = check_table_structure()
    
    if result["status"] == "success":
        print("\nVerificação das tabelas concluída com sucesso!")
