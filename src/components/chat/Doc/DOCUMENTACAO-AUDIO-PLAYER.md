# Documentação: Player de Áudio para Mensagens do WhatsApp

## Visão Geral

Este documento descreve a implementação do sistema de reprodução de mensagens de áudio do WhatsApp no Nexo PDV. O sistema permite que mensagens de áudio recebidas de contatos sejam reproduzidas diretamente na interface do chat.

## Componentes Implementados

### 1. AudioPlayer (AudioPlayer.tsx)

Componente React responsável pela reprodução de áudio com:
- Controles de play/pause
- Barra de progresso interativa 
- Exibição de tempo atual e duração total
- Indicador para mensagens de voz (PTT - Push To Talk)
- Design responsivo e adaptável a temas claros/escuros

### 2. Expansão do Tipo ChatMessage

Expandimos a interface `ChatMessage` para suportar diferentes tipos de mensagem:

```typescript
interface AudioMessageData {
  url: string;        // URL do áudio no servidor do WhatsApp
  mimetype: string;   // Tipo MIME (geralmente audio/ogg ou audio/mp4)
  seconds: number;    // Duração em segundos
  ptt: boolean;       // Indica se é mensagem de voz (Push-To-Talk)
  fileLength?: string; // Tamanho do arquivo em bytes
}

interface ChatMessage {
  // ...campos existentes
  type?: 'text' | 'audio' | 'image' | 'video'; // Tipo de mensagem
  audioData?: AudioMessageData; // Dados específicos para mensagens de áudio
}
```

### 3. Atualização do MessageItem

O componente `MessageItem` foi atualizado para renderizar diferentes tipos de conteúdo com base no tipo da mensagem, incluindo o player de áudio quando apropriado.

## Processamento de Mensagens de Áudio

Quando uma mensagem de áudio é recebida via webhook da Evolution API, o sistema:

1. Identifica o tipo de mensagem como 'audio'
2. Extrai os dados relevantes do áudio (URL, duração, etc.)
3. Estrutura esses dados no formato `AudioMessageData`
4. Passa esses dados para o componente `MessageItem`
5. O `MessageItem` renderiza o `AudioPlayer` quando detecta uma mensagem do tipo áudio

## Como Funciona a Reprodução

O player utiliza a tag nativa `<audio>` do HTML5 para reproduzir as mensagens:

1. O URL do áudio é carregado com `preload="metadata"` para otimização
2. A reprodução é controlada via JavaScript com os métodos `play()` e `pause()`
3. Eventos como `timeupdate` e `ended` são usados para atualizar a interface
4. A barra de progresso permite busca interativa no áudio

## Limitações e Considerações

- **Formatos Suportados**: O player depende dos formatos suportados pelo navegador do usuário
- **Conexão com a Internet**: Necessária para streaming dos arquivos de áudio
- **Compatibilidade da API**: Funciona com a Evolution API v2.x+ que fornece URLs de áudio acessíveis
- **Cache**: Os arquivos de áudio não são armazenados localmente, exigindo download a cada reprodução

## Testes e Validação

Para testar o player de áudio:

1. **Receber uma mensagem de áudio**: Solicite que um contato envie uma mensagem de voz
2. **Verificar no console**: Verifique os logs para confirmar que os dados de áudio foram extraídos
3. **Testar a reprodução**: Verifique se o player é exibido e funciona corretamente

## Resolução de Problemas

Se houver problemas com a reprodução de áudio:

1. **URLs inacessíveis**: Verifique se a URL do áudio é acessível diretamente
2. **CORS**: Certifique-se de que não há bloqueios de CORS impedindo o acesso aos arquivos
3. **Dados incompletos**: Confirme que todos os campos necessários estão presentes nos dados de áudio
4. **Formato não suportado**: Verifique se o navegador suporta o formato de áudio recebido
