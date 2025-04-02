# Configuração de Portas do Nenxo PDV

Este documento descreve a configuração de portas e ambientes do projeto Nenxo PDV.

## Ambientes e Portas

O projeto Nenxo PDV está configurado para funcionar em dois ambientes distintos, cada um em sua própria porta:
1. **Ambiente de Desenvolvimento**: Porta 5002
1. **Ambiente de Desenvolvimento**: Porta 5001
   - Usado para desenvolvimento e testes
   - Executado com hot reload para facilitar o desenvolvimento

2. **Ambiente de Produção**: Porta 5000
   - Versão otimizada para uso em produção
   - Servido através do Nginx no domínio `nexopdv.emasoftware.io`

## Gerenciando os Ambientes

### Ambiente de Desenvolvimento (Porta 5001)

Para iniciar o ambiente de desenvolvimento:

```bash
pm2 start ecosystem.config.cjs --only nenxo-pdv-dev
```

O servidor estará disponível em: http://localhost:5002

### Ambiente de Produção (Porta 5000)

Para construir e iniciar o ambiente de produção:

```bash
./build.sh
```

Este script realiza as seguintes operações:
1. Para qualquer instância anterior em execução
2. Instala as dependências necessárias
3. Constrói a aplicação para produção
4. Inicia o servidor na porta 5000

O servidor estará disponível em: http://localhost:5000

Alternativamente, você pode iniciar manualmente o ambiente de produção após o build:

```bash
pnpm run build
pm2 start ecosystem.config.cjs --only nenxo-pdv-prod
```

## Nginx e Acesso Externo

A configuração do Nginx permite que o aplicativo seja acessado através do domínio `nexopdv.emasoftware.io`, direcionando o tráfego para a porta 5000 (ambiente de produção).

Para instalar a configuração do Nginx:

```bash
sudo cp $(pwd)/nginx/nexopdv.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/nexopdv.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Monitoramento e Logs

Para monitorar os serviços em execução:

```bash
pm2 ls
```

Para visualizar os logs:

```bash
pm2 logs nenxo-pdv-dev    # Logs de desenvolvimento
pm2 logs nenxo-pdv-prod   # Logs de produção
```

Para monitoramento avançado:

```bash
pm2 monit
```

## Reinício e Manutenção

Para reiniciar os serviços:

```bash
pm2 restart nenxo-pdv-dev   # Reiniciar ambiente de desenvolvimento
pm2 restart nenxo-pdv-prod  # Reiniciar ambiente de produção
```

Para parar os serviços:

```bash
pm2 stop nenxo-pdv-dev      # Parar ambiente de desenvolvimento
pm2 stop nenxo-pdv-prod     # Parar ambiente de produção
```

Para remover os serviços:

```bash
pm2 delete nenxo-pdv-dev    # Remover ambiente de desenvolvimento
pm2 delete nenxo-pdv-prod   # Remover ambiente de produção