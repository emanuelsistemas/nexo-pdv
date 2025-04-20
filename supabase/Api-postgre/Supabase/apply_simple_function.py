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

def apply_simple_function():
    """Aplica a função simplificada de deleção de empresa"""
    conn = None
    try:
        # Obter a URL do banco de dados
        db_url = get_database_url()
        
        # Conectar ao banco de dados
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Ler o conteúdo do arquivo SQL
        with open('simple_delete_function.sql', 'r') as file:
            sql = file.read()
        
        # Executar o SQL
        print("Aplicando função simplificada de deleção...")
        cursor.execute(sql)
        conn.commit()
        
        print("✅ Função simplificada instalada com sucesso!")
        
        # Testar a função
        company_id = "7979a667-c775-4199-8dce-063d5932aa45"  # ID da VALESIS
        
        print(f"\nTestando a deleção da empresa (ID: {company_id})...")
        cursor.execute("SET client_min_messages TO notice")  # Para ver os logs
        cursor.execute("SELECT delete_company_and_related_data(%s)", (company_id,))
        result = cursor.fetchone()
        
        print(f"Resultado da deleção: {result[0]}")
        
        # Verificar se a empresa foi realmente removida
        cursor.execute("SELECT EXISTS(SELECT 1 FROM companies WHERE id = %s)", (company_id,))
        exists = cursor.fetchone()[0]
        
        if exists:
            print("❌ FALHA: A empresa ainda existe no banco de dados!")
        else:
            print("✅ SUCESSO: A empresa foi removida com sucesso!")
        
        conn.commit()
        
        # Fechar conexão
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        if conn:
            conn.rollback()
        sys.exit(1)

if __name__ == "__main__":
    apply_simple_function()
