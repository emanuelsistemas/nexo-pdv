# Solução de Navegação no Nexo PDV

## Problema

O sistema Nexo PDV apresentava um problema de navegação onde, ao fechar aplicativos como Unidade.app, Grupos.app, Produtos.app e Clientes.app, o usuário era sempre redirecionado para o Dashboard principal, perdendo o contexto de onde havia partido. Isso criava uma experiência de usuário inconsistente e confusa, especialmente quando o usuário acessava esses aplicativos a partir de pastas específicas no Dashboard.

## Solução Implementada

A solução implementada utiliza o sistema de estado do React Router para rastrear a origem da navegação e garantir que o usuário retorne ao contexto correto após fechar um aplicativo.

### Componentes Modificados

1. **Dashboard.tsx**
   - Modificado para passar informações de estado ao navegar para os aplicativos
   - Implementado para reconhecer o estado ao retornar e abrir a pasta correta

2. **Aplicativos (Unidade.tsx, Grupo.tsx, Produtos.tsx, Clientes.tsx)**
   - Adicionado o hook `useLocation` para acessar o estado de navegação
   - Implementada a função `handleClose` que verifica o estado e redireciona adequadamente

### Fluxo de Navegação

1. **Navegação para o Aplicativo:**
   ```typescript
   // No Dashboard.tsx
   navigate('/unidade', { state: { from: 'produtos-folder' } });
   ```

2. **Fechamento do Aplicativo:**
   ```typescript
   // Nos componentes de aplicativo (ex: Unidade.tsx)
   const handleClose = () => {
     if (location.state && location.state.from === 'produtos-folder') {
       navigate('/dashboard', { state: { openFolder: 'produtos' } });
     } else {
       navigate('/dashboard');
     }
   };
   ```

3. **Retorno ao Dashboard:**
   O Dashboard reconhece o estado `openFolder` e abre a pasta correspondente.

## Detalhes Técnicos

### Passagem de Estado

O estado é passado como um objeto durante a navegação usando o segundo parâmetro da função `navigate` do React Router:

```typescript
navigate('/caminho', { state: { chave: 'valor' } });
```

### Acesso ao Estado

O estado é acessado usando o hook `useLocation` do React Router:

```typescript
const location = useLocation();
// Acesso ao estado
if (location.state && location.state.from === 'produtos-folder') {
  // Lógica baseada no estado
}
```

### Estrutura do Estado

- **Ao navegar para um aplicativo:**
  - `from`: Indica a origem da navegação (ex: 'produtos-folder', 'clientes-folder')

- **Ao retornar ao Dashboard:**
  - `openFolder`: Indica qual pasta deve ser aberta (ex: 'produtos', 'clientes')

## Benefícios

1. **Experiência de Usuário Consistente:**
   - O usuário retorna sempre ao contexto de onde partiu
   - Reduz a frustração e melhora a usabilidade

2. **Manutenção Simplificada:**
   - Solução centralizada e consistente em todos os componentes
   - Fácil de estender para novos aplicativos ou fluxos de navegação

3. **Sem Estado Global:**
   - Utiliza apenas os recursos nativos do React Router
   - Evita a necessidade de gerenciadores de estado adicionais

## Exemplo de Implementação

### No Dashboard.tsx

```typescript
const handleItemClick = (item: GridItem) => {
  if (isDragging) return;
  
  setSelectedItem(item.i);
  
  if (item.type === 'app') {
    if (item.i === 'produtos-app') {
      navigate('/produtos', { state: { from: 'produtos-folder' } });
      return;
    } else if (item.i === 'unidade-app') {
      navigate('/unidade', { state: { from: 'produtos-folder' } });
      return;
    } else if (item.i === 'grupos-app') {
      navigate('/grupo', { state: { from: 'produtos-folder' } });
      return;
    } else if (item.i === 'clientes-app') {
      navigate('/clientes', { state: { from: 'clientes-folder' } });
      return;
    }
  }
  // ...
};
```

### Nos Componentes de Aplicativo (ex: Unidade.tsx)

```typescript
import { useNavigate, useLocation } from 'react-router-dom';

export default function Unidade() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ...
  
  const handleClose = () => {
    if (location.state && location.state.from === 'produtos-folder') {
      navigate('/dashboard', { state: { openFolder: 'produtos' } });
    } else {
      navigate('/dashboard');
    }
  };
  
  // ...
  
  return (
    // ...
    <button onClick={handleClose}>
      <X size={20} />
    </button>
    // ...
  );
}
```

## Possíveis Melhorias Futuras

1. **Histórico de Navegação mais Robusto:**
   - Implementar um sistema que rastreie múltiplos níveis de navegação
   - Permitir retorno a qualquer ponto do histórico

2. **Animações de Transição:**
   - Adicionar animações para tornar a navegação mais fluida e intuitiva

3. **Componente de Navegação Reutilizável:**
   - Criar um componente HOC (High Order Component) para encapsular a lógica de navegação
   - Simplificar a implementação em novos componentes

## Conclusão

A solução implementada resolve o problema de navegação de forma eficiente e elegante, utilizando apenas os recursos nativos do React Router. Isso melhora significativamente a experiência do usuário ao manter o contexto de navegação e garantir um comportamento consistente em todo o sistema.
