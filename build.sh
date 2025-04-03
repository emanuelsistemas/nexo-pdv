#!/bin/bash

# Script de deploy para o aplicativo NexoPDV
# Este script constrói a aplicação e copia os arquivos para o diretório de produção

echo "🚀 Iniciando processo de build e deploy do NexoPDV..."

# Verificando diretório atual
CURRENT_DIR=$(pwd)
echo "📂 Diretório atual: $CURRENT_DIR"

# Instalando dependências (opcional, descomentar se necessário)
# echo "📦 Instalando dependências..."
# npm install

# Rodando o build
echo "🔨 Executando build de produção..."
npm run build
BUILD_STATUS=$?

if [ $BUILD_STATUS -ne 0 ]; then
  echo "❌ Falha no build! Código de saída: $BUILD_STATUS"
  exit $BUILD_STATUS
fi

echo "✅ Build concluído com sucesso!"

# Criando diretório de destino se não existir
DEST_DIR="/var/www/html/nexopdv"
echo "📂 Verificando diretório de destino: $DEST_DIR"

if [ ! -d "$DEST_DIR" ]; then
  echo "📂 Criando diretório de destino..."
  sudo mkdir -p $DEST_DIR
  sudo chown -R $(whoami):$(whoami) $DEST_DIR
fi

# Limpando diretório de destino
echo "🧹 Limpando diretório de destino..."
sudo rm -rf $DEST_DIR/*

# Copiando arquivos do build
echo "📋 Copiando arquivos do build para $DEST_DIR..."
sudo cp -r dist/* $DEST_DIR/

# Ajustando permissões
echo "🔒 Ajustando permissões..."
sudo chown -R www-data:www-data $DEST_DIR
sudo chmod -R 755 $DEST_DIR

# Restartando servidor Nginx
echo "🔄 Restartando Nginx..."
sudo systemctl restart nginx
NGINX_STATUS=$?

if [ $NGINX_STATUS -ne 0 ]; then
  echo "⚠️ Aviso: Falha ao reiniciar o Nginx. Verifique a configuração."
  echo "   Você pode verificar o status com: sudo systemctl status nginx"
  echo "   Ou verificar a sintaxe com: sudo nginx -t"
else
  echo "✅ Nginx reiniciado com sucesso!"
fi

echo "🎉 Deploy concluído! A aplicação está disponível em https://nexopdv.emasoftware.io"
