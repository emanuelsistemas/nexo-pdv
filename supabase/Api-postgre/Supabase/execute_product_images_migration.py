#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import psycopg2
import sys
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Obter string de conexão do ambiente ou usar valor padrão
DATABASE_URL = os.getenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/postgres")

def execute_sql_migration():
    """Executa a migração SQL para adicionar a tabela de imagens de produtos."""
    
    print("Iniciando migração para adicionar tabela de imagens de produtos...")
    
    # Caminho para o arquivo SQL
    migration_path = "../../migrations/20250415150500_add_product_images_table.sql"
    
    try:
        # Ler conteúdo do arquivo SQL
        with open(migration_path, 'r') as sql_file:
            sql_commands = sql_file.read()
        
        # Conectar ao banco de dados
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        
        # Criar cursor
        cursor = conn.cursor()
        
        # Executar comandos SQL
        cursor.execute(sql_commands)
        
        # Fechar conexão
        cursor.close()
        conn.close()
        
        print("Migração concluída com sucesso. Tabela product_images criada.")
        return True
        
    except FileNotFoundError:
        print(f"Erro: Arquivo SQL não encontrado em {migration_path}")
        return False
    except psycopg2.Error as e:
        print(f"Erro ao executar migração: {e}")
        return False
    except Exception as e:
        print(f"Erro inesperado: {e}")
        return False

if __name__ == "__main__":
    if execute_sql_migration():
        sys.exit(0)
    else:
        sys.exit(1)
