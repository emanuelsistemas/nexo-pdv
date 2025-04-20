# API PostgreSQL para Supabase

API RESTful que se conecta diretamente ao PostgreSQL do Supabase, proporcionando operações de leitura e escrita de dados através de endpoints padronizados.

## Características

- Conexão direta com o PostgreSQL do Supabase
- Suporte completo para operações CRUD (Criar, Ler, Atualizar, Deletar)
- Estrutura organizada usando o padrão repositório
- Validação de dados com Pydantic
- Endpoints RESTful organizados com FastAPI
- Suporte para paginação e filtros

## Estrutura do Projeto

- `config.py` - Configuração de conexão com o PostgreSQL
- `repository.py` - Implementação do padrão repositório para acessar o banco de dados
- `schemas.py` - Modelos de dados usando Pydantic
- `api.py` - Definição dos endpoints da API usando FastAPI

## Configuração

1. Clone o repositório
2. Instale as dependências:
   ```bash
   python -m venv venv
   source venv/bin/activate  # No Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Configure o arquivo `.env` com a string de conexão do PostgreSQL:
   ```
   DATABASE_URL=postgresql://usuario:senha@host:porta/database
   ```

## Uso

### Iniciar o servidor

```bash
source venv/bin/activate  # No Windows: venv\Scripts\activate
python api.py
```

O servidor será iniciado em `http://localhost:8000`

### Documentação da API

Acesse a documentação interativa em `http://localhost:8000/docs`

### Endpoints Disponíveis

#### Produtos
- `GET /products/` - Listar produtos
- `GET /products/{id}` - Obter produto específico
- `POST /products/` - Criar produto
- `PATCH /products/{id}` - Atualizar produto
- `DELETE /products/{id}` - Remover produto

#### Grupos de Produtos
- `GET /product-groups/` - Listar grupos de produtos
- `GET /product-groups/{id}` - Obter grupo específico
- `POST /product-groups/` - Criar grupo
- `PATCH /product-groups/{id}` - Atualizar grupo
- `DELETE /product-groups/{id}` - Remover grupo

#### Unidades de Produtos
- `GET /product-units/` - Listar unidades
- `GET /product-units/{id}` - Obter unidade específica
- `POST /product-units/` - Criar unidade
- `PATCH /product-units/{id}` - Atualizar unidade
- `DELETE /product-units/{id}` - Remover unidade

#### Empresas
- `GET /companies/` - Listar empresas
- `GET /companies/{id}` - Obter empresa específica
- `POST /companies/` - Criar empresa
- `PATCH /companies/{id}` - Atualizar empresa
- `DELETE /companies/{id}` - Remover empresa

#### Movimentos de Estoque
- `GET /stock-movements/` - Listar movimentos
- `GET /stock-movements/{id}` - Obter movimento específico
- `POST /stock-movements/` - Criar movimento
- `PATCH /stock-movements/{id}` - Atualizar movimento
- `DELETE /stock-movements/{id}` - Remover movimento
