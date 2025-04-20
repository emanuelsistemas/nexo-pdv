#!/usr/bin/env python3
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import uuid
from datetime import datetime

def get_database_url():
    """Obtém a URL de conexão do banco de dados."""
    db_url = os.getenv('DATABASE_URL')
    
    if not db_url:
        try:
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('DATABASE_URL='):
                        db_url = line.split('=', 1)[1].strip()
                        if db_url.startswith('"') and db_url.endswith('"'):
                            db_url = db_url[1:-1]
                        break
        except:
            pass
    
    return db_url

def create_missing_profiles():
    """
    Cria perfis para usuários autenticados que não possuem perfil
    e associa-os à primeira empresa disponível, se existir
    """
    conn = None
    try:
        conn = psycopg2.connect(get_database_url(), cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        # Verificar usuários sem perfil
        cursor.execute("""
            SELECT u.id, u.email
            FROM auth.users u
            LEFT JOIN profiles p ON u.id = p.id
            WHERE p.id IS NULL
        """)
        users_without_profile = cursor.fetchall()
        
        if not users_without_profile:
            print("Todos os usuários já possuem perfis!")
            return {"status": "success", "message": "Todos os usuários já possuem perfis!", "created_profiles": []}
        
        # Verificar se há empresas disponíveis
        cursor.execute("SELECT id FROM companies LIMIT 1")
        company = cursor.fetchone()
        
        company_id = company['id'] if company else None
        created_profiles = []
        
        for user in users_without_profile:
            user_id = user['id']
            user_email = user['email']
            
            # Primeiro, verificar a estrutura exata da tabela profiles
            cursor.execute("""
                SELECT column_name, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'profiles'
                ORDER BY ordinal_position
            """)
            columns_info = cursor.fetchall()
            
            print("Estrutura da tabela profiles:")
            for col in columns_info:
                print(f"  {col['column_name']} - Nullable: {col['is_nullable']} - Default: {col['column_default']}")
            
            # Campos necessários para a tabela profiles
            profile_data = {
                "id": user_id,
                "updated_at": datetime.now(),
                "name": user_email.split('@')[0],  # Nome básico baseado no email
                "email": user_email,
                "company_id": company_id
            }
            
            # Adicionar outros campos que podem existir na tabela
            for col in columns_info:
                col_name = col['column_name']
                # Verificar se há campos que não temos valores definidos
                if col_name not in profile_data and col['is_nullable'] == 'NO' and col['column_default'] is None:
                    # Para campos não-nulos sem valor padrão, definir um valor seguro
                    if col_name in ['username', 'full_name']:
                        profile_data[col_name] = user_email.split('@')[0]
                    elif col_name == 'avatar_url':
                        profile_data[col_name] = ''
            
            print(f"Dados para inserção: {profile_data}")
            
            # Verificar quais colunas existem na tabela
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'profiles'
            """)
            existing_columns = [row['column_name'] for row in cursor.fetchall()]
            
            # Construir a SQL de inserção dinâmica
            columns = []
            placeholders = []
            values = []
            
            for col, val in profile_data.items():
                if col in existing_columns:
                    columns.append(col)
                    placeholders.append("%s")
                    values.append(val)
            
            if not columns:
                print(f"Erro: Não foi possível determinar as colunas para a tabela profiles")
                return {"status": "error", "message": "Estrutura da tabela profiles não reconhecida"}
            
            # SQL para inserir perfil
            insert_sql = f"""
                INSERT INTO profiles ({', '.join(columns)})
                VALUES ({', '.join(placeholders)})
                RETURNING id
            """
            
            cursor.execute(insert_sql, values)
            new_profile_id = cursor.fetchone()['id']
            
            created_profiles.append({
                "user_id": user_id,
                "email": user_email,
                "profile_id": new_profile_id,
                "company_id": company_id
            })
        
        conn.commit()
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "message": f"Criados {len(created_profiles)} perfis de usuário",
            "created_profiles": created_profiles
        }
    
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Erro ao criar perfis: {str(e)}")
        return {"status": "error", "message": str(e)}
    
    finally:
        if conn:
            conn.close()

def create_profiles_table_if_needed():
    """Cria a tabela profiles se ela não existir"""
    conn = None
    try:
        conn = psycopg2.connect(get_database_url())
        cursor = conn.cursor()
        
        # Verificar se a tabela profiles existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name = 'profiles'
            )
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("Criando tabela profiles...")
            cursor.execute("""
                CREATE TABLE profiles (
                    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                    updated_at TIMESTAMP WITH TIME ZONE,
                    username TEXT,
                    full_name TEXT,
                    avatar_url TEXT,
                    company_id UUID REFERENCES companies(id),
                    email TEXT
                );
            """)
            
            # Criar índice para melhorar performance
            cursor.execute("CREATE INDEX idx_profiles_company_id ON profiles(company_id);")
            
            conn.commit()
            return {"status": "success", "message": "Tabela profiles criada com sucesso!"}
        else:
            return {"status": "success", "message": "Tabela profiles já existe"}
    
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Erro ao criar tabela profiles: {str(e)}")
        return {"status": "error", "message": str(e)}
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    # Primeiro verificar/criar a tabela profiles se necessário
    table_result = create_profiles_table_if_needed()
    print(json.dumps(table_result, indent=2, default=str))
    
    if table_result["status"] == "success":
        # Criar perfis faltantes
        profiles_result = create_missing_profiles()
        print("\nResultado da criação de perfis:")
        print(json.dumps(profiles_result, indent=2, default=str))