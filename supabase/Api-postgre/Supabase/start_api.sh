#!/bin/bash

# Ativa o ambiente virtual
source venv/bin/activate

# Inicia a API usando o PM2 e o arquivo de configuração
pm2 start ecosystem.config.js
