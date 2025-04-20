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

def apply_complete_function():
    """Aplica a função completa de deleção de empresa"""
    conn = None
    try:
        # Obter a URL do banco de dados
        db_url = get_database_url()
        
        # Conectar ao banco de dados
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Ler o conteúdo do arquivo SQL
        with open('complete_delete_function.sql', 'r') as file:
            sql = file.read()
        
        # Executar o SQL
        print("Aplicando função COMPLETA de deleção...")
        cursor.execute(sql)
        conn.commit()
        
        print("✅ Função de deleção completa instalada com sucesso!")
        print("\nEsta versão da função agora realiza a deleção COMPLETA de:")
        print("- Todos os dados relacionados à empresa")
        print("- Perfis de usuários (profiles)")
        print("- Contas de autenticação (auth.users)")
        print("\nVocê pode testar na interface administrativa.")
        
        # Fechar conexão
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        if conn:
            conn.rollback()
        sys.exit(1)

if __name__ == "__main__":
    apply_complete_function()
