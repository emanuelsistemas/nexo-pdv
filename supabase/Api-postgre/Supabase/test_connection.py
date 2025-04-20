import os
from dotenv import load_dotenv
from supabase import create_client

# Carrega as variáveis de ambiente
load_dotenv()

# Obtém as credenciais do Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print(f"URL: {SUPABASE_URL}")
print(f"KEY (primeiros 10 caracteres): {SUPABASE_KEY[:10]}...")

try:
    # Tenta criar o cliente Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Tenta listar as tabelas disponíveis
    print("\nTentando listar tabelas...")
    response = supabase.table('users').select('*').limit(5).execute()
    
    # Exibe os resultados
    print(f"\nResposta: {response}")
    print(f"\nDados: {response.data}")
    print(f"\nContagem: {len(response.data)} registros")
    
    print("\nConexão bem-sucedida!")
except Exception as e:
    print(f"\nErro ao conectar: {e}")
    print("\nDicas para resolver:")
    print("1. Verifique se a URL do Supabase está correta")
    print("2. Verifique se a chave anon está no formato correto (JWT)")
    print("3. Verifique se a tabela 'users' existe no seu projeto Supabase")
