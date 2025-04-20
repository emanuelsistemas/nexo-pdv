#!/usr/bin/env python3
"""
Script para adicionar campos complementares à tabela de revendas
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração de conexão com Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def add_complementary_fields_to_resellers():
    """Adiciona campos complementares à tabela de revendas"""
    conn = None
    try:
        # Estabelece conexão com o banco de dados Supabase
        print("Conectando ao banco de dados Supabase...")
        conn = psycopg2.connect(DATABASE_URL)
        
        # Define o isolamento da transação
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_READ_COMMITTED)
        
        # Cria cursor
        cur = conn.cursor()
        
        # Verificar e adicionar cada campo novo, um por um, para melhor controle
        print("Verificando e adicionando campos complementares...")

        # 1. Campo website
        cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resellers' AND column_name = 'website');")
        if not cur.fetchone()[0]:
            cur.execute("ALTER TABLE resellers ADD COLUMN website TEXT;")
            print("✅ Campo 'website' adicionado.")
        else:
            print("✓ Campo 'website' já existe.")

        # 2. Campo de horário de atendimento (JSONB para suportar múltiplos dias e horários)
        cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resellers' AND column_name = 'opening_hours');")
        if not cur.fetchone()[0]:
            cur.execute("""
            ALTER TABLE resellers ADD COLUMN opening_hours JSONB DEFAULT '[
                {"day": "Segunda-feira", "open": "09:00", "close": "18:00", "active": true},
                {"day": "Terça-feira", "open": "09:00", "close": "18:00", "active": true},
                {"day": "Quarta-feira", "open": "09:00", "close": "18:00", "active": true},
                {"day": "Quinta-feira", "open": "09:00", "close": "18:00", "active": true},
                {"day": "Sexta-feira", "open": "09:00", "close": "18:00", "active": true},
                {"day": "Sábado", "open": "09:00", "close": "13:00", "active": false},
                {"day": "Domingo", "open": "00:00", "close": "00:00", "active": false}
            ]';
            """)
            print("✅ Campo 'opening_hours' adicionado.")
        else:
            print("✓ Campo 'opening_hours' já existe.")

        # 3. Campo de suporte técnico (JSONB para suportar múltiplos contatos)
        cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resellers' AND column_name = 'tech_support');")
        if not cur.fetchone()[0]:
            cur.execute("ALTER TABLE resellers ADD COLUMN tech_support JSONB DEFAULT '[]';")
            print("✅ Campo 'tech_support' adicionado.")
        else:
            print("✓ Campo 'tech_support' já existe.")

        # 4. Campo comercial (JSONB para suportar múltiplos contatos)
        cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resellers' AND column_name = 'sales_contacts');")
        if not cur.fetchone()[0]:
            cur.execute("ALTER TABLE resellers ADD COLUMN sales_contacts JSONB DEFAULT '[]';")
            print("✅ Campo 'sales_contacts' adicionado.")
        else:
            print("✓ Campo 'sales_contacts' já existe.")

        # 5. Campo administrativo (JSONB para suportar múltiplos contatos)
        cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resellers' AND column_name = 'admin_contacts');")
        if not cur.fetchone()[0]:
            cur.execute("ALTER TABLE resellers ADD COLUMN admin_contacts JSONB DEFAULT '[]';")
            print("✅ Campo 'admin_contacts' adicionado.")
        else:
            print("✓ Campo 'admin_contacts' já existe.")

        # 6. Campo de informações adicionais
        cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resellers' AND column_name = 'additional_info');")
        if not cur.fetchone()[0]:
            cur.execute("ALTER TABLE resellers ADD COLUMN additional_info TEXT;")
            print("✅ Campo 'additional_info' adicionado.")
        else:
            print("✓ Campo 'additional_info' já existe.")

        # Commit das alterações
        conn.commit()
        print("✅ Todos os campos complementares foram adicionados com sucesso!")

        # Verificação final dos campos
        cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'resellers' 
        ORDER BY ordinal_position;
        """)
        
        columns = cur.fetchall()
        print("\nColunas atuais da tabela resellers:")
        for column in columns:
            print(f"- {column[0]} ({column[1]})")
        
    except Exception as e:
        print(f"❌ Erro ao adicionar campos complementares: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            
if __name__ == "__main__":
    add_complementary_fields_to_resellers()
