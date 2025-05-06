# Documentação: Sistema de Prévias de Mensagens em Tempo Real

## Visão Geral

Este documento descreve a implementação do sistema de prévias de mensagens em tempo real para o chat do Nexo PDV, garantindo que as últimas mensagens sejam exibidas na lista de conversas sem depender exclusivamente do banco de dados.

## Problema Resolvido

No sistema original, as prévias das mensagens (texto exibido abaixo do nome do contato na lista de conversas) eram armazenadas apenas no banco de dados. Isso causava dois problemas:

1. **Latência**: As prévias só apareciam após a atualização da página ou após um atraso significativo
2. **Inconsistência**: Mensagens recebidas em tempo real não atualizavam a prévia na interface imediatamente

## Solução Implementada

Implementamos um sistema de camadas que prioriza dados em tempo real com fallback para dados persistentes:

1. **Socket → localStorage → Interface**: Fluxo de dados em tempo real
2. **Banco de dados → Interface**: Fluxo de dados persistente (usado como fallback)

### Componentes Principais

1. **MessagePreview component (ConversationList.tsx)**
   - Componente dedicado para exibir prévias de mensagens
   - Prioriza dados do localStorage sobre dados do banco de dados
   - Aplica truncamento para garantir layout consistente

## Problema de "Piscadas" e Solução

### Problema Identificado

Após a implementação inicial, identificou-se um problema de "piscadas" (flickering) nas prévias de mensagens, especialmente quando:

1. Uma conversa era selecionada pelo usuário
2. Havia carregamento simultâneo de avatares e prévias
3. Ocorriam múltiplas atualizações de estado em curto período

Este problema era causado principalmente por:

- Ciclos de renderização desencadeados por useEffect
- Atualizações frequentes de estado (useState)
- Logs de console excessivos que acionavam rerenderizações
- Múltiplos setters de estado na seleção de conversa

### Solução Aplicada

Para resolver o problema, implementamos as seguintes mudanças:

1. **Simplificação do MessagePreview**:
   - Transformado em componente puramente funcional
   - Removido o uso de useState e useEffect
   - Eliminada qualquer atualização de estado dinamicamente

2. **Redução de Renderizações**:
   - Cálculo da prévia feito apenas uma vez durante a renderização
   - Priorização de valores locais sem tentativas de atualização posterior

3. **Otimização da handleSelectConversation**:
   - Reordenada sequência de atualização de estados para priorizar feedback visual
   - Operações de banco de dados movidas para segundo plano

### Como Resolver se Ocorrer Novamente

Se o problema de "piscadas" nas prévias reaparecer, siga estas etapas:

1. **Verifique o Componente MessagePreview**:
   ```tsx
   // Garanta que o componente seja puramente funcional sem hooks
   const MessagePreview: React.FC<MessagePreviewProps> = ({ conversationId, databasePreview }) => {
     // Buscar a prévia apenas uma vez ao renderizar
     const localPreview = getMessagePreviewFromLocalStorage(conversationId);
     
     // Usar valor estático sem atualizações dinâmicas
     const preview = (localPreview && localPreview.content) || databasePreview || null;
     
     return (
       <p className="text-sm text-gray-400 truncate">
         {truncateText(preview, 30)}
       </p>
     );
   };
   ```

2. **Elimine Ciclos de Renderização**:
   - Remova logs excessivos, especialmente em eventos
   - Evite useEffect com dependências que mudam frequentemente
   - Use React.memo() para componentes estáveis

2. **saveMessagePreviewToLocalStorage (Chat.tsx)**
   - Captura prévias de mensagens diretamente do socket
   - Armazena no localStorage com timestamp
   - Estrutura para fácil recuperação usando o ID da conversa como chave

3. **getMessagePreviewFromLocalStorage (ConversationList.tsx)**
   - Recupera prévias de mensagens do localStorage
   - Verifica se os dados estão disponíveis e são válidos

### Fluxo de Dados

#### Recebimento de Mensagens
```
Socket → processMessages() → saveMessagePreviewToLocalStorage() → localStorage
```

#### Exibição na Interface
```
ConversationList → MessagePreview → getMessagePreviewFromLocalStorage() → Exibição
```

## Código-Chave

### Armazenamento da Prévia (Chat.tsx)
```typescript
const saveMessagePreviewToLocalStorage = (remoteJid: string, content: string, timestamp: Date) => {
  try {
    // Obter o cache existente ou criar um novo objeto
    const messagePreviewCache = JSON.parse(localStorage.getItem('whatsapp_message_preview_cache') || '{}');
    
    // Adicionar/atualizar a entrada para este contato
    messagePreviewCache[remoteJid] = {
      content,
      timestamp: timestamp.getTime()
    };
    
    // Salvar o cache atualizado
    localStorage.setItem('whatsapp_message_preview_cache', JSON.stringify(messagePreviewCache));
  } catch (error) {
    console.error(`[Chat] Erro ao salvar prévia no localStorage:`, error);
  }
};
```

### Exibição da Prévia (ConversationList.tsx)
```typescript
const MessagePreview: React.FC<MessagePreviewProps> = ({ conversationId, databasePreview }) => {
  const [preview, setPreview] = useState<string | null>(databasePreview || null);
  
  useEffect(() => {
    // Tentar obter a prévia mais recente do localStorage
    const localPreview = getMessagePreviewFromLocalStorage(conversationId);
    
    if (localPreview && localPreview.content) {
      // Sempre preferir a prévia do localStorage pois ela é em tempo real
      setPreview(localPreview.content);
    }
  }, [conversationId, databasePreview]);
  
  return (
    <p className="text-sm text-gray-400 truncate">
      {truncateText(preview, 30)}
    </p>
  );
};
```

## Vantagens desta Abordagem

1. **Atualização em tempo real**: As prévias são atualizadas instantaneamente, sem depender do banco
2. **Experiência consistente**: Usuários veem as mesmas prévias em diferentes dispositivos eventualmente
3. **Persistência**: O banco de dados garante que os dados permaneçam entre sessões diferentes
4. **Resiliência**: Funciona mesmo com problemas temporários no banco de dados

## Solução de Problemas

Se as prévias não estiverem aparecendo ou atualizando corretamente:

1. Verifique se o componente MessagePreview está sendo usado na lista de conversas
2. Confirme que saveMessagePreviewToLocalStorage está sendo chamado no processamento de mensagens
3. Verifique o localStorage no navegador (DevTools → Application → Local Storage)
4. Limpe o localStorage para resolução de problemas (localStorage.clear())
5. Verifique os logs no console para erros específicos
