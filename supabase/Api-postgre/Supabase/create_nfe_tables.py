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

def create_nfe_tables():
    """
    Cria todas as tabelas necessárias para o sistema de NF-e/NFC-e.
    As tabelas são criadas sem restrições de chave estrangeira (DESPROTEGIDAS).
    """
    try:
        # Conectar ao banco de dados
        connection = psycopg2.connect(DATABASE_URL)
        cursor = connection.cursor()

        # Tabela principal de NF-e
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nfe (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id UUID,
                numero INTEGER NOT NULL,
                serie INTEGER NOT NULL,
                modelo VARCHAR(2) NOT NULL DEFAULT '55',
                chave_acesso VARCHAR(44),
                data_emissao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                data_saida_entrada TIMESTAMP WITH TIME ZONE,
                tipo_operacao CHAR(1) NOT NULL,
                natureza_operacao VARCHAR(60) NOT NULL,
                finalidade CHAR(1) NOT NULL DEFAULT '1',
                forma_pagamento CHAR(1) NOT NULL DEFAULT '0',
                tipo_emissao CHAR(1) NOT NULL DEFAULT '1',
                presenca_comprador CHAR(1) DEFAULT '1',
                digest_value VARCHAR(28),
                status VARCHAR(20) NOT NULL DEFAULT 'rascunho',
                protocolo VARCHAR(20),
                xml_enviado TEXT,
                xml_retorno TEXT,
                xml_protocolo TEXT,
                qrcode_url TEXT,
                qrcode_dados TEXT,
                url_consulta VARCHAR(255),
                motivo_cancelamento TEXT,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                created_by UUID
            );

            -- Índices para melhorar a performance
            CREATE INDEX IF NOT EXISTS idx_nfe_company_id ON nfe(company_id);
            CREATE INDEX IF NOT EXISTS idx_nfe_chave_acesso ON nfe(chave_acesso);
            CREATE INDEX IF NOT EXISTS idx_nfe_data_emissao ON nfe(data_emissao);
            CREATE INDEX IF NOT EXISTS idx_nfe_status ON nfe(status);
        """)

        # Tabela de destinatário
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nfe_destinatario (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nfe_id UUID,
                tipo_documento CHAR(1) NOT NULL,
                documento VARCHAR(14) NOT NULL,
                nome VARCHAR(60) NOT NULL,
                ie VARCHAR(20),
                email VARCHAR(60),
                telefone VARCHAR(20),
                endereco_logradouro VARCHAR(60),
                endereco_numero VARCHAR(10),
                endereco_complemento VARCHAR(60),
                endereco_bairro VARCHAR(60),
                endereco_cep VARCHAR(8),
                endereco_municipio VARCHAR(60),
                endereco_municipio_codigo VARCHAR(7),
                endereco_uf CHAR(2),
                endereco_pais VARCHAR(60) DEFAULT 'BRASIL',
                endereco_pais_codigo VARCHAR(4) DEFAULT '1058',
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );

            -- Índices para melhorar a performance
            CREATE INDEX IF NOT EXISTS idx_nfe_destinatario_nfe_id ON nfe_destinatario(nfe_id);
            CREATE INDEX IF NOT EXISTS idx_nfe_destinatario_documento ON nfe_destinatario(documento);
        """)

        # Tabela de itens da NF-e
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nfe_itens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nfe_id UUID,
                product_id UUID,
                numero_item INTEGER NOT NULL,
                codigo VARCHAR(60) NOT NULL,
                descricao VARCHAR(120) NOT NULL,
                ncm VARCHAR(8) NOT NULL,
                cfop VARCHAR(4) NOT NULL,
                unidade VARCHAR(6) NOT NULL,
                quantidade NUMERIC(15,4) NOT NULL,
                valor_unitario NUMERIC(15,4) NOT NULL,
                valor_total NUMERIC(15,2) NOT NULL,
                valor_desconto NUMERIC(15,2) DEFAULT 0,
                cst_icms VARCHAR(3),
                base_calculo_icms NUMERIC(15,2) DEFAULT 0,
                aliquota_icms NUMERIC(5,2) DEFAULT 0,
                valor_icms NUMERIC(15,2) DEFAULT 0,
                cst_ipi VARCHAR(2),
                base_calculo_ipi NUMERIC(15,2) DEFAULT 0,
                aliquota_ipi NUMERIC(5,2) DEFAULT 0,
                valor_ipi NUMERIC(15,2) DEFAULT 0,
                cst_pis VARCHAR(2),
                base_calculo_pis NUMERIC(15,2) DEFAULT 0,
                aliquota_pis NUMERIC(5,2) DEFAULT 0,
                valor_pis NUMERIC(15,2) DEFAULT 0,
                cst_cofins VARCHAR(2),
                base_calculo_cofins NUMERIC(15,2) DEFAULT 0,
                aliquota_cofins NUMERIC(5,2) DEFAULT 0,
                valor_cofins NUMERIC(15,2) DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );

            -- Índices para melhorar a performance
            CREATE INDEX IF NOT EXISTS idx_nfe_itens_nfe_id ON nfe_itens(nfe_id);
            CREATE INDEX IF NOT EXISTS idx_nfe_itens_product_id ON nfe_itens(product_id);
        """)

        # Tabela de transporte
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nfe_transporte (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nfe_id UUID,
                modalidade_frete CHAR(1) NOT NULL,
                transportadora_documento VARCHAR(14),
                transportadora_nome VARCHAR(60),
                transportadora_ie VARCHAR(20),
                transportadora_endereco VARCHAR(60),
                transportadora_municipio VARCHAR(60),
                transportadora_uf CHAR(2),
                veiculo_placa VARCHAR(7),
                veiculo_uf CHAR(2),
                veiculo_rntc VARCHAR(20),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );

            -- Índice para melhorar a performance
            CREATE INDEX IF NOT EXISTS idx_nfe_transporte_nfe_id ON nfe_transporte(nfe_id);
        """)

        # Tabela de volumes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nfe_volumes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nfe_transporte_id UUID,
                quantidade INTEGER,
                especie VARCHAR(60),
                marca VARCHAR(60),
                numeracao VARCHAR(60),
                peso_liquido NUMERIC(15,3),
                peso_bruto NUMERIC(15,3),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );

            -- Índice para melhorar a performance
            CREATE INDEX IF NOT EXISTS idx_nfe_volumes_transporte_id ON nfe_volumes(nfe_transporte_id);
        """)

        # Tabela de pagamentos
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nfe_pagamentos (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nfe_id UUID,
                forma_pagamento VARCHAR(2) NOT NULL,
                valor NUMERIC(15,2) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );

            -- Índice para melhorar a performance
            CREATE INDEX IF NOT EXISTS idx_nfe_pagamentos_nfe_id ON nfe_pagamentos(nfe_id);
        """)

        # Tabela de eventos
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nfe_eventos (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nfe_id UUID,
                tipo_evento VARCHAR(6) NOT NULL,
                sequencia INTEGER NOT NULL DEFAULT 1,
                data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                motivo TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'pendente',
                protocolo VARCHAR(20),
                xml_enviado TEXT,
                xml_retorno TEXT,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                created_by UUID
            );

            -- Índice para melhorar a performance
            CREATE INDEX IF NOT EXISTS idx_nfe_eventos_nfe_id ON nfe_eventos(nfe_id);
            CREATE INDEX IF NOT EXISTS idx_nfe_eventos_tipo_evento ON nfe_eventos(tipo_evento);
        """)

        # Tabela de configurações
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nfe_configuracoes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id UUID,
                ambiente CHAR(1) NOT NULL DEFAULT '2',
                versao VARCHAR(10) NOT NULL DEFAULT '4.00',
                modelo VARCHAR(2) NOT NULL DEFAULT '55',
                serie INTEGER NOT NULL DEFAULT 1,
                numero_atual INTEGER NOT NULL DEFAULT 1,
                certificado_arquivo TEXT,
                certificado_senha VARCHAR(255),
                certificado_validade DATE,
                csc_id VARCHAR(6),
                csc_token VARCHAR(36),
                logo_url VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );

            -- Índice para melhorar a performance
            CREATE INDEX IF NOT EXISTS idx_nfe_configuracoes_company_id ON nfe_configuracoes(company_id);
        """)

        # Adicionar campos necessários à tabela products
        try:
            cursor.execute("""
                ALTER TABLE products 
                ADD COLUMN IF NOT EXISTS origem CHAR(1) DEFAULT '0',
                ADD COLUMN IF NOT EXISTS cest VARCHAR(7),
                ADD COLUMN IF NOT EXISTS ipi VARCHAR(3),
                ADD COLUMN IF NOT EXISTS peso_liquido NUMERIC(15,3),
                ADD COLUMN IF NOT EXISTS peso_bruto NUMERIC(15,3),
                ADD COLUMN IF NOT EXISTS gtin_trib VARCHAR(14),
                ADD COLUMN IF NOT EXISTS unidade_tributavel VARCHAR(6),
                ADD COLUMN IF NOT EXISTS quantidade_tributavel NUMERIC(15,4);
            """)
        except Exception as e:
            print(f"Erro ao adicionar campos à tabela products: {e}")

        # Adicionar campos necessários à tabela companies
        try:
            cursor.execute("""
                ALTER TABLE companies 
                ADD COLUMN IF NOT EXISTS regime_tributario VARCHAR(1) DEFAULT '1',
                ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(20),
                ADD COLUMN IF NOT EXISTS cnae VARCHAR(7),
                ADD COLUMN IF NOT EXISTS responsavel_tecnico UUID;
            """)
        except Exception as e:
            print(f"Erro ao adicionar campos à tabela companies: {e}")

        connection.commit()
        result = {
            "status": "success",
            "message": "Tabelas para NF-e/NFC-e criadas com sucesso"
        }
    except Exception as e:
        print(f"Erro ao criar tabelas: {e}")
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
    # Executar a criação das tabelas
    result = create_nfe_tables()
    print(json.dumps(result, indent=2))
