#!/usr/bin/env python3
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import sys
import json

def get_database_url():
    """Obtém a URL de conexão do banco de dados."""
    # Tenta ler a URL do banco de dados a partir da variável de ambiente
    db_url = os.getenv('DATABASE_URL')
    
    # Se não encontrar a variável de ambiente, usar a URL fixa
    if not db_url:
        db_url = "postgres://postgres:Gbu2yD76U38bUU@db.ahvgkqoktbsvepuhhepp.supabase.co:6543/postgres"
    
    return db_url

def debug_function():
    """Depura a função de deleção de empresa"""
    company_id = "7979a667-c775-4199-8dce-063d5932aa45"  # ID da VALESIS INFORMATICA encontrado
    
    print("\n===== DIAGNÓSTICO DA FUNÇÃO DE DELEÇÃO =====")
    
    conn = None
    try:
        conn = psycopg2.connect(get_database_url(), cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        # Verificar se a empresa existe
        cursor.execute(
            """
            SELECT id, trade_name, legal_name, document_number 
            FROM companies 
            WHERE id = %s
            """,
            (company_id,)
        )
        
        company = cursor.fetchone()
        if company:
            print(f"✅ Empresa encontrada: {company['trade_name']} (ID: {company['id']})")
        else:
            print(f"❌ Empresa não encontrada no banco de dados.")
            return False
        
        # Verificar detalhes da função
        cursor.execute(
            """
            SELECT 
                p.proname AS function_name,
                pg_get_function_arguments(p.oid) AS arguments,
                CASE 
                    WHEN p.prosecdef THEN 'SECURITY DEFINER'
                    ELSE 'SECURITY INVOKER'
                END AS security,
                l.lanname AS language,
                p.provolatile AS volatility
            FROM pg_proc p
            JOIN pg_language l ON p.prolang = l.oid
            WHERE p.proname = 'delete_company_and_related_data'
            """
        )
        
        function_details = cursor.fetchone()
        if function_details:
            print("\n----- DETALHES DA FUNÇÃO -----")
            print(f"Nome: {function_details['function_name']}")
            print(f"Argumentos: {function_details['arguments']}")
            print(f"Segurança: {function_details['security']}")
            print(f"Linguagem: {function_details['language']}")
            print(f"Volatilidade: {function_details['volatility']}")
        else:
            print("❌ Função não encontrada no banco de dados!")
            return False
        
        # Verificar contexto de execução
        cursor.execute("SELECT current_user, session_user, current_schema")
        context = cursor.fetchone()
        print("\n----- CONTEXTO DE EXECUÇÃO -----")
        print(f"Usuário atual: {context['current_user']}")
        print(f"Usuário da sessão: {context['session_user']}")
        print(f"Esquema atual: {context['current_schema']}")
        
        # Testar a função com depuração ativada
        print("\n----- TESTE DE EXECUÇÃO COM DEBUG -----")
        
        # Ativar logging
        cursor.execute("SET client_min_messages TO DEBUG")
        
        # Capturar logs durante a execução
        try:
            print(f"Tentando excluir empresa {company_id}...")
            cursor.execute("BEGIN")  # Iniciar transação explícita
            cursor.execute(
                """
                SELECT delete_company_and_related_data(%s)
                """, 
                (company_id,)
            )
            
            # Verificar se a empresa ainda existe após a tentativa de deleção
            cursor.execute(
                """
                SELECT EXISTS(SELECT 1 FROM companies WHERE id = %s) as exists
                """,
                (company_id,)
            )
            result = cursor.fetchone()
            
            if result and result['exists']:
                print("❌ A empresa ainda existe após a tentativa de deleção!")
                cursor.execute("ROLLBACK")  # Desfazer transação
            else:
                print("✅ A empresa foi excluída com sucesso!")
                cursor.execute("COMMIT")  # Confirmar transação
                return True
            
        except Exception as e:
            print(f"❌ Erro durante a execução da função: {str(e)}")
            cursor.execute("ROLLBACK")  # Desfazer transação em caso de erro
        
        # Verificar as permissões no banco de dados
        print("\n----- VERIFICAÇÃO DE PERMISSÕES -----")
        try:
            cursor.execute(
                """
                SELECT grantee, privilege_type 
                FROM information_schema.table_privileges
                WHERE table_name = 'companies'
                ORDER BY grantee, privilege_type
                """
            )
            
            permissions = cursor.fetchall()
            print(f"Permissões na tabela companies:")
            for perm in permissions:
                print(f"  - {perm['grantee']}: {perm['privilege_type']}")
        except Exception as e:
            print(f"Erro ao verificar permissões: {str(e)}")
        
        # Verificar se há outra função com nome similar
        print("\n----- VERIFICAÇÃO DE FUNÇÕES SIMILARES -----")
        cursor.execute(
            """
            SELECT 
                p.proname AS function_name,
                pg_get_function_arguments(p.oid) AS arguments,
                n.nspname AS schema
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname LIKE '%delete%company%'
            """
        )
        
        similar_functions = cursor.fetchall()
        if similar_functions:
            print(f"Funções similares encontradas: {len(similar_functions)}")
            for func in similar_functions:
                print(f"  - {func['schema']}.{func['function_name']}({func['arguments']})")
        else:
            print("Nenhuma função similar encontrada.")
        
        # Testar uma operação de deleção direta
        print("\n----- TESTE DE DELEÇÃO DIRETA -----")
        print("Tentando operação de DELETE direta na tabela...")
        
        try:
            # Tentar deletar algum registro relacionado como teste
            cursor.execute("BEGIN")  # Iniciar transação
            
            cursor.execute(
                """
                SELECT EXISTS (
                    SELECT 1 FROM products WHERE company_id = %s LIMIT 1
                ) as has_products
                """,
                (company_id,)
            )
            
            has_products = cursor.fetchone()['has_products']
            
            if has_products:
                print("Produtos encontrados. Tentando deletar um produto...")
                cursor.execute(
                    """
                    DELETE FROM products 
                    WHERE company_id = %s 
                    RETURNING id
                    """,
                    (company_id,)
                )
                deleted = cursor.fetchone()
                if deleted:
                    print(f"✅ Operação DELETE direta bem-sucedida! Produto {deleted['id']} removido.")
                else:
                    print("❌ Operação DELETE direta falhou - nenhum produto removido.")
            else:
                print("Não há produtos para esta empresa. Verificando outro tipo de registro...")
                # Tentar outra tabela
                cursor.execute(
                    """
                    SELECT EXISTS (
                        SELECT 1 FROM pdv_configurations WHERE company_id = %s LIMIT 1
                    ) as has_config
                    """,
                    (company_id,)
                )
                
                has_config = cursor.fetchone()['has_config']
                
                if has_config:
                    cursor.execute(
                        """
                        DELETE FROM pdv_configurations
                        WHERE company_id = %s
                        RETURNING id
                        """,
                        (company_id,)
                    )
                    deleted = cursor.fetchone()
                    if deleted:
                        print(f"✅ Operação DELETE direta bem-sucedida! Configuração {deleted['id']} removida.")
                    else:
                        print("❌ Operação DELETE direta falhou - nenhuma configuração removida.")
                else:
                    print("Não há registros relacionados encontrados para testar deleção.")
            
            cursor.execute("ROLLBACK")  # Desfazer testes de deleção
            
        except Exception as e:
            cursor.execute("ROLLBACK")  # Garantir que a transação é desfeita
            print(f"❌ Erro ao tentar operação DELETE direta: {str(e)}")
        
        print("\n----- CONCLUSÃO DIAGNÓSTICO -----")
        print("Principais problemas possíveis:")
        print("1. Permissões insuficientes para o usuário que executa a função")
        print("2. A função está com defeito em sua lógica interna")
        print("3. Possível problema relacionado a SECURITY DEFINER vs INVOKER")
        print("4. Transações não estão sendo confirmadas corretamente")
        print("5. Pode haver triggers bloqueando a deleção")
        
        # Recomendar solução
        print("\n----- RECOMENDAÇÕES -----")
        print("1. Verificar a definição completa da função e possíveis erros")
        print("2. Verificar se há triggers que podem estar interferindo")
        print("3. Tentar atualizar a função com um código mais simples para teste")
        print("4. Verificar logs do banco de dados para erros detalhados")
        
    except Exception as e:
        print(f"\n❌ Erro durante diagnóstico: {str(e)}")
        return False
    
    finally:
        if conn:
            conn.close()
            print("\nConexão com o banco de dados fechada.")
    
    return False

if __name__ == "__main__":
    success = debug_function()
    sys.exit(0 if success else 1)
