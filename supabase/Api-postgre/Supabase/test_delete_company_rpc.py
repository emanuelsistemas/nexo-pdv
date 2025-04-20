#!/usr/bin/env python3
import psycopg2
import os
import sys

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
                        break
        except:
            pass
    
    return db_url

def test_delete_company():
    """
    Testa a deleção da empresa VALESIS INFORMATICA usando a função RPC
    """
    company_id = "c8af77b7-6761-460b-a26f-481e2b980173"  # ID da VALESIS INFORMATICA
    
    print(f"Testando deleção da empresa VALESIS INFORMATICA (ID: {company_id})")
    print("Método: Chamada direta à função RPC do banco de dados")
    
    conn = None
    try:
        # Conectar ao banco de dados
        conn = psycopg2.connect(get_database_url())
        cursor = conn.cursor()
        
        # Iniciar uma transação
        conn.autocommit = False
        
        # Chamar a função RPC
        print("\nChamando a função RPC 'delete_company_and_related_data'...")
        cursor.execute(
            "SELECT delete_company_and_related_data(%s)",
            (company_id,)
        )
        
        # Verificar se a empresa ainda existe
        cursor.execute(
            "SELECT EXISTS(SELECT 1 FROM companies WHERE id = %s) as exists",
            (company_id,)
        )
        result = cursor.fetchone()
        company_exists = result[0] if result else True
        
        if not company_exists:
            print("✅ Sucesso! A empresa foi removida com sucesso.")
            # Confirmar a transação
            conn.commit()
        else:
            print("❌ Falha! A empresa ainda existe no banco de dados.")
            # Desfazer a transação
            conn.rollback()
        
    except Exception as e:
        print(f"❌ Erro durante a deleção: {str(e)}")
        if conn:
            conn.rollback()
        return False
    
    finally:
        if conn:
            conn.close()
            print("Conexão com o banco de dados fechada.")
    
    return not company_exists

if __name__ == "__main__":
    success = test_delete_company()
    sys.exit(0 if success else 1)
