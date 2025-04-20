#!/usr/bin/env python3
import os
import psycopg2
import sys

def get_database_url():
    """Obtém a URL de conexão do banco de dados."""
    # Tenta ler a URL do banco de dados a partir da variável de ambiente
    db_url = os.getenv('DATABASE_URL')
    
    # Se não encontrar a variável de ambiente, usar a URL fixa
    if not db_url:
        db_url = "postgres://postgres:Gbu2yD76U38bUU@db.ahvgkqoktbsvepuhhepp.supabase.co:6543/postgres"
    
    return db_url

def apply_fixed_function():
    """Aplica a função corrigida de deleção de empresa"""
    conn = None
    try:
        # Obter a URL do banco de dados
        db_url = get_database_url()
        
        # Conectar ao banco de dados
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Ler o conteúdo do arquivo SQL
        with open('fixed_simple_function.sql', 'r') as file:
            sql = file.read()
        
        # Executar o SQL
        print("Aplicando função corrigida de deleção...")
        cursor.execute(sql)
        conn.commit()
        
        print("✅ Função corrigida instalada com sucesso!")
        
        # Testar a função
        company_id = "7979a667-c775-4199-8dce-063d5932aa45"  # ID da VALESIS
        
        # Verificar se a empresa existe antes de testar
        cursor.execute("SELECT trade_name FROM companies WHERE id = %s", (company_id,))
        company = cursor.fetchone()
        
        if not company:
            print("⚠️ Empresa não encontrada! Procurando outra empresa para teste...")
            
            # Procurar outra empresa para teste
            cursor.execute("SELECT id, trade_name FROM companies LIMIT 1")
            new_company = cursor.fetchone()
            
            if new_company:
                company_id = new_company[0]
                print(f"Usando empresa: {new_company[1]} (ID: {company_id})")
            else:
                print("❌ Nenhuma empresa encontrada para teste!")
                return
        else:
            print(f"Empresa encontrada: {company[0]} (ID: {company_id})")
        
        print(f"\nTestando a deleção da empresa...")
        cursor.execute("SET client_min_messages TO notice")  # Para ver os logs
        
        # Usar uma transação para poder reverter se necessário
        cursor.execute("BEGIN")
        
        try:
            cursor.execute("SELECT delete_company_and_related_data(%s)", (company_id,))
            
            # Verificar se a empresa foi realmente removida
            cursor.execute("SELECT EXISTS(SELECT 1 FROM companies WHERE id = %s)", (company_id,))
            exists = cursor.fetchone()[0]
            
            if exists:
                print("❌ FALHA: A empresa ainda existe no banco de dados após a deleção!")
                cursor.execute("ROLLBACK")  # Reverter as alterações
            else:
                print("✅ SUCESSO: A empresa foi removida com sucesso!")
                print("🔄 Revertendo a transação para não afetar o banco de dados de produção...")
                cursor.execute("ROLLBACK")  # Reverter as alterações para testes
                print("As alterações foram revertidas, a empresa ainda está no banco de dados.")
                print("\nA função está funcionando corretamente!\n")
                print("Para aplicar permanentemente na interface administrativa, você pode:")
                print("1. Testar diretamente na interface")
                print("2. Usar esta mesma função em produção")
                
        except Exception as e:
            print(f"❌ Erro durante o teste: {str(e)}")
            cursor.execute("ROLLBACK")
        
        # Fechar conexão
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        if conn:
            conn.rollback()
        sys.exit(1)

if __name__ == "__main__":
    apply_fixed_function()
