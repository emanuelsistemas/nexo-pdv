import psycopg2
import json
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Obter a string de conexão do banco de dados
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    # String de conexão padrão para desenvolvimento local
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"

def add_ibge_code_to_companies():
    """
    Adiciona o campo de código do IBGE do município à tabela companies.
    Este campo é obrigatório para emissão de NF-e/NFC-e.
    """
    try:
        # Conectar ao banco de dados
        connection = psycopg2.connect(DATABASE_URL)
        cursor = connection.cursor()

        # Verificar se o campo já existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'companies' 
                AND column_name = 'address_city_code'
            );
        """)

        field_exists = cursor.fetchone()[0]

        if not field_exists:
            # Adicionar o campo à tabela companies
            cursor.execute("""
                ALTER TABLE companies 
                ADD COLUMN address_city_code VARCHAR(7);
                
                COMMENT ON COLUMN companies.address_city_code IS 'Código do IBGE do município (obrigatório para NF-e/NFC-e)';
            """)

            connection.commit()
            result = {
                "status": "success",
                "message": "Campo de código do IBGE adicionado à tabela companies"
            }
        else:
            result = {
                "status": "info",
                "message": "Campo de código do IBGE já existe na tabela companies"
            }

        # Verificar se o campo na tabela nfe_destinatario é o código do IBGE
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'nfe_destinatario' 
                AND column_name = 'endereco_municipio_codigo'
            );
        """)

        dest_field_exists = cursor.fetchone()[0]

        if dest_field_exists:
            # Adicionar comentário ao campo para clarificar
            cursor.execute("""
                COMMENT ON COLUMN nfe_destinatario.endereco_municipio_codigo IS 'Código do IBGE do município (obrigatório para NF-e/NFC-e)';
            """)
            
            connection.commit()
            result["message"] += " e comentário adicionado ao campo endereco_municipio_codigo na tabela nfe_destinatario"
        
    except Exception as e:
        print(f"Erro ao adicionar campo: {e}")
        result = {
            "status": "error",
            "message": str(e)
        }
        if connection:
            connection.rollback()
    finally:
        if connection:
            cursor.close()
            connection.close()

    return result

if __name__ == "__main__":
    # Executar a adição do campo
    result = add_ibge_code_to_companies()
    print(json.dumps(result, indent=2))
