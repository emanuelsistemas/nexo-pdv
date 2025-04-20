#!/usr/bin/env python3
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime

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
                        if db_url.startswith('"') and db_url.endswith('"'):
                            db_url = db_url[1:-1]
                        break
        except:
            pass
    
    return db_url

def check_products_table():
    """
    Verifica a estrutura e relacionamentos da tabela de produtos e 
    identifica possíveis problemas
    """
    conn = None
    try:
        conn = psycopg2.connect(get_database_url(), cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        # Verificar se a tabela products existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name = 'products'
            ) as exists
        """)
        result = cursor.fetchone()
        products_exists = result['exists']
        
        if not products_exists:
            return {
                "status": "error",
                "message": "A tabela 'products' não existe!"
            }
        
        # Verificar a estrutura da tabela products
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'products'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        
        # Verificar as chaves estrangeiras
        cursor.execute("""
            SELECT
                tc.constraint_name,
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
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'products'
        """)
        fk_constraints = cursor.fetchall()
        
        # Verificar índices
        cursor.execute("""
            SELECT
                i.relname AS index_name,
                a.attname AS column_name
            FROM
                pg_class t,
                pg_class i,
                pg_index ix,
                pg_attribute a
            WHERE
                t.oid = ix.indrelid
                AND i.oid = ix.indexrelid
                AND a.attrelid = t.oid
                AND a.attnum = ANY(ix.indkey)
                AND t.relkind = 'r'
                AND t.relname = 'products'
            ORDER BY
                i.relname, a.attnum;
        """)
        indices = cursor.fetchall()
        
        # Verificar contagem de registros
        cursor.execute("SELECT COUNT(*) as count FROM products")
        product_count = cursor.fetchone()['count']
        
        # Verificar registros com problemas (sem company_id ou unit_id)
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM products 
            WHERE company_id IS NULL OR TRIM(COALESCE(company_id::text, '')) = ''
        """)
        null_company_count = cursor.fetchone()['count']
        
        # Verificar se existem registros na tabela product_units
        cursor.execute("SELECT COUNT(*) as count FROM product_units")
        product_units_count = cursor.fetchone()['count']
        
        # Verificar se existem registros na tabela product_groups
        cursor.execute("SELECT COUNT(*) as count FROM product_groups")
        product_groups_count = cursor.fetchone()['count']
        
        # Verificar registros com unit_id que não existem na tabela product_units
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM products p
            LEFT JOIN product_units u ON p.unit_id = u.id
            WHERE p.unit_id IS NOT NULL AND u.id IS NULL
        """)
        invalid_unit_id_count = cursor.fetchone()['count']

        # Verificar registros com group_id que não existem na tabela product_groups
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM products p
            LEFT JOIN product_groups g ON p.group_id = g.id
            WHERE p.group_id IS NOT NULL AND g.id IS NULL
        """)
        invalid_group_id_count = cursor.fetchone()['count']
        
        # Verificar políticas RLS
        cursor.execute("""
            SELECT 
                polname as policy_name,
                polcmd as command,
                polqual::text as using_expression,
                polwithcheck::text as with_check_expression
            FROM 
                pg_policy
            WHERE 
                polrelid = 'products'::regclass
        """)
        rls_policies = cursor.fetchall()
        
        # Verificar se RLS está habilitado
        cursor.execute("""
            SELECT 
                relname, 
                relrowsecurity
            FROM 
                pg_class
            WHERE 
                relname = 'products'
        """)
        rls_enabled = cursor.fetchone()['relrowsecurity']
        
        # Verificar se há problemas com as unidades
        cursor.execute("""
            SELECT unit_id, COUNT(*) as count
            FROM products
            GROUP BY unit_id
            ORDER BY count DESC
            LIMIT 10
        """)
        unit_distribution = cursor.fetchall()
        
        # Verificar schema das tabelas relacionadas (product_units, product_groups)
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'product_units'
            ORDER BY ordinal_position
        """)
        product_units_columns = cursor.fetchall()
        
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'product_groups'
            ORDER BY ordinal_position
        """)
        product_groups_columns = cursor.fetchall()
        
        # Verificar se há problemas com chaves estrangeiras específicas
        cursor.execute("""
            SELECT conname, conrelid::regclass, confrelid::regclass
            FROM pg_constraint
            WHERE contype = 'f' AND
                (conrelid = 'products'::regclass OR
                 confrelid = 'products'::regclass)
        """)
        fk_relations = cursor.fetchall()
        
        # Verificar se há unidades ou grupos sem produtos associados
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM product_units u
            LEFT JOIN products p ON u.id = p.unit_id
            WHERE p.id IS NULL
        """)
        orphaned_units = cursor.fetchone()['count']
        
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM product_groups g
            LEFT JOIN products p ON g.id = p.group_id
            WHERE p.id IS NULL
        """)
        orphaned_groups = cursor.fetchone()['count']
        
        # Verificar se há algum problema de integridade referencial
        cursor.execute("""
            SELECT conname, conrelid::regclass, confrelid::regclass,
                   confkey, pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE contype = 'f' AND conrelid = 'products'::regclass
        """)
        constraint_details = cursor.fetchall()
        
        # Amostra dos primeiros produtos (para diagnóstico)
        cursor.execute("""
            SELECT id, code, name, company_id, unit_id, group_id, status
            FROM products
            LIMIT 5
        """)
        sample_products = cursor.fetchall()
        
        # Verificar se há produtos sem empresa associada
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM products p
            LEFT JOIN companies c ON p.company_id = c.id
            WHERE c.id IS NULL
        """)
        products_without_company = cursor.fetchone()['count']

        # Verificar relações entre perfis, empresas e produtos
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM profiles p
            JOIN companies c ON p.company_id = c.id
            JOIN products pr ON c.id = pr.company_id
        """)
        valid_product_company_profile_count = cursor.fetchone()['count']
        
        # Verificar se há perfis sem empresa
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM profiles
            WHERE company_id IS NULL
        """)
        profiles_without_company = cursor.fetchone()['count']
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "table_exists": products_exists,
            "columns": [dict(col) for col in columns],
            "foreign_keys": [dict(fk) for fk in fk_constraints],
            "indices": [dict(idx) for idx in indices],
            "rls_enabled": rls_enabled,
            "rls_policies": [dict(policy) for policy in rls_policies],
            "fk_relationships": [dict(rel) for rel in fk_relations],
            "constraint_details": [dict(c) for c in constraint_details],
            "counts": {
                "products": product_count,
                "product_units": product_units_count,
                "product_groups": product_groups_count,
                "null_company_id": null_company_count,
                "invalid_unit_id": invalid_unit_id_count,
                "invalid_group_id": invalid_group_id_count,
                "orphaned_units": orphaned_units,
                "orphaned_groups": orphaned_groups,
                "products_without_company": products_without_company,
                "profiles_without_company": profiles_without_company,
                "valid_product_company_profile_relations": valid_product_company_profile_count
            },
            "unit_distribution": [dict(ud) for ud in unit_distribution],
            "related_tables": {
                "product_units": [dict(col) for col in product_units_columns],
                "product_groups": [dict(col) for col in product_groups_columns]
            },
            "sample_products": [dict(p) for p in sample_products]
        }
    
    except Exception as e:
        print(f"Erro ao analisar tabela produtos: {str(e)}")
        return {"status": "error", "message": str(e)}
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    result = check_products_table()
    
    print("\nAnálise da tabela products:")
    print(json.dumps(result, indent=2, default=str))
    
    # Salvar resultado em um arquivo para análise posterior
    try:
        with open('products_table_analysis.json', 'w') as f:
            json.dump(result, f, indent=2, default=str)
        print("\nResultado salvo em 'products_table_analysis.json'")
    except Exception as e:
        print(f"\nErro ao salvar resultado: {str(e)}")
    
    # Análise de problemas potenciais
    if result["status"] == "success":
        problems = []
        
        if not result["table_exists"]:
            problems.append("A tabela 'products' não existe!")
        
        if result["counts"]["products"] == 0:
            problems.append("A tabela de produtos está vazia!")
        
        if result["counts"]["null_company_id"] > 0:
            problems.append(f"{result['counts']['null_company_id']} produtos com company_id NULL ou vazio!")
        
        if result["counts"]["invalid_unit_id"] > 0:
            problems.append(f"{result['counts']['invalid_unit_id']} produtos com unit_id inválido (não existe na tabela product_units)!")
            
        if result["counts"]["invalid_group_id"] > 0:
            problems.append(f"{result['counts']['invalid_group_id']} produtos com group_id inválido (não existe na tabela product_groups)!")
        
        if result["counts"]["products_without_company"] > 0:
            problems.append(f"{result['counts']['products_without_company']} produtos referenciando empresas que não existem!")
        
        if result["counts"]["profiles_without_company"] > 0:
            problems.append(f"{result['counts']['profiles_without_company']} perfis sem empresa associada!")
        
        if not result["rls_enabled"]:
            problems.append("RLS não está habilitado na tabela products!")
        
        if len(result["rls_policies"]) == 0:
            problems.append("Não há políticas RLS definidas para a tabela products!")
        
        print("\nPossíveis problemas identificados:")
        if problems:
            for i, problem in enumerate(problems, 1):
                print(f"{i}. {problem}")
            
            print("\nRecomendações:")
            if result["counts"]["null_company_id"] > 0:
                print("- Corrigir produtos com company_id NULL ou vazio")
            if result["counts"]["invalid_unit_id"] > 0:
                print("- Corrigir produtos com unit_id inválido")
            if result["counts"]["invalid_group_id"] > 0:
                print("- Corrigir produtos com group_id inválido")
            if result["counts"]["products_without_company"] > 0:
                print("- Remover produtos que referenciam empresas inexistentes")
            if not result["rls_enabled"] or len(result["rls_policies"]) == 0:
                print("- Verificar e corrigir configurações de RLS na tabela products")
        else:
            print("Nenhum problema identificado na estrutura da tabela!")