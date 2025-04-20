#!/usr/bin/env python3
from delete_company import delete_company
import json

if __name__ == "__main__":
    # ID da empresa VALESIS INFORMATICA
    company_id = "c8af77b7-6761-460b-a26f-481e2b980173"
    
    print(f"Tentando deletar a empresa com ID: {company_id}")
    print("Método: Script Python direto (delete_company.py)")
    
    # Chamar a função de deleção
    result = delete_company(company_id)
    
    print("\nResultado:")
    print(json.dumps(result, indent=2))
