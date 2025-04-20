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

def create_product_code_reservations_table():
    """
    Cria a tabela product_code_reservations para gerenciar reservas de códigos de produtos por empresa.
    Esta tabela permite que o sistema reserve códigos numericamente sequenciais para cada empresa.
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
                AND tablename = 'product_code_reservations'
            );
        """)
        
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            # Criar a tabela product_code_reservations com suporte para multi-empresa
            cursor.execute("""
                CREATE TABLE product_code_reservations (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    company_id UUID NOT NULL REFERENCES companies(id),
                    product_code VARCHAR(20) NOT NULL,
                    user_id UUID NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 minutes')
                );
                
                -- Índice para busca rápida de códigos por empresa
                CREATE INDEX idx_product_reservations_company_code ON 
                    product_code_reservations(company_id, product_code);
            """)
            
            # Criar função para encontrar o menor código disponível para uma empresa
            cursor.execute("""
                CREATE OR REPLACE FUNCTION get_next_available_product_code(p_company_id UUID)
                RETURNS VARCHAR AS $$
                DECLARE
                    v_next_code INTEGER;
                    v_code_exists BOOLEAN;
                    v_code_reserved BOOLEAN;
                    v_candidate_code VARCHAR;
                BEGIN
                    -- Iniciar com o código 1
                    v_next_code := 1;
                    
                    LOOP
                        -- Converter para string
                        v_candidate_code := v_next_code::VARCHAR;
                        
                        -- Verificar se já existe um produto com este código
                        SELECT EXISTS (SELECT 1 FROM products 
                                      WHERE company_id = p_company_id 
                                      AND code = v_candidate_code) 
                        INTO v_code_exists;
                        
                        -- Verificar se o código está reservado e não expirado
                        SELECT EXISTS (SELECT 1 FROM product_code_reservations 
                                      WHERE company_id = p_company_id 
                                      AND product_code = v_candidate_code
                                      AND expires_at > NOW()) 
                        INTO v_code_reserved;
                        
                        -- Se o código não existe e não está reservado, retorná-lo
                        IF NOT v_code_exists AND NOT v_code_reserved THEN
                            RETURN v_candidate_code;
                        END IF;
                        
                        -- Tentar o próximo código
                        v_next_code := v_next_code + 1;
                        
                        -- Limite de segurança para evitar loops infinitos
                        IF v_next_code > 999999 THEN
                            RETURN 'MAX_LIMIT';
                        END IF;
                    END LOOP;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            # Criar função para reservar um código
            cursor.execute("""
                CREATE OR REPLACE FUNCTION reserve_product_code(p_company_id UUID, p_user_id UUID)
                RETURNS VARCHAR AS $$
                DECLARE
                    v_code VARCHAR;
                    v_reservation_id UUID;
                BEGIN
                    -- Limpar reservas expiradas primeiro
                    DELETE FROM product_code_reservations 
                    WHERE expires_at < NOW();
                    
                    -- Obter o próximo código disponível
                    SELECT get_next_available_product_code(p_company_id) INTO v_code;
                    
                    -- Se encontrou um código válido, reservá-lo
                    IF v_code <> 'MAX_LIMIT' THEN
                        INSERT INTO product_code_reservations (
                            id, company_id, product_code, user_id, expires_at
                        ) VALUES (
                            uuid_generate_v4(), p_company_id, v_code, p_user_id, 
                            NOW() + interval '30 minutes'
                        )
                        RETURNING id INTO v_reservation_id;
                        
                        RETURN v_code;
                    ELSE
                        RETURN 'ERROR: No available codes';
                    END IF;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            connection.commit()
            result = {
                "status": "success",
                "message": "Sistema de gerenciamento de códigos de produtos por empresa criado com sucesso"
            }
        else:
            # Se a tabela já existe, atualizar as funções
            
            # Atualizar função para encontrar o menor código disponível
            cursor.execute("""
                CREATE OR REPLACE FUNCTION get_next_available_product_code(p_company_id UUID)
                RETURNS VARCHAR AS $$
                DECLARE
                    v_next_code INTEGER;
                    v_code_exists BOOLEAN;
                    v_code_reserved BOOLEAN;
                    v_candidate_code VARCHAR;
                BEGIN
                    -- Iniciar com o código 1
                    v_next_code := 1;
                    
                    LOOP
                        -- Converter para string
                        v_candidate_code := v_next_code::VARCHAR;
                        
                        -- Verificar se já existe um produto com este código
                        SELECT EXISTS (SELECT 1 FROM products 
                                      WHERE company_id = p_company_id 
                                      AND code = v_candidate_code) 
                        INTO v_code_exists;
                        
                        -- Verificar se o código está reservado e não expirado
                        SELECT EXISTS (SELECT 1 FROM product_code_reservations 
                                      WHERE company_id = p_company_id 
                                      AND product_code = v_candidate_code
                                      AND expires_at > NOW()) 
                        INTO v_code_reserved;
                        
                        -- Se o código não existe e não está reservado, retorná-lo
                        IF NOT v_code_exists AND NOT v_code_reserved THEN
                            RETURN v_candidate_code;
                        END IF;
                        
                        -- Tentar o próximo código
                        v_next_code := v_next_code + 1;
                        
                        -- Limite de segurança para evitar loops infinitos
                        IF v_next_code > 999999 THEN
                            RETURN 'MAX_LIMIT';
                        END IF;
                    END LOOP;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            # Atualizar função para reservar um código
            cursor.execute("""
                CREATE OR REPLACE FUNCTION reserve_product_code(p_company_id UUID, p_user_id UUID)
                RETURNS VARCHAR AS $$
                DECLARE
                    v_code VARCHAR;
                    v_reservation_id UUID;
                BEGIN
                    -- Limpar reservas expiradas primeiro
                    DELETE FROM product_code_reservations 
                    WHERE expires_at < NOW();
                    
                    -- Obter o próximo código disponível
                    SELECT get_next_available_product_code(p_company_id) INTO v_code;
                    
                    -- Se encontrou um código válido, reservá-lo
                    IF v_code <> 'MAX_LIMIT' THEN
                        INSERT INTO product_code_reservations (
                            id, company_id, product_code, user_id, expires_at
                        ) VALUES (
                            uuid_generate_v4(), p_company_id, v_code, p_user_id, 
                            NOW() + interval '30 minutes'
                        )
                        RETURNING id INTO v_reservation_id;
                        
                        RETURN v_code;
                    ELSE
                        RETURN 'ERROR: No available codes';
                    END IF;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            connection.commit()
            result = {
                "status": "success",
                "message": "Funções de gerenciamento de códigos de produtos atualizadas com sucesso"
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

# Função para testar o sistema de códigos
def test_product_code_reservation(company_id, user_id):
    try:
        connection = psycopg2.connect(DATABASE_URL)
        cursor = connection.cursor()
        
        # Testar a reserva de um código
        cursor.execute("SELECT reserve_product_code(%s, %s)", (company_id, user_id))
        code = cursor.fetchone()[0]
        
        result = {
            "status": "success",
            "message": f"Código reservado: {code}",
            "code": code
        }
        
    except Exception as e:
        print(f"Erro ao testar reserva de código: {e}")
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
    result = create_product_code_reservations_table()
    print(json.dumps(result, indent=2))
    
    # Opcional: testar a reserva de código (descomente as linhas abaixo para testar)
    # Para testar, coloque um company_id e user_id válidos do seu banco
    # Exemplo:
    # company_id = "0441d879-b99f-4837-9b33-5adb168e96d4"  # Substitua pelo ID real da empresa
    # user_id = "6c463cfb-6bde-4d6b-b68d-2c5403c1e916"  # Substitua pelo ID real do usuário
    # test_result = test_product_code_reservation(company_id, user_id)
    # print(json.dumps(test_result, indent=2))
