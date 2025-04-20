import psycopg2
import json
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timedelta

# Carregar variáveis de ambiente
load_dotenv()

# Obter a string de conexão do banco de dados
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    # String de conexão padrão para desenvolvimento local
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"

def create_barcode_reservations_table():
    """
    Cria a tabela product_barcode_reservations para gerenciar reservas de códigos de barras por empresa.
    Esta tabela permite que o sistema reserve códigos de barras únicos para cada empresa,
    evitando conflitos com códigos de produto.
    """
    try:
        # Conectar ao banco de dados
        connection = psycopg2.connect(DATABASE_URL)
        cursor = connection.cursor()
        
        # Verificar se a tabela já existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename = 'product_barcode_reservations'
            );
        """)
        
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            # Criar a tabela product_barcode_reservations com suporte para multi-empresa
            cursor.execute("""
                CREATE TABLE product_barcode_reservations (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    company_id UUID NOT NULL REFERENCES companies(id),
                    barcode VARCHAR(255) NOT NULL,
                    user_id UUID NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 minutes')
                );
                
                -- Índice para busca rápida de códigos de barras por empresa
                CREATE INDEX idx_barcode_reservations_company ON 
                    product_barcode_reservations(company_id, barcode);
            """)
            
            # Criar função para verificar se um código de barras está disponível
            cursor.execute("""
                CREATE OR REPLACE FUNCTION is_barcode_available(p_company_id UUID, p_barcode VARCHAR)
                RETURNS BOOLEAN AS $$
                DECLARE
                    product_exists BOOLEAN;
                    barcode_reserved BOOLEAN;
                    code_conflict BOOLEAN;
                BEGIN
                    -- Verificar se já existe produto com esse código de barras
                    SELECT EXISTS(
                        SELECT 1 FROM products 
                        WHERE company_id = p_company_id AND barcode = p_barcode
                    ) INTO product_exists;
                    
                    -- Verificar se já existe produto com código igual ao código de barras
                    SELECT EXISTS(
                        SELECT 1 FROM products 
                        WHERE company_id = p_company_id AND code = p_barcode
                    ) INTO code_conflict;
                    
                    -- Verificar se o código de barras já está reservado e não expirado
                    SELECT EXISTS(
                        SELECT 1 FROM product_barcode_reservations
                        WHERE company_id = p_company_id 
                        AND barcode = p_barcode
                        AND expires_at > NOW()
                    ) INTO barcode_reserved;
                    
                    -- O código de barras está disponível se não existir em produtos,
                    -- não estiver reservado e não conflitar com códigos existentes
                    RETURN NOT (product_exists OR barcode_reserved OR code_conflict);
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            # Criar função para reservar um código de barras
            cursor.execute("""
                CREATE OR REPLACE FUNCTION reserve_barcode(p_company_id UUID, p_user_id UUID, p_barcode VARCHAR)
                RETURNS BOOLEAN AS $$
                DECLARE
                    is_available BOOLEAN;
                    v_reservation_id UUID;
                BEGIN
                    -- Limpar reservas expiradas primeiro
                    DELETE FROM product_barcode_reservations 
                    WHERE expires_at < NOW();
                    
                    -- Verificar disponibilidade
                    SELECT is_barcode_available(p_company_id, p_barcode) INTO is_available;
                    
                    -- Se não estiver disponível, retornar falso
                    IF NOT is_available THEN
                        RETURN FALSE;
                    END IF;
                    
                    -- Excluir qualquer reserva antiga desse usuário para esse barcode
                    DELETE FROM product_barcode_reservations
                    WHERE company_id = p_company_id 
                        AND user_id = p_user_id
                        AND barcode = p_barcode;
                    
                    -- Criar nova reserva
                    INSERT INTO product_barcode_reservations (
                        id, company_id, barcode, user_id
                    ) VALUES (
                        uuid_generate_v4(), p_company_id, p_barcode, p_user_id
                    )
                    RETURNING id INTO v_reservation_id;
                    
                    RETURN TRUE;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            # Função para liberar uma reserva
            cursor.execute("""
                CREATE OR REPLACE FUNCTION release_barcode_reservation(p_company_id UUID, p_user_id UUID, p_barcode VARCHAR)
                RETURNS VOID AS $$
                BEGIN
                    DELETE FROM product_barcode_reservations
                    WHERE company_id = p_company_id
                        AND user_id = p_user_id
                        AND barcode = p_barcode;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            connection.commit()
            result = {
                "status": "success",
                "message": "Sistema de gerenciamento de códigos de barras por empresa criado com sucesso"
            }
        else:
            # Se a tabela já existe, atualizar as funções
            
            # Atualizar função para verificar disponibilidade
            cursor.execute("""
                CREATE OR REPLACE FUNCTION is_barcode_available(p_company_id UUID, p_barcode VARCHAR)
                RETURNS BOOLEAN AS $$
                DECLARE
                    product_exists BOOLEAN;
                    barcode_reserved BOOLEAN;
                    code_conflict BOOLEAN;
                BEGIN
                    -- Verificar se já existe produto com esse código de barras
                    SELECT EXISTS(
                        SELECT 1 FROM products 
                        WHERE company_id = p_company_id AND barcode = p_barcode
                    ) INTO product_exists;
                    
                    -- Verificar se já existe produto com código igual ao código de barras
                    SELECT EXISTS(
                        SELECT 1 FROM products 
                        WHERE company_id = p_company_id AND code = p_barcode
                    ) INTO code_conflict;
                    
                    -- Verificar se o código de barras já está reservado e não expirado
                    SELECT EXISTS(
                        SELECT 1 FROM product_barcode_reservations
                        WHERE company_id = p_company_id 
                        AND barcode = p_barcode
                        AND expires_at > NOW()
                    ) INTO barcode_reserved;
                    
                    -- O código de barras está disponível se não existir em produtos,
                    -- não estiver reservado e não conflitar com códigos existentes
                    RETURN NOT (product_exists OR barcode_reserved OR code_conflict);
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            # Atualizar função para reservar
            cursor.execute("""
                CREATE OR REPLACE FUNCTION reserve_barcode(p_company_id UUID, p_user_id UUID, p_barcode VARCHAR)
                RETURNS BOOLEAN AS $$
                DECLARE
                    is_available BOOLEAN;
                    v_reservation_id UUID;
                BEGIN
                    -- Limpar reservas expiradas primeiro
                    DELETE FROM product_barcode_reservations 
                    WHERE expires_at < NOW();
                    
                    -- Verificar disponibilidade
                    SELECT is_barcode_available(p_company_id, p_barcode) INTO is_available;
                    
                    -- Se não estiver disponível, retornar falso
                    IF NOT is_available THEN
                        RETURN FALSE;
                    END IF;
                    
                    -- Excluir qualquer reserva antiga desse usuário para esse barcode
                    DELETE FROM product_barcode_reservations
                    WHERE company_id = p_company_id 
                        AND user_id = p_user_id
                        AND barcode = p_barcode;
                    
                    -- Criar nova reserva
                    INSERT INTO product_barcode_reservations (
                        id, company_id, barcode, user_id
                    ) VALUES (
                        uuid_generate_v4(), p_company_id, p_barcode, p_user_id
                    )
                    RETURNING id INTO v_reservation_id;
                    
                    RETURN TRUE;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            connection.commit()
            result = {
                "status": "success",
                "message": "Funções de gerenciamento de códigos de barras atualizadas com sucesso"
            }
        
    except Exception as e:
        print(f"Erro ao criar tabela: {e}")
        result = {
            "status": "error",
            "message": str(e)
        }
    finally:
        if connection:
            cursor.close()
            connection.close()
            
    return result

# Função para testar o sistema de reserva de códigos de barras
def test_barcode_reservation(company_id, user_id, barcode):
    try:
        connection = psycopg2.connect(DATABASE_URL)
        cursor = connection.cursor()
        
        # Testar a reserva de um código de barras
        cursor.execute("SELECT reserve_barcode(%s, %s, %s)", (company_id, user_id, barcode))
        success = cursor.fetchone()[0]
        
        result = {
            "status": "success" if success else "error",
            "message": f"Código de barras {'reservado com sucesso' if success else 'não disponível'}: {barcode}",
            "barcode": barcode,
            "reserved": success
        }
        
    except Exception as e:
        print(f"Erro ao testar reserva de código de barras: {e}")
        result = {
            "status": "error",
            "message": str(e)
        }
    finally:
        if connection:
            cursor.close()
            connection.close()
            
    return result

if __name__ == "__main__":
    # Executar a criação da tabela
    result = create_barcode_reservations_table()
    print(json.dumps(result, indent=2))
    
    # Opcional: testar a reserva de código de barras (descomente as linhas abaixo para testar)
    # Para testar, coloque um company_id, user_id e barcode válidos
    # Exemplo:
    # company_id = "0441d879-b99f-4837-9b33-5adb168e96d4"  # Substitua pelo ID real da empresa
    # user_id = "6c463cfb-6bde-4d6b-b68d-2c5403c1e916"  # Substitua pelo ID real do usuário
    # barcode = "7891234567890"  # Um código de barras para testar
    # test_result = test_barcode_reservation(company_id, user_id, barcode)
    # print(json.dumps(test_result, indent=2))
