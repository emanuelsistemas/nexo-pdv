import psycopg2
import sys

# String de conexão fornecida
connection_string = "postgresql://postgres.ahvgkqoktbsvepuhhepp:Gbu2yD76U38bUU@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

def test_connection():
    try:
        # Conectar ao banco de dados
        print("Tentando conectar ao PostgreSQL...")
        conn = psycopg2.connect(connection_string)
        
        # Criar um cursor
        cursor = conn.cursor()
        
        # Verificar a conexão executando uma consulta simples
        print("Conexão estabelecida! Executando consulta de teste...")
        cursor.execute("SELECT current_database(), current_user, version();")
        
        # Recuperar o resultado
        result = cursor.fetchone()
        print(f"\nBanco de dados atual: {result[0]}")
        print(f"Usuário atual: {result[1]}")
        print(f"Versão do PostgreSQL: {result[2][:50]}...")
        
        # Listar todas as tabelas públicas
        print("\nListando tabelas disponíveis:")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        if tables:
            for table in tables:
                print(f"- {table[0]}")
        else:
            print("Nenhuma tabela pública encontrada.")
        
        # Fechar o cursor e a conexão
        cursor.close()
        conn.close()
        print("\nConexão testada com sucesso e fechada!")
        
    except Exception as e:
        print(f"\nErro ao conectar ou executar consulta: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_connection()
