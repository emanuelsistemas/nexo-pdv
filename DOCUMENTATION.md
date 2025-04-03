# Documentação Técnica - Nexo PDV

## Arquitetura do Projeto

### Frontend

O projeto utiliza uma arquitetura baseada em componentes React com TypeScript, seguindo as melhores práticas de desenvolvimento web moderno.

#### Estrutura de Diretórios

```
src/
├── components/     # Componentes reutilizáveis
├── lib/           # Bibliotecas e configurações
├── pages/         # Páginas da aplicação
├── styles/        # Estilos globais
└── types/         # Definições de tipos TypeScript
```

### Backend (Supabase)

O backend é gerenciado pelo Supabase, oferecendo:
- Banco de dados PostgreSQL
- Autenticação e autorização
- Row Level Security (RLS)
- Realtime subscriptions

## Componentes Principais

### CompanySlidePanel
Painel lateral para gerenciamento de dados da empresa:
- Cadastro inicial
- Edição de informações
- Validação de campos
- Formatação automática de documentos

### Dashboard
Interface principal com:
- Grid layout personalizável
- Navegação por pastas
- Pesquisa de itens
- Menu de usuário
- Barra de status

## Autenticação

### Fluxo de Autenticação
1. Registro de usuário
   - Validação de email
   - Criação de perfil
   - Status inicial da empresa

2. Login
   - Validação de credenciais
   - Redirecionamento para dashboard
   - Gestão de sessão

3. Recuperação de Senha
   - Envio de email
   - Validação de token
   - Atualização de senha

## Políticas de Segurança (RLS)

### Profiles
```sql
-- Leitura
CREATE POLICY "Usuários podem ler seu próprio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Atualização
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### Companies
```sql
-- Leitura
CREATE POLICY "Usuários podem ver sua própria empresa"
  ON companies FOR SELECT
  USING (id IN (SELECT company_id FROM profiles WHERE profiles.id = auth.uid()));

-- Inserção
CREATE POLICY "Usuários autenticados podem criar empresas"
  ON companies FOR INSERT
  WITH CHECK (true);

-- Atualização
CREATE POLICY "Usuários podem atualizar sua própria empresa"
  ON companies FOR UPDATE
  USING (id IN (SELECT company_id FROM profiles WHERE profiles.id = auth.uid()));
```

## Integração com Supabase

### Configuração do Cliente
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: localStorage,
    site: window.location.origin
  }
});
```

### Manipulação de Redirecionamentos
```typescript
export const handleAuthRedirect = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (session) {
    window.location.hash = '';
    return true;
  }
  return false;
};
```

## Estilização

### Temas e Cores
- Esquema escuro por padrão
- Gradientes para elementos de destaque
- Cores principais:
  - Azul: `#3B82F6` (primary)
  - Slate: `#1E293B` (background)
  - Cyan: `#22D3EE` (accent)

### Componentes Estilizados
- Botões com gradiente e hover states
- Inputs com foco e estados de erro
- Cards com sombras e bordas suaves
- Modais com overlay escuro

## Gerenciamento de Estado

### Local Storage
- Layout do grid
- Preferências do usuário
- Tokens de autenticação

### Estado React
- Formulários
- UI states
- Dados temporários

## Tratamento de Erros

### Frontend
- Toast notifications
- Feedback visual
- Mensagens amigáveis
- Console logging

### Backend
- Validação de dados
- Constraints de banco
- Políticas de segurança
- Logs de erro

## Boas Práticas para Formulários e Ações

### Prevenção de Recarregamento de Página
- **IMPORTANTE:** Nunca usar `type="submit"` em botões que realizam operações assíncronas com o Supabase ou qualquer API
- Sempre usar `type="button"` para botões que manipulam dados e prevenir o comportamento padrão de submissão
- Implementar manipuladores de eventos personalizados que chamam `preventDefault()` para evitar recarregamento da página

### Implementação Correta
```typescript
// Correto ✅
<form className="p-6 space-y-4">
  {/* Conteúdo do formulário */}
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }}
    className="btn-primary"
  >
    Enviar
  </button>
</form>

// Incorreto ❌
<form onSubmit={handleSubmit} className="p-6 space-y-4">
  {/* Conteúdo do formulário */}
  <button type="submit" className="btn-primary">
    Enviar
  </button>
</form>
```

### Razões para essa Abordagem
- Evita perda de contexto/estado na aplicação SPA
- Permite controle total sobre o fluxo de submissão
- Facilita o tratamento de erros e feedback visual
- Impede interrupção de operações assíncronas

## Performance

### Otimizações
- Code splitting
- Lazy loading
- Memoização
- Debounce em pesquisas

### Caching
- Dados do usuário
- Configurações
- Layout do grid

## Deployment

### Requisitos
- Node.js 18+
- NPM ou Yarn
- Variáveis de ambiente configuradas

### Build
```bash
npm run build
```

### Produção
- Arquivos otimizados
- Assets comprimidos
- Source maps
- Cache headers

## Manutenção

### Logs
- Erros de autenticação
- Operações de banco
- Ações do usuário
- Performance metrics

### Backups
- Banco de dados
- Configurações
- Dados do usuário

### Monitoramento
- Status do servidor
- Métricas de uso
- Erros e exceções
- Tempo de resposta