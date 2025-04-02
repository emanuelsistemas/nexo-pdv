# Documentação de Deploy - Nexo PDV

## Informações do Servidor
- **Aplicação:** Frontend Nexo PDV
- **Domínio:** nexopdv.emasoftware.io
- **Data da configuração:** 2025-04-02

## Estrutura do Projeto
- Repositório: https://github.com/emanuelsistemas/nexo-pdv.git
- Linguagem: TypeScript
- Framework: React com Vite
- Estilização: Tailwind CSS

## Processo de Deploy

### 1. Preparação do Ambiente
```bash
# Clonar o repositório
mkdir -p /root/nexo-pdv
cd /root/nexo-pdv
git clone https://github.com/emanuelsistemas/nexo-pdv.git .

# Instalar dependências
npm install
```

### 2. Build da Aplicação
```bash
# Gerar build de produção
npm run build
```

### 3. Configuração do Servidor Web

#### 3.1 Configuração do Nginx
O build gerado foi movido para `/var/www/html/nexopdv` com as permissões apropriadas:

```bash
# Criar diretório para o site
mkdir -p /var/www/html/nexopdv

# Copiar arquivos do build
cp -r /root/nexo-pdv/dist/* /var/www/html/nexopdv/

# Configurar permissões
chown -R www-data:www-data /var/www/html/nexopdv
```

#### 3.2 Configuração do Virtual Host
Arquivo: `/etc/nginx/sites-available/nexopdv.emasoftware.io`
```nginx
server {
    listen 80;
    server_name nexopdv.emasoftware.io;

    root /var/www/html/nexopdv;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=0";
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### 4. Ativação do Site
```bash
# Criar link simbólico para ativar o site
ln -s /etc/nginx/sites-available/nexopdv.emasoftware.io /etc/nginx/sites-enabled/

# Testar configuração do Nginx
nginx -t

# Reiniciar o Nginx
systemctl restart nginx
```

## Atualizações e Manutenção

Para atualizar a aplicação:

1. Faça pull das atualizações do repositório:
```bash
cd /root/nexo-pdv
git pull
```

2. Instale as dependências caso necessário:
```bash
npm install
```

3. Construa novamente a aplicação:
```bash
npm run build
```

4. Substitua os arquivos no diretório web:
```bash
cp -r /root/nexo-pdv/dist/* /var/www/html/nexopdv/
chown -R www-data:www-data /var/www/html/nexopdv
```

## Observações Importantes
- Os arquivos são servidos diretamente pelo Nginx como conteúdo estático
- Não é necessário o uso do PM2 para este projeto frontend
- As configurações de cache foram otimizadas para melhor performance
