#!/usr/bin/env python3
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json

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

def find_company(company_name):
    """
    Busca uma empresa pelo nome
    
    Args:
        company_name: Nome da empresa a buscar
    
    Returns:
        dict: Informações da empresa
    """
    conn = None
    try:
        conn = psycopg2.connect(get_database_url(), cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        print(f"Buscando empresa com nome parecido com: {company_name}")
        cursor.execute(
            "SELECT id, trade_name, document_number FROM companies WHERE trade_name ILIKE %s",
            (f"%{company_name}%",)
        )
        
        companies = cursor.fetchall()
        
        if not companies:
            return {"status": "error", "message": f"Nenhuma empresa encontrada com nome parecido com '{company_name}'"}
        
        print(f"Empresas encontradas: {len(companies)}")
        for company in companies:
            print(f"- ID: {company['id']}, Nome: {company['trade_name']}, CNPJ/CPF: {company['document_number']}")
        
        return {"status": "success", "companies": companies}
    
    except Exception as e:
        print(f"Erro: {str(e)}")
        return {"status": "error", "message": str(e)}
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    result = find_company("VALESIS")
    print("\nResultado:")
    print(json.dumps(result, indent=2))
