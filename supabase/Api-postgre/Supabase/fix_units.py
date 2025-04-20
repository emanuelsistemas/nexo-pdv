#!/usr/bin/env python3
"""
Script para consertar o problema de unidades no sistema Nexo PDV.
Este script sincroniza as unidades do sistema com a tabela product_units
e corrige os produtos existentes.
"""

from config import get_db_connection
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def copy_system_units_to_product_units():
    """
    Copia todas as unidades da tabela system_units para product_units
    para cada empresa no sistema.
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. Obter todas as empresas
        cursor.execute("SELECT id FROM companies")
        companies = cursor.fetchall()
        logging.info(f"Encontradas {len(companies)} empresas")
        
        # 2. Obter todas as unidades do sistema
        cursor.execute("SELECT * FROM system_units")
        system_units = cursor.fetchall()
        logging.info(f"Encontradas {len(system_units)} unidades de sistema")
        
        if not system_units:
            logging.warning("Nenhuma unidade do sistema encontrada")
            return
        
        # Para cada empresa
        for company in companies:
            company_id = company['id']
            logging.info(f"Processando empresa ID: {company_id}")
            
            # 3. Verificar se a empresa já tem unidades
            cursor.execute(
                "SELECT COUNT(*) as unit_count FROM product_units WHERE company_id = %s",
                (company_id,)
            )
            unit_count = cursor.fetchone()['unit_count']
            
            if unit_count > 0:
                logging.info(f"Empresa {company_id} já possui {unit_count} unidades")
                continue
            
            # 4. Copiar unidades do sistema para a empresa
            for unit in system_units:
                new_id = uuid.uuid4()
                cursor.execute(
                    """
                    INSERT INTO product_units 
                    (id, company_id, code, name, description) 
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        new_id,
                        company_id,
                        unit['code'],
                        unit['name'],
                        unit['description']
                    )
                )
            
            conn.commit()
            logging.info(f"Copiadas {len(system_units)} unidades para a empresa {company_id}")
            
            # 5. Verificar inserção
            cursor.execute(
                "SELECT COUNT(*) as unit_count FROM product_units WHERE company_id = %s",
                (company_id,)
            )
            new_unit_count = cursor.fetchone()['unit_count']
            logging.info(f"Empresa {company_id} agora possui {new_unit_count} unidades")
    
    except Exception as e:
        conn.rollback()
        logging.error(f"Erro ao copiar unidades: {str(e)}")
    finally:
        cursor.close()
        conn.close()

def fix_product_units():
    """
    Corrige os produtos que têm unit_id NULL, 
    associando-os à unidade 'UN' (Unidade) da empresa.
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. Obter todos os produtos com unit_id NULL
        cursor.execute("SELECT id, name, company_id FROM products WHERE unit_id IS NULL")
        products = cursor.fetchall()
        logging.info(f"Encontrados {len(products)} produtos sem unidade")
        
        if not products:
            logging.info("Nenhum produto encontrado sem unidade")
            return
        
        # Para cada produto sem unidade
        for product in products:
            product_id = product['id']
            company_id = product['company_id']
            
            # 2. Buscar a unidade 'UN' (Unidade) dessa empresa
            cursor.execute(
                """
                SELECT id FROM product_units 
                WHERE company_id = %s AND (code = 'UN' OR code = 'Un')
                """,
                (company_id,)
            )
            unit = cursor.fetchone()
            
            if not unit:
                logging.warning(f"Unidade UN não encontrada para empresa {company_id}")
                
                # Se não encontrar UN, pegar a primeira unidade disponível para a empresa
                cursor.execute(
                    "SELECT id FROM product_units WHERE company_id = %s LIMIT 1",
                    (company_id,)
                )
                unit = cursor.fetchone()
                
                if not unit:
                    logging.error(f"Nenhuma unidade encontrada para empresa {company_id}")
                    continue
            
            unit_id = unit['id']
            
            # 3. Atualizar o produto com a unidade apropriada
            cursor.execute(
                "UPDATE products SET unit_id = %s WHERE id = %s",
                (unit_id, product_id)
            )
            logging.info(f"Produto {product['name']} (ID: {product_id}) atualizado com unit_id = {unit_id}")
        
        conn.commit()
        logging.info(f"Corrigidos {len(products)} produtos")
    
    except Exception as e:
        conn.rollback()
        logging.error(f"Erro ao corrigir produtos: {str(e)}")
    finally:
        cursor.close()
        conn.close()

def print_system_stats():
    """
    Imprime estatísticas do sistema para diagnóstico
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Stats sobre unidades do sistema
        cursor.execute("SELECT COUNT(*) as count FROM system_units")
        system_units_count = cursor.fetchone()['count']
        logging.info(f"Total de unidades do sistema: {system_units_count}")
        
        # Stats sobre unidades de empresas
        cursor.execute("SELECT COUNT(*) as count FROM product_units")
        product_units_count = cursor.fetchone()['count']
        logging.info(f"Total de unidades de empresas: {product_units_count}")
        
        # Stats sobre empresas
        cursor.execute("SELECT COUNT(*) as count FROM companies")
        companies_count = cursor.fetchone()['count']
        logging.info(f"Total de empresas: {companies_count}")
        
        # Stats sobre produtos
        cursor.execute("SELECT COUNT(*) as count FROM products")
        products_count = cursor.fetchone()['count']
        logging.info(f"Total de produtos: {products_count}")
        
        # Stats sobre produtos sem unidade
        cursor.execute("SELECT COUNT(*) as count FROM products WHERE unit_id IS NULL")
        null_unit_products_count = cursor.fetchone()['count']
        logging.info(f"Produtos sem unidade: {null_unit_products_count}")
        
        # Detalhes das unidades do sistema
        cursor.execute("SELECT id, code, name FROM system_units")
        system_units = cursor.fetchall()
        if system_units:
            logging.info("Unidades do sistema:")
            for unit in system_units:
                logging.info(f"  - {unit['code']}: {unit['name']} (ID: {unit['id']})")
        
        # Detalhes dos produtos com problema
        if null_unit_products_count > 0:
            cursor.execute("SELECT id, name FROM products WHERE unit_id IS NULL LIMIT 5")
            problem_products = cursor.fetchall()
            logging.info("Exemplos de produtos sem unidade:")
            for product in problem_products:
                logging.info(f"  - {product['name']} (ID: {product['id']})")
    
    except Exception as e:
        logging.error(f"Erro ao obter estatísticas: {str(e)}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    logging.info("=== Iniciando sincronização de unidades ===")
    print_system_stats()
    copy_system_units_to_product_units()
    fix_product_units()
    logging.info("=== Estatísticas após correção ===")
    print_system_stats()
    logging.info("=== Processo concluído ===")
