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

def check_tables_exist():
    """
    Verifica quais tabelas realmente existem no banco de dados
    
    Returns:
        dict: Lista de tabelas existentes e não existentes
    """
    # Lista de tabelas para verificar
    tables_to_check = [
        "sales_items", "sales_payments", "sales",
        "budget_items", "budgets", "customers",
        "pdv_cashier_movements", "pdv_cashiers", "pdv_configurations",
        "product_images", "product_stock_movements", "products",
        "product_groups", "product_units", "products_configurations",
        "system_configurations", "notifications", "activity_logs",
        "profiles", "companies"
    ]
    
    conn = None
    try:
        conn = psycopg2.connect(get_database_url(), cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        existing_tables = []
        non_existing_tables = []
        
        for table in tables_to_check:
            cursor.execute(
                """
                SELECT EXISTS (
                   SELECT FROM information_schema.tables 
                   WHERE table_schema = 'public'
                   AND table_name = %s
                ) as exists
                """,
                (table,)
            )
            
            result = cursor.fetchone()
            if result and result['exists']:
                existing_tables.append(table)
            else:
                non_existing_tables.append(table)
        
        print(f"Tabelas existentes ({len(existing_tables)}):")
        for table in existing_tables:
            print(f"  - {table}")
        
        print(f"\nTabelas não existentes ({len(non_existing_tables)}):")
        for table in non_existing_tables:
            print(f"  - {table}")
        
        # Verificar tabelas que referenciam companies
        cursor.execute(
            """
            SELECT tc.table_schema, tc.table_name, kcu.column_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu 
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'companies'
            ORDER BY tc.table_schema, tc.table_name;
            """
        )
        related_tables = cursor.fetchall()
        
        print(f"\nTabelas que referenciam 'companies' ({len(related_tables)}):")
        for table in related_tables:
            print(f"  - {table['table_schema']}.{table['table_name']} ({table['column_name']})")
        
        return {
            "status": "success",
            "existing_tables": existing_tables,
            "non_existing_tables": non_existing_tables,
            "related_tables": related_tables
        }
    
    except Exception as e:
        print(f"Erro: {str(e)}")
        return {"status": "error", "message": str(e)}
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    result = check_tables_exist()
    
    print("\nResultado completo:")
    print(json.dumps(result, indent=2))
