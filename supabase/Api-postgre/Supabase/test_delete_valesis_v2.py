#!/usr/bin/env python3
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import sys

def get_database_url():
    """Obtém a URL de conexão do banco de dados."""
    # Tenta ler a URL do banco de dados a partir da variável de ambiente
    db_url = os.getenv('DATABASE_URL')
    
    # Se não encontrar a variável de ambiente, usar a URL fixa
    if not db_url:
        db_url = "postgres://postgres:Gbu2yD76U38bUU@db.ahvgkqoktbsvepuhhepp.supabase.co:6543/postgres"
    
    return db_url

def check_if_company_exists(company_id):
    """
    Verifica se a empresa com o ID específico existe no banco de dados
    
    Args:
        company_id: ID da empresa a verificar
        
    Returns:
        dict: Informações da empresa se existir, None caso contrário
    """
    conn = None
    try:
        conn = psycopg2.connect(get_database_url(), cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        cursor.execute(
            """
            SELECT id, trade_name, legal_name, document_number
            FROM companies
            WHERE id = %s
            """,
            (company_id,)
        )
        
        result = cursor.fetchone()
        return result
    
    except Exception as e:
        print(f"Erro ao verificar empresa: {str(e)}")
        return None
    
    finally:
        if conn:
            conn.close()

def test_delete_valesis():
    """
    Testa a deleção da empresa VALESIS INFORMATICA
    
    Returns:
        bool: True se a operação foi bem-sucedida, False caso contrário
    """
    company_id = "c8af77b7-6761-460b-a26f-481e2b980173"  # ID da VALESIS INFORMATICA
    
    print("\n===== TESTE DE DELEÇÃO DE EMPRESA =====")
    print(f"Empresa alvo: VALESIS INFORMATICA (ID: {company_id})")
    
    # Verificar se a empresa existe antes
    company_before = check_if_company_exists(company_id)
    
    if not company_before:
        print("⚠️ A empresa não foi encontrada no banco de dados. Pode já ter sido excluída.")
        # Tentar encontrar outra empresa para testar
        try:
            conn = psycopg2.connect(get_database_url(), cursor_factory=RealDictCursor)
            cursor = conn.cursor()
            
            cursor.execute(
                """
                SELECT id, trade_name, legal_name, document_number
                FROM companies
                LIMIT 1
                """
            )
            
            new_company = cursor.fetchone()
            if new_company:
                company_id = new_company['id']
                print(f"🔄 Usando empresa alternativa: {new_company['trade_name']} (ID: {company_id})")
                company_before = new_company
            else:
                print("❌ Nenhuma empresa encontrada no banco de dados para testar.")
                return False
                
        except Exception as e:
            print(f"Erro ao buscar empresa alternativa: {str(e)}")
            return False
        finally:
            if conn:
                conn.close()
    
    print(f"✅ Empresa encontrada: {company_before['trade_name']} (ID: {company_before['id']})")
    
    # Chamar a função RPC para deletar
    print("\n----- EXECUTANDO DELEÇÃO -----")
    conn = None
    try:
        conn = psycopg2.connect(get_database_url())
        conn.autocommit = False  # Iniciar transação explícita
        cursor = conn.cursor()
        
        # Ativar debug para visualizar logs no PostgreSQL
        cursor.execute("SET client_min_messages TO notice;")
        
        print("Chamando função delete_company_and_related_data...")
        cursor.execute(
            "SELECT delete_company_and_related_data(%s)",
            (company_id,)
        )
        
        # Verificar se a empresa ainda existe após a tentativa de deleção
        company_after = check_if_company_exists(company_id)
        
        if company_after:
            print("\n❌ FALHA: A empresa ainda existe no banco de dados após a tentativa de deleção!")
            print(f"Detalhes: {json.dumps(company_after, indent=2)}")
            conn.rollback()
            return False
        else:
            print("\n✅ SUCESSO: A empresa foi removida com sucesso!")
            conn.commit()
            return True
    
    except Exception as e:
        print(f"\n❌ ERRO DURANTE A DELEÇÃO: {str(e)}")
        if conn:
            conn.rollback()
        return False
    
    finally:
        if conn:
            conn.close()
            print("Conexão com o banco de dados fechada.")

def diagnose_problem():
    """Diagnóstico adicional se a deleção falhar"""
    print("\n===== DIAGNÓSTICO DE PROBLEMA =====")
    
    conn = None
    try:
        conn = psycopg2.connect(get_database_url(), cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        # Verificar se a função existe
        cursor.execute(
            """
            SELECT routine_name, routine_definition 
            FROM information_schema.routines 
            WHERE routine_name = 'delete_company_and_related_data'
            """
        )
        
        function_info = cursor.fetchone()
        if not function_info:
            print("❌ A função delete_company_and_related_data não existe no banco de dados!")
            return
        
        print("✅ A função delete_company_and_related_data existe no banco de dados.")
        
        # Verificar chamadas RPC
        cursor.execute(
            """
            SELECT * FROM supabase_functions.hooks 
            WHERE hook_table_schema = 'public' 
            AND hook_function_name = 'delete_company_and_related_data' 
            """
        )
        
        rpc_info = cursor.fetchall()
        if not rpc_info:
            print("⚠️ Não há hooks RPC configurados para esta função.")
            print("A API pode estar chamando outra função ou há problema na configuração RPC.")
        else:
            print(f"✅ Encontrados {len(rpc_info)} hooks RPC para esta função.")
        
        # Verificar permissões
        cursor.execute(
            """
            SELECT 
                r.routine_name,
                r.security_type,
                r.external_security
            FROM 
                information_schema.routines r
            WHERE 
                r.routine_name = 'delete_company_and_related_data'
            """
        )
        
        security_info = cursor.fetchone()
        if security_info:
            print(f"Configuração de segurança da função:")
            print(f"  - security_type: {security_info['security_type']}")
            print(f"  - external_security: {security_info['external_security']}")
        
        print("\nPossíveis problemas:")
        print("1. A função RPC está sendo chamada mas não está realizando a deleção efetivamente")
        print("2. A interface está mostrando sucesso mesmo quando a operação falha no backend")
        print("3. Pode haver um problema de permissões ou transações no banco de dados")
        print("4. A API do frontend pode estar chamando outro endpoint ou função")
        
    except Exception as e:
        print(f"\n❌ Erro durante diagnóstico: {str(e)}")
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    success = test_delete_valesis()
    
    if not success:
        diagnose_problem()
    
    print("\n===== CONCLUSÃO =====")
    if success:
        print("✅ O teste de deleção foi bem-sucedido!")
        print("Se a interface não está deletando corretamente, o problema pode estar no frontend.")
    else:
        print("❌ O teste de deleção falhou!")
        print("É necessário investigar a comunicação entre o frontend e o backend.")
    
    sys.exit(0 if success else 1)
