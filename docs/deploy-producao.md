# Processo de Deploy para Produção

Este documento detalha o processo completo de deploy do Nenxo PDV para o ambiente de produção.

## Visão Geral

O Nexo PDV utiliza:
- Vite para o build de produção
- NGINX como servidor web
- Arquivos estáticos servidos diretamente (sem servidor Node.js em produção)

## 1. Gerando o Build de Produção

Para gerar os arquivos de build otimizados para produção:

```bash
# Na raiz do projeto
cd /root/ema-software/nenxo-pdv
npm run build
```

Isso criará uma pasta `dist/` contendo todos os arquivos estáticos necessários:
- HTML: `index.html`
- JavaScript: `assets/*.js` (com hash para cache)
- CSS: `assets/*.css` (com hash para cache)
- Imagens e outros recursos

## 2. Estrutura do Servidor de Produção

### Localização dos Arquivos

Os arquivos do site são servidos a partir de:
- **Diretório raiz:** `/var/www/html/nexopdv/`

### Configuração do NGINX

- **Arquivo de configuração:** `/etc/nginx/sites-available/nexopdv.conf`
- **Link simbólico em sites-enabled:** `/etc/nginx/sites-enabled/nexopdv.conf`

## 3. Processo de Deploy

### 3.1 Copiar Arquivos para o Servidor

```bash
# Criar diretório se não existir
sudo mkdir -p /var/www/html/nexopdv

# Copiar todos os arquivos do build
sudo cp -r /root/ema-software/nenxo-pdv/dist/* /var/www/html/nexopdv/
```

### 3.2 Ajustar Caminhos no HTML (se necessário)

É importante verificar se o arquivo index.html está referenciando os assets com caminhos relativos em vez de absolutos:

```html
<!-- Correto (caminhos relativos) -->
<script type="module" crossorigin src="assets/index-[hash].js"></script>
<link rel="stylesheet" crossorigin href="assets/index-[hash].css">

<!-- Incorreto (caminhos absolutos) -->
<script type="module" crossorigin src="/assets/index-[hash].js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-[hash].css">
```

Se necessário, edite o arquivo manualmente:

```bash
sudo nano /var/www/html/nexopdv/index.html
```

### 3.3 Configuração do NGINX

Crie ou atualize o arquivo de configuração:

```bash
sudo nano /etc/nginx/sites-available/nexopdv.conf
```

Conteúdo recomendado:

```nginx
server {
    listen 80;
    server_name nexopdv.emasoftware.io;

    root /var/www/html/nexopdv;
    index index.html;

    # Configuração para caminhos de assets 
    location ~* ^/assets/ {
        try_files $uri $uri/ =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Definir cache para ativos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # Configurações de segurança
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Frame-Options SAMEORIGIN;
}
```

### 3.4 Habilitar e Verificar Configuração

```bash
# Se o site não estiver ativado, crie o link simbólico
sudo ln -sf /etc/nginx/sites-available/nexopdv.conf /etc/nginx/sites-enabled/

# Verificar se há erros de sintaxe
sudo nginx -t

# Reiniciar NGINX
sudo systemctl restart nginx
```

### 3.5 Servidor Padrão (opcional)

Se desejar que o Nexo PDV seja servido na raiz do servidor, você pode desativar o site padrão:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

## 4. Verificação do Deploy

Verifique se a aplicação está funcionando corretamente:

1. Acesse o domínio no navegador: `http://nexopdv.emasoftware.io`
2. Verifique se todos os recursos estão carregando (sem erros 404 no console)
3. Teste as funcionalidades principais da aplicação

## 5. Solução de Problemas

### 5.1 Erros de Permissão

Se houver problemas de acesso aos arquivos:

```bash
sudo chown -R www-data:www-data /var/www/html/nexopdv
sudo chmod -R 755 /var/www/html/nexopdv
```

### 5.2 Problemas com API

Se a aplicação necessitar de conexão com uma API, certifique-se de que:

1. As URLs da API estão configuradas corretamente
2. As requisições cross-origin estão permitidas na API
3. O proxy NGINX está configurado para encaminhar solicitações à API

### 5.3 Logs do NGINX

Os logs do NGINX podem fornecer informações valiosas para diagnóstico:

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 6. Manutenção

Para atualizar a aplicação com uma nova versão:

1. Gere um novo build (`npm run build`)
2. Backup dos arquivos antigos (opcional)
3. Substitua os arquivos no diretório `/var/www/html/nexopdv/`
4. Verifique se a aplicação está funcionando corretamente

---

Este guia fornece as etapas básicas para realizar o deploy do Nexo PDV em ambiente de produção. Adapte conforme necessário para atender às necessidades específicas do seu ambiente.
