#!/usr/bin/env python3
"""
Script para atualizar o campo user_pai na tabela companies
utilizando o email do primeiro usuário (profile) associado à empresa
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração de conexão com Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def update_user_pai_field():
    """Atualiza o campo user_pai baseado no primeiro usuário de cada empresa"""
    conn = None
    try:
        # Estabelece conexão com o banco de dados Supabase
        print("Conectando ao banco de dados Supabase...")
        conn = psycopg2.connect(DATABASE_URL)
        
        # Define o isolamento da transação
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
        
        # Cria cursor
        cur = conn.cursor()
        
        print("Iniciando atualização do campo user_pai para todas as empresas...")
        
        # Opção 1: Atualiza com o email do perfil mais antigo associado à empresa
        update_query = """
        UPDATE companies c
        SET user_pai = (
            SELECT p.email
            FROM profiles p
            WHERE p.company_id = c.id
            ORDER BY p.created_at ASC
            LIMIT 1
        )
        WHERE c.user_pai IS NULL OR c.user_pai = '';
        """
        
        cur.execute(update_query)
        affected_rows = cur.rowcount
        
        # Commit das alterações
        conn.commit()
        
        print(f"Atualização concluída. {affected_rows} empresas atualizadas com o email do usuário PAI.")
        
        # Verificar exemplos dos dados atualizados
        print("\nExemplos de empresas com user_pai atualizado:")
        cur.execute("""
        SELECT c.id, c.trade_name, c.user_pai
        FROM companies c
        WHERE c.user_pai IS NOT NULL
        LIMIT 5;
        """)
        
        examples = cur.fetchall()
        for ex in examples:
            print(f"Empresa: {ex[1]}, Usuário PAI: {ex[2]}")
        
    except Exception as e:
        print(f"Erro ao atualizar o campo user_pai: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            
if __name__ == "__main__":
    update_user_pai_field()
