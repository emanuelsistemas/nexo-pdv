import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Carrega variáveis de ambiente
load_dotenv()

# Configuração da conexão PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")

def execute_sql_file(file_path):
    """
    Executa um arquivo SQL no banco de dados
    
    Args:
        file_path: Caminho para o arquivo SQL
    """
    try:
        # Conectar ao banco de dados
        print(f"Conectando ao banco de dados com URL: {DATABASE_URL[:30]}...")
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        conn.autocommit = True  # Definir autocommit como True para DDL
        cursor = conn.cursor()
        
        # Ler o arquivo SQL
        with open(file_path, 'r') as f:
            sql = f.read()
        
        # Executar o script SQL como um todo (para preservar blocos PL/pgSQL)
        try:
            cursor.execute(sql)
            print(f"✅ Script SQL executado com sucesso!")
            
            # Verificar se a tabela foi criada corretamente
            cursor.execute("""
                SELECT EXISTS (
                   SELECT FROM information_schema.tables 
                   WHERE table_schema = 'public'
                   AND table_name = 'products_configurations'
                );
            """)
            exists = cursor.fetchone()
            if exists and exists['exists']:
                print("✅ Tabela products_configurations criada com sucesso!")
                
                # Mostrar estrutura da tabela
                cursor.execute("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                    AND table_name = 'products_configurations'
                    ORDER BY ordinal_position;
                """)
                columns = cursor.fetchall()
                print("\nEstrutura da tabela products_configurations:")
                for column in columns:
                    print(f"- {column['column_name']} ({column['data_type']})")
            else:
                print("❌ Tabela products_configurations não foi criada!")
        except Exception as e:
            print(f"❌ Erro ao executar script: {e}")
        
        print("\n✅✅✅ Processo concluído!")
        
    except Exception as e:
        print(f"❌ Erro ao conectar ou executar scripts: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

def main():
    """Função principal para criar a tabela products_configurations"""
    # Caminho para o arquivo SQL
    sql_file_path = os.path.join(os.path.dirname(__file__), 'create_products_configurations.sql')
    
    # Verificar se o arquivo existe
    if not os.path.exists(sql_file_path):
        print(f"❌ Arquivo SQL não encontrado em: {sql_file_path}")
        return
    
    print(f"📄 Executando arquivo SQL: {sql_file_path}")
    execute_sql_file(sql_file_path)

if __name__ == "__main__":
    main()
