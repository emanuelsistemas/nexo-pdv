# Nexo PDV

Sistema de PDV (Ponto de Venda) moderno e intuitivo desenvolvido com React, Tailwind CSS e Supabase.

![Nexo PDV](https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1200&h=400)

## 🚀 Tecnologias

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/)
- [React Router DOM](https://reactrouter.com/)
- [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout)
- [Lucide React](https://lucide.dev/)
- [React Toastify](https://fkhadra.github.io/react-toastify/)

## 📋 Pré-requisitos

- Node.js 18.x ou superior
- NPM ou Yarn
- Conta no Supabase

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/nexo-pdv.git
cd nenxo-pdv
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` na raiz do projeto
   - Copie o conteúdo de `.env.example`
   - Preencha com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas

#### profiles
- `id` (uuid, PK) - ID do usuário
- `name` (text) - Nome completo
- `company_id` (uuid, FK) - Referência para empresa
- `status_cad_empresa` (char) - Status do cadastro da empresa
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### companies
- `id` (uuid, PK) - ID da empresa
- `segment` (text) - Segmento/ramo
- `document_type` (text) - Tipo de documento (CNPJ/CPF)
- `document_number` (text) - Número do documento
- `legal_name` (text) - Razão social
- `trade_name` (text) - Nome fantasia
- `email` (text)
- `whatsapp` (text)
- `state_registration` (text)
- `tax_regime` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## 🔐 Autenticação

O sistema utiliza autenticação via Supabase Auth com:
- Login com email/senha
- Registro de novos usuários
- Recuperação de senha
- Confirmação de email

## 📱 Funcionalidades

- Dashboard interativo com grid layout personalizável
- Gerenciamento de empresa
- Sistema de autenticação completo
- Interface responsiva e moderna
- Feedback visual com toasts
- Navegação intuitiva
- Formatação monetária brasileira (usando vírgula como separador decimal)

## ⚠️ Convenções e Padrões Importantes

### Formatação Monetária Brasileira

O sistema utiliza um padrão de formatação monetária adaptado para o mercado brasileiro, usando **vírgula como separador decimal** na interface de usuário enquanto mantém o formato internacional no banco de dados.

**IMPORTANTE:** Esta implementação é intencional e não deve ser alterada. Ela garante a melhor experiência para usuários brasileiros sem comprometer a integridade dos dados.

[Leia a documentação completa sobre a formatação monetária brasileira](./docs/formatacao-monetaria-brasileira.md)

### Deploy em Produção

Para realizar o deploy em produção, siga o processo documentado que inclui:
- Geração de build otimizado com Vite
- Configuração do servidor NGINX
- Ajustes necessários nos arquivos estáticos
- Verificação e solução de problemas comuns

[Consulte o guia completo de deploy para produção](./docs/deploy-producao.md)

## 🌐 Ambientes

O sistema opera em dois ambientes principais:

### Desenvolvimento
```bash
npm run dev
```
Inicia o servidor de desenvolvimento com hot-reload e funcionalidades para debugging.

### Produção
```bash
npm run build
```
Gera arquivos estáticos otimizados na pasta `dist/` que devem ser copiados para o servidor web.

Consulte o [guia de deploy](./docs/deploy-producao.md) para instruções detalhadas sobre como configurar o ambiente de produção.

## 🛠️ Desenvolvimento

Para contribuir com o projeto:

1. Crie uma branch para sua feature:
```bash
git checkout -b feature/nova-funcionalidade
```

2. Faça commit das mudanças:
```bash
git commit -m 'feat: adiciona nova funcionalidade'
```

3. Envie para a branch:
```bash
git push origin feature/nova-funcionalidade
```

4. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Suporte

Para suporte, envie um email para suporte@nexopdv.com.br ou abra uma issue no repositório.
