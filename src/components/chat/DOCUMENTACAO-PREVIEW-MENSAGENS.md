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
