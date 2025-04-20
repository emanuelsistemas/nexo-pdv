#!/usr/bin/env python3
import sys
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from config import get_db_connection
import traceback

def print_step(step_name):
    """Imprime o nome da etapa de uma forma visível"""
    print(f"\n{'=' * 50}")
    print(f"ETAPA: {step_name}")
    print(f"{'=' * 50}")

def delete_company(company_id):
    """
    Deleta uma empresa e todos os seus dados relacionados
    
    Args:
        company_id: UUID da empresa a ser deletada
    
    Returns:
        dict: Resultado da operação com status e mensagem
    """
    # Lista de tabelas em ordem de deleção para verificar contra violações de chave estrangeira
    # Essa lista será usada para verificar se alguma tabela não foi tratada no processo
    conn = None
    try:
        print_step("Iniciando conexão com o banco de dados")
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Obter informações da empresa para registro
        print_step(f"Verificando empresa {company_id}")
        cursor.execute(
            "SELECT trade_name, document_number FROM companies WHERE id = %s",
            (company_id,)
        )
        company_info = cursor.fetchone()
        
        if not company_info:
            return {"status": "error", "message": f"Empresa com ID {company_id} não encontrada"}
        
        company_name = company_info['trade_name']
        document = company_info['document_number']
        
        print(f"Empresa encontrada: {company_name} ({document})")
        print("Iniciando processo de exclusão por etapas...")
        
        # Iniciar uma transação
        cursor.execute("BEGIN")
        
        # Coletar IDs de usuários relacionados
        print_step("1. Identificando usuários relacionados")
        cursor.execute(
            "SELECT ARRAY_AGG(id) as user_ids FROM profiles WHERE company_id = %s",
            (company_id,)
        )
        result = cursor.fetchone()
        user_ids = result['user_ids'] if result and result['user_ids'] else []
        print(f"Usuários encontrados: {len(user_ids) if user_ids else 0}")
        
        # Verificar e listar tabelas que referenciam a empresa
        print_step("Verificando tabelas relacionadas")
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
            AND tc.table_schema != 'auth'
            ORDER BY tc.table_schema, tc.table_name;
            """
        )
        related_tables = cursor.fetchall()
        
        print(f"Tabelas relacionadas à empresa encontradas: {len(related_tables)}")
        for table in related_tables:
            print(f"  - {table['table_schema']}.{table['table_name']} ({table['column_name']})")
        
        # 1. Deletar dados de vendas e orçamentos
        print_step("2. Removendo vendas e orçamentos")
        
        print("2.1 Removendo itens de vendas")
        cursor.execute(
            """
            DELETE FROM sales_items 
            WHERE sales_id IN (SELECT id FROM sales WHERE company_id = %s)
            RETURNING count(*) as count
            """,
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Itens de vendas removidos: {count}")
        
        print("2.2 Removendo pagamentos de vendas")
        cursor.execute(
            """
            DELETE FROM sales_payments 
            WHERE sales_id IN (SELECT id FROM sales WHERE company_id = %s)
            RETURNING count(*) as count
            """,
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Pagamentos de vendas removidos: {count}")
        
        print("2.3 Removendo vendas")
        cursor.execute(
            "DELETE FROM sales WHERE company_id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Vendas removidas: {count}")
        
        print("2.4 Removendo itens de orçamentos")
        cursor.execute(
            """
            DELETE FROM budget_items 
            WHERE budget_id IN (SELECT id FROM budgets WHERE company_id = %s)
            RETURNING count(*) as count
            """,
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Itens de orçamentos removidos: {count}")
        
        print("2.5 Removendo orçamentos")
        cursor.execute(
            "DELETE FROM budgets WHERE company_id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Orçamentos removidos: {count}")
        
        # 2. Deletar dados de clientes
        print_step("3. Removendo clientes")
        cursor.execute(
            "DELETE FROM customers WHERE company_id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Clientes removidos: {count}")
        
        # 3. Deletar configurações e PDV
        print_step("4. Removendo dados do PDV")
        
        print("4.1 Removendo movimentos de caixa")
        cursor.execute(
            """
            DELETE FROM pdv_cashier_movements 
            WHERE pdv_cashier_id IN (SELECT id FROM pdv_cashiers WHERE company_id = %s)
            RETURNING count(*) as count
            """,
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Movimentos de caixa removidos: {count}")
        
        print("4.2 Removendo caixas")
        cursor.execute(
            "DELETE FROM pdv_cashiers WHERE company_id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Caixas removidos: {count}")
        
        print("4.3 Removendo configurações do PDV")
        cursor.execute(
            "DELETE FROM pdv_configurations WHERE company_id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Configurações do PDV removidas: {count}")
        
        # 4. Deletar dados de produtos e estoque
        print_step("5. Removendo produtos e estoque")
        
        print("5.1 Removendo imagens de produtos")
        cursor.execute(
            """
            DELETE FROM product_images
            WHERE product_id IN (SELECT id FROM products WHERE company_id = %s)
            RETURNING count(*) as count
            """,
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Imagens de produtos removidas: {count}")
        
        print("5.2 Removendo movimentos de estoque")
        cursor.execute(
            "DELETE FROM product_stock_movements WHERE company_id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Movimentos de estoque removidos: {count}")
        
        print("5.3 Removendo produtos")
        cursor.execute(
            "DELETE FROM products WHERE company_id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Produtos removidos: {count}")
        
        print("5.4 Removendo grupos de produtos")
        cursor.execute(
            "DELETE FROM product_groups WHERE company_id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Grupos de produtos removidos: {count}")
        
        print("5.5 Removendo unidades de produtos")
        cursor.execute(
            "DELETE FROM product_units WHERE company_id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Unidades de produtos removidas: {count}")
        
        print("5.6 Removendo configurações de produtos")
        cursor.execute(
            "DELETE FROM products_configurations WHERE company_id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Configurações de produtos removidas: {count}")
        
        # 5. Deletar quaisquer outras configurações específicas da empresa
        print_step("6. Removendo configurações do sistema")
        cursor.execute(
            "DELETE FROM system_configurations WHERE company_id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Configurações do sistema removidas: {count}")
        
        # 6. Deletar perfis associados à empresa
        print_step("7. Removendo perfis de usuários")
        cursor.execute(
            "DELETE FROM profiles WHERE company_id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Perfis de usuários removidos: {count}")
        
        # Verificar se existem tabelas relacionadas que não foram explicitamente tratadas
        print_step("8. Verificando se há tabelas adicionais")
        cursor.execute(
            """
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%_configurations' 
            AND table_name NOT IN ('pdv_configurations', 'products_configurations', 'system_configurations')
            """
        )
        additional_config_tables = cursor.fetchall()
        
        for table in additional_config_tables:
            table_name = table['table_name']
            print(f"Removendo dados da tabela adicional: {table_name}")
            try:
                cursor.execute(
                    f"DELETE FROM {table_name} WHERE company_id = %s RETURNING count(*) as count",
                    (company_id,)
                )
                count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
                print(f"Registros removidos de {table_name}: {count}")
            except Exception as e:
                print(f"Erro ao deletar dados de {table_name}: {str(e)}")
        
        # Verificar novas tabelas conhecidas que não estavam no script original
        print("8.1 Verificando tabelas de notificações")
        try:
            cursor.execute(
                "DELETE FROM notifications WHERE company_id = %s RETURNING count(*) as count",
                (company_id,)
            )
            count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
            print(f"Notificações removidas: {count}")
        except Exception as e:
            print(f"Tabela de notificações não encontrada ou erro: {str(e)}")
            
        print("8.2 Verificando tabelas de logs")
        try:
            cursor.execute(
                "DELETE FROM activity_logs WHERE company_id = %s RETURNING count(*) as count",
                (company_id,)
            )
            count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
            print(f"Logs de atividades removidos: {count}")
        except Exception as e:
            print(f"Tabela de logs não encontrada ou erro: {str(e)}")
            
        # Tentar limpar qualquer tabela restante com company_id
        print("8.3 Tentativa final de limpeza")
        cursor.execute(
            """
            SELECT tc.table_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.constraint_column_usage AS ccu 
            ON tc.constraint_name = ccu.constraint_name 
            JOIN information_schema.key_column_usage AS kcu 
            ON kcu.constraint_name = tc.constraint_name 
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'companies' 
            AND kcu.column_name = 'company_id'
            AND tc.table_schema = 'public'
            """
        )
        remaining_tables = cursor.fetchall()
        
        for table in remaining_tables:
            table_name = table['table_name']
            if table_name not in ['profiles']:
                try:
                    print(f"Tentando remover dados de: {table_name}")
                    cursor.execute(
                        f"DELETE FROM {table_name} WHERE company_id = %s RETURNING count(*) as count",
                        (company_id,)
                    )
                    count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
                    print(f"Registros removidos de {table_name}: {count}")
                except Exception as e:
                    print(f"Não foi possível remover {table_name}: {str(e)}")
        
        # 9. Agora sim, deletar a empresa
        print_step("9. Removendo a empresa")
        cursor.execute(
            "DELETE FROM companies WHERE id = %s RETURNING count(*) as count",
            (company_id,)
        )
        count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
        print(f"Empresa removida: {count}")
        
        # 10. Deletar usuários do auth.users que não têm mais perfis
        if user_ids:
            print_step("9. Removendo usuários sem perfis")
            
            # Identifica quais usuários não têm mais perfis
            cursor.execute(
                """
                WITH remaining_users AS (
                    SELECT unnest(%s::uuid[]) AS user_id
                    EXCEPT
                    SELECT id FROM profiles
                )
                SELECT array_agg(user_id) as users_to_delete FROM remaining_users
                """,
                (user_ids,)
            )
            
            result = cursor.fetchone()
            users_to_delete = result['users_to_delete'] if result and result['users_to_delete'] else []
            
            if users_to_delete:
                cursor.execute(
                    "DELETE FROM auth.users WHERE id = ANY(%s) RETURNING count(*) as count",
                    (users_to_delete,)
                )
                count = cursor.fetchone()['count'] if cursor.rowcount > 0 else 0
                print(f"Usuários removidos do sistema de autenticação: {count}")
            else:
                print("Nenhum usuário sem perfil para remover")
        
        # Commit da transação
        conn.commit()
        print_step("EXCLUSÃO CONCLUÍDA COM SUCESSO")
        print("Processo concluído. Todas as tabelas relacionadas à empresa foram limpas.")
        return {
            "status": "success", 
            "message": f"Empresa '{company_name}' e todos os dados relacionados foram excluídos com sucesso"
        }
    
    except Exception as e:
        if conn:
            conn.rollback()
        print_step("ERRO NA EXCLUSÃO")
        error_details = traceback.format_exc()
        print(f"Erro: {str(e)}")
        print(error_details)
        return {"status": "error", "message": str(e), "details": error_details}
    
    finally:
        if conn:
            conn.close()
            print("Conexão com banco de dados fechada.")

if __name__ == "__main__":
    # Se executado diretamente, aceita o ID da empresa como argumento
    if len(sys.argv) != 2:
        print("Uso: python delete_company.py <company_id>")
        sys.exit(1)
    
    company_id = sys.argv[1]
    result = delete_company(company_id)
    print(json.dumps(result, indent=2))
