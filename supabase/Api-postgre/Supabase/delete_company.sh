#!/bin/bash

# Verifica se o ID da empresa foi fornecido
if [ $# -ne 1 ]; then
    echo "Uso: ./delete_company.sh <company_id>"
    exit 1
fi

COMPANY_ID=$1

# Executa o script Python para excluir a empresa
python3 delete_company.py "$COMPANY_ID"
