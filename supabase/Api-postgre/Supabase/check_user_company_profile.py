#!/usr/bin/env python3
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
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

def check_user_company_profile():
    """
    Verifica a relação entre usuários, perfis e empresas e 
    identifica possíveis problemas de associações
    """
    conn = None
    try:
        conn = psycopg2.connect(get_database_url(), cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        # Verificar usuários autenticados
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM auth.users
        """)
        users_count = cursor.fetchone()['count']
        
        # Verificar perfis
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM profiles
        """)
        profiles_count = cursor.fetchone()['count']
        
        # Verificar empresas
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM companies
        """)
        companies_count = cursor.fetchone()['count']
        
        # Verificar usuários sem perfil
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM auth.users u
            LEFT JOIN profiles p ON u.id = p.id
            WHERE p.id IS NULL
        """)
        users_without_profile = cursor.fetchone()['count']
        
        # Verificar perfis sem empresa
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM profiles
            WHERE company_id IS NULL
        """)
        profiles_without_company = cursor.fetchone()['count']
        
        # Verificar perfis com empresas inexistentes
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM profiles p
            LEFT JOIN companies c ON p.company_id = c.id
            WHERE p.company_id IS NOT NULL AND c.id IS NULL
        """)
        profiles_with_invalid_company = cursor.fetchone()['count']
        
        # Verificar empresas sem perfis associados
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM companies c
            LEFT JOIN profiles p ON c.id = p.company_id
            WHERE p.id IS NULL
        """)
        companies_without_profiles = cursor.fetchone()['count']
        
        # Verificar colunas da tabela companies
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'companies'
            ORDER BY ordinal_position
        """)
        company_columns = [row['column_name'] for row in cursor.fetchall()]
        
        # Listar as empresas existentes com colunas disponíveis
        company_select = "id, created_at"
        if "name" in company_columns:
            company_select += ", name"
        elif "company_name" in company_columns:
            company_select += ", company_name as name"
        elif "razao_social" in company_columns:
            company_select += ", razao_social as name"
            
        cursor.execute(f"""
            SELECT {company_select}
            FROM companies
            ORDER BY created_at DESC
            LIMIT 10
        """)
        latest_companies = cursor.fetchall()
        
        # Verificar colunas da tabela profiles
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'profiles'
            ORDER BY ordinal_position
        """)
        profile_columns = [row['column_name'] for row in cursor.fetchall()]
        
        # Listar os perfis problemáticos (sem empresa)
        profile_select = "id, created_at"
        if "email" in profile_columns:
            profile_select += ", email"
        else:
            profile_select += ", NULL as email"
            
        if "username" in profile_columns:
            profile_select += ", username"
        elif "full_name" in profile_columns:
            profile_select += ", full_name as username"
        else:
            profile_select += ", NULL as username"
            
        cursor.execute(f"""
            SELECT {profile_select}
            FROM profiles
            WHERE company_id IS NULL
            LIMIT 10
        """)
        profiles_no_company = cursor.fetchall()
        
        # Verificar consistência das relações
        company_name_field = "NULL"
        if "name" in company_columns:
            company_name_field = "c.name"
        elif "company_name" in company_columns:
            company_name_field = "c.company_name"
        elif "razao_social" in company_columns:
            company_name_field = "c.razao_social"
            
        cursor.execute(f"""
            SELECT
                u.id as user_id,
                u.email,
                p.id as profile_id,
                p.company_id,
                c.id as company_exists,
                {company_name_field} as company_name
            FROM
                auth.users u
                LEFT JOIN profiles p ON u.id = p.id
                LEFT JOIN companies c ON p.company_id = c.id
            ORDER BY u.created_at DESC
            LIMIT 10
        """)
        user_relations = cursor.fetchall()
        
        results = {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "counts": {
                "users": users_count,
                "profiles": profiles_count,
                "companies": companies_count,
                "users_without_profile": users_without_profile,
                "profiles_without_company": profiles_without_company,
                "profiles_with_invalid_company": profiles_with_invalid_company,
                "companies_without_profiles": companies_without_profiles
            },
            "latest_companies": [dict(c) for c in latest_companies],
            "profiles_no_company": [dict(p) for p in profiles_no_company],
            "user_relations": [dict(r) for r in user_relations]
        }
        
        return results
    
    except Exception as e:
        print(f"Erro ao verificar relação usuário-empresa: {str(e)}")
        return {"status": "error", "message": str(e)}
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    result = check_user_company_profile()
    
    print("\nAnálise das relações entre usuários, perfis e empresas:")
    print(json.dumps(result, indent=2, default=str))
    
    # Salvar resultado em um arquivo para análise posterior
    try:
        with open('user_company_profile_analysis.json', 'w') as f:
            json.dump(result, f, indent=2, default=str)
        print("\nResultado salvo em 'user_company_profile_analysis.json'")
    except Exception as e:
        print(f"\nErro ao salvar resultado: {str(e)}")
    
    # Análise de problemas potenciais
    if result["status"] == "success":
        problems = []
        
        if result["counts"]["users_without_profile"] > 0:
            problems.append(f"{result['counts']['users_without_profile']} usuários sem perfil associado!")
        
        if result["counts"]["profiles_without_company"] > 0:
            problems.append(f"{result['counts']['profiles_without_company']} perfis sem empresa associada!")
            
        if result["counts"]["profiles_with_invalid_company"] > 0:
            problems.append(f"{result['counts']['profiles_with_invalid_company']} perfis com empresa inválida!")
        
        if result["counts"]["companies_without_profiles"] > 0:
            problems.append(f"{result['counts']['companies_without_profiles']} empresas sem perfis associados!")
        
        print("\nPossíveis problemas identificados:")
        if problems:
            for i, problem in enumerate(problems, 1):
                print(f"{i}. {problem}")
            
            print("\nRecomendações:")
            if result["counts"]["users_without_profile"] > 0:
                print("- Verificar usuários sem perfil e criar perfis para eles")
            if result["counts"]["profiles_without_company"] > 0:
                print("- Associar perfis às empresas corretas")
            if result["counts"]["profiles_with_invalid_company"] > 0:
                print("- Corrigir perfis que apontam para empresas inválidas")
            if result["counts"]["companies_without_profiles"] > 0:
                print("- Verificar empresas sem perfis associados e corrigi-las ou remover se necessário")
        else:
            print("Nenhum problema identificado nas relações entre usuários, perfis e empresas!")