#!/bin/bash

echo "Iniciando processo de build para o nenxo-pdv..."

# Definir variáveis de ambiente
export NODE_ENV=production

# Parar instâncias anteriores se existirem
echo "Parando instâncias anteriores..."
pm2 stop nenxo-pdv-dev 2>/dev/null || true
pm2 stop nenxo-pdv-prod 2>/dev/null || true
pm2 delete nenxo-pdv-dev 2>/dev/null || true
pm2 delete nenxo-pdv-prod 2>/dev/null || true

# Instalar dependências se necessário
echo "Verificando e instalando dependências..."
pnpm install

# Executar build
echo "Executando build de produção..."
pnpm run build

# Iniciar serviço de produção
echo "Iniciando serviço na porta 5000..."
pm2 start ecosystem.config.cjs --only nenxo-pdv-prod

# Verificar status
echo "Verificando status dos serviços..."
pm2 ls

echo "Build finalizado!"
echo "O nenxo-pdv está em execução na porta 5000 (produção)."
echo "Para iniciar o ambiente de desenvolvimento na porta 5002, execute:"
echo "pm2 start ecosystem.config.cjs --only nenxo-pdv-dev"

# Instrução para configurar o NGINX
echo ""
echo "Instruções para configurar o NGINX:"
echo "1. Copie o arquivo de configuração para o diretório do NGINX:"
echo "   sudo cp $(pwd)/nginx/nexopdv.conf /etc/nginx/sites-available/"
echo ""
echo "2. Crie um link simbólico para habilitar o site:"
echo "   sudo ln -s /etc/nginx/sites-available/nexopdv.conf /etc/nginx/sites-enabled/"
echo ""
echo "3. Verifique a configuração do NGINX:"
echo "   sudo nginx -t"
echo ""
echo "4. Reinicie o NGINX para aplicar as alterações:"
echo "   sudo systemctl restart nginx"
echo ""
echo "5. Configure o DNS para que nexopdv.emasoftware.io aponte para o IP deste servidor"