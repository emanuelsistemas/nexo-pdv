# Documentação da Integração Socket.io no Chat Nexo

## Problema: Loop Infinito de Conexão Socket.io

O componente Chat apresentava um erro crítico: "ERR_INSUFFICIENT_RESOURCES", causado por um loop infinito de tentativas de conexão Socket.io. Este documento descreve o problema, a solução e o processo de debugging que realizamos.

### Sintomas do Problema

1. **Erro no console**: `ERR_INSUFFICIENT_RESOURCES`
2. **Alto consumo de CPU/memória** causando travamento da aplicação
3. **Logs repetitivos** mostrando conexão e desconexão em sequência:
   ```
   useSocketIO.ts:222 useEffect para Socket.io executado. Habilitado: true
   useSocketIO.ts:199 Desconectando todos os sockets...
   useSocketIO.ts:222 useEffect para Socket.io executado. Habilitado: true
   useSocketIO.ts:199 Desconectando todos os sockets...
   ```
4. **Stack trace do erro** apontando para o componente Chat e ChatProvider:
   ```
   at ChatProvider (ChatContext.tsx:33:67)
   at main (<anonymous>)
   at div (<anonymous>)
   at div (<anonymous>)
   at NexoChatModular (NexoChatModular.tsx:8:20)
   ```

### Causas Identificadas

1. **Ciclo de dependências no useEffect**:
   - O useEffect reagia a mudanças do apiConfig
   - Porém, a função connectSocket também modificava estados internos
   - Isso causava re-renderizações que acionavam novamente o useEffect

2. **Componente não robusto a mudanças de estado**:
   - Cada mudança de estado provocava novas tentativas de conexão
   - Não havia controle de reconexões nem limite de tentativas

3. **Falta de verificação de conexão existente**:
   - O sistema tentava se conectar mesmo quando já existia uma conexão ativa
   - Isso levava a múltiplas instâncias do socket sendo criadas

## Página de Referência: UltraSimpleSocketTest

Criamos uma página de teste simplificada que implementava corretamente a conexão do Socket.io: http://localhost:5002/admin/ultra-socket

Esta página foi essencial para entender a sequência correta de operações:

1. **Verificar o status da instância via HTTP primeiro**
2. **Conectar o Socket.io somente após resposta HTTP positiva**
3. **Implementar gerenciamento adequado de eventos**

A abordagem da página UltraSimpleSocketTest serviu como base para nossa solução final.

## Tentativas de Solução

### Tentativa 1: Hook useSocketIO independente

Inicialmente, tentamos corrigir o hook useSocketIO.ts, adicionando:
- Limitador de número de tentativas
- Verificação do status da instância
- Melhor tratamento de erros

```typescript
// Adição de limites de tentativas
if (connectionAttempts >= 3) {
  console.log('Limite de tentativas atingido');
  return;
}
```

**Resultado**: Continuou causando loops, porque o controle de estado ainda dependia do ciclo de renderização do React.

### Tentativa 2: Remover completamente o hook

Tentamos remover o hook useSocketIO e todas as referências dele no Chat.tsx, eliminando a funcionalidade Socket.io.

**Resultado**: A aplicação parou de travar, mas perdemos a funcionalidade de atualização em tempo real.

### Tentativa 3: Reimplementação direta no componente Chat

Implementamos a funcionalidade Socket.io diretamente no componente Chat, mas ainda enfrentamos loops de conexão.

```typescript
// Ainda causava loops porque reagia a mudanças de estado
useEffect(() => {
  if (apiConfig) {
    connectSocket();
  }
  
  return () => {
    disconnectSocket();
  };
}, [apiConfig, connectSocket, disconnectSocket]);
```

## Solução Final: Padrão Avançado com Refs

A solução final implementa vários padrões para evitar loops de renderização:

1. **Uso de refs para controle de estado**:
   ```typescript
   const hasInitializedRef = useRef(false);
   const mountedRef = useRef(true);
   const apiConfigRef = useRef(apiConfig);
   ```

2. **useEffect com array de dependências vazio**:
   ```typescript
   useEffect(() => {
     // Código de inicialização
     return () => {
       // Código de limpeza
     };
   }, []); // <-- Vazio para executar apenas uma vez
   ```

3. **Atualização de ref para dados dinâmicos**:
   ```typescript
   useEffect(() => {
     apiConfigRef.current = apiConfig;
   }, [apiConfig]);
   ```

4. **Inicialização com timeout**:
   ```typescript
   const timer = setTimeout(attemptConnection, 2000);
   ```

5. **Verificações rigorosas antes de conectar**:
   ```typescript
   if (!apiConfig) {
     console.log('API Config ainda não disponível, abortando conexão');
     return;
   }
   
   if (connectionAttempts >= 3) {
     console.log('Atingido limite de 3 tentativas, parando conexão');
     return;
   }
   
   if (!mountedRef.current) {
     console.log('Componente desmontado, abortando conexão');
     return;
   }
   
   if (socketRef.current?.connected) {
     console.log('Já existe uma conexão ativa, abortando nova conexão');
     return;
   }
   ```

## Sequência de Conexão Socket.io

A sequência correta de conexão que implementamos foi:

1. **Verificar se o hook useWhatsAppInstance carregou a configuração** (apiConfig)
2. **Verificar o status da instância via HTTP**:
   ```typescript
   const statusUrl = `${baseUrl}/instance/connectionState/${instanceName}`;
   const response = await axios.get(statusUrl, { headers });
   ```

3. **Conectar o Socket.io** somente se status HTTP for 200:
   ```typescript
   const socket = io(baseUrl, {
     transports: ['websocket', 'polling'],
     query: { instance: instanceName },
     extraHeaders: { 'apikey': apikey },
     reconnection: true
   });
   ```

4. **Configurar os event listeners**:
   ```typescript
   socket.on('connect', () => { /* código */ });
   socket.on('disconnect', () => { /* código */ });
   socket.on('connect_error', () => { /* código */ });
   socket.on('messages.upsert', () => { /* código */ });
   ```

5. **Enviar mensagem de subscribe**:
   ```typescript
   socket.emit('subscribe', { action: 'subscribe', instance: instanceName });
   ```

## Lições Aprendidas

1. **Separar o ciclo de vida do React dos serviços externos** 
   - Use refs para manter estado sem causar re-renderizações
   - Inicialize conexões apenas uma vez com array de dependências vazio

2. **Estabelecer limites de tentativas e tratamento de erros**
   - Defina um número máximo de tentativas de conexão
   - Evite loops infinitos usando flags e refs

3. **Sequência correta de operações**
   - Verificar status HTTP antes de conectar WebSocket
   - Enviar subscribe somente após conexão estabelecida

4. **Logging extensivo para debugging**
   - Adicione logs detalhados para cada etapa do processo
   - Use timestamps em logs para visualizar a sequência

## Componentes Envolvidos

1. **src/components/chat/Chat.tsx**: Componente principal que implementa a conexão Socket.io
2. **src/hooks/useWhatsAppInstance.ts**: Fornece a configuração da API (url, instância, apikey)
3. **src/pages/UltraSimpleSocketTest.tsx**: Página de referência para implementação correta

## Guia de Implementação: Conectando ao Socket.io

Este guia detalhado mostra como implementar corretamente uma conexão Socket.io em um componente React, evitando loops de renderização e problemas de desempenho.

### Pré-requisitos

- Configuração da API (URL, nome da instância, apikey)
- Biblioteca Socket.io-client instalada
- Axios para requisições HTTP

### Passo 1: Importações e configuração inicial

```typescript
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const MeuComponenteComSocketIO: React.FC = () => {
  // Estado para Socket.io
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [socketError, setSocketError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
  // Refs para controle de ciclo de vida
  const hasInitializedRef = useRef(false);
  const mountedRef = useRef(true);
  
  // Config da API (geralmente vinda de um hook ou props)
  const apiConfig = {
    baseUrl: "https://sua-api.com",
    instanceName: "sua-instancia",
    apikey: "sua-api-key"
  };
  
  // Ref para apiConfig
  const apiConfigRef = useRef(apiConfig);
```

### Passo 2: Função para conectar ao Socket.io

```typescript
  // Função para conectar o Socket.io
  const connectSocket = useCallback(async () => {
    console.log(`=== CONNECT SOCKET CALLED === [API Config: ${!!apiConfigRef.current}]`);
    
    // Verificações para evitar tentativas desnecessárias
    if (!apiConfigRef.current) {
      console.log('API Config não disponível, abortando conexão');
      return;
    }
    
    if (connectionAttempts >= 3) {
      console.log('Atingido limite de 3 tentativas, parando conexão');
      return;
    }
    
    if (!mountedRef.current) {
      console.log('Componente desmontado, abortando conexão');
      return;
    }
    
    if (socketRef.current?.connected) {
      console.log('Já existe uma conexão ativa');
      return;
    }
    
    try {
      setConnectionAttempts(prev => prev + 1);
      
      // PASSO 1: Verificar o status da instância via HTTP
      const { baseUrl, instanceName, apikey } = apiConfigRef.current;
      
      // Configurar headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (apikey && apikey.trim() !== '') {
        headers['apikey'] = apikey;
      }
      
      // Verificar status da instância
      const statusUrl = `${baseUrl}/instance/connectionState/${instanceName}`;
      console.log(`Verificando status: ${statusUrl}`);
      
      const response = await axios.get(statusUrl, { headers });
      
      if (response.status !== 200) {
        throw new Error(`Erro ao verificar status: ${response.status}`);
      }
      
      console.log('Status da instância:', response.data);
      
      // PASSO 2: Conectar Socket.io
      console.log('Conectando Socket.io...');
      
      const socket = io(baseUrl, {
        transports: ['websocket', 'polling'],
        query: {
          instance: instanceName
        },
        extraHeaders: {
          'apikey': apikey
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      // PASSO 3: Configurar eventos do socket
      socket.onAny((event, ...args) => {
        console.log(`Socket.io evento: ${event}`, args);
      });
      
      socket.on('connect', () => {
        console.log(`Socket.io conectado! ID: ${socket.id}`);
        setIsConnected(true);
        setSocketError(null);
        setConnectionAttempts(0); // Resetar contador após sucesso
        
        // PASSO 4: Enviar subscribe
        const subscribeMessage = {
          action: 'subscribe',
          instance: instanceName
        };
        console.log('Enviando subscribe:', subscribeMessage);
        socket.emit('subscribe', subscribeMessage);
        
        // Formato alternativo também usado em algumas implementações
        socket.emit('subscribe', instanceName);
      });
      
      socket.on('disconnect', (reason) => {
        console.log(`Socket.io desconectado. Razão: ${reason}`);
        setIsConnected(false);
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket.io erro de conexão:', error.message);
        setSocketError(`Erro de conexão: ${error.message}`);
      });
      
      socket.on('messages.upsert', (data) => {
        console.log('Nova mensagem recebida:', data);
        // Processar mensagem recebida
      });
      
      socketRef.current = socket;
      
    } catch (error) {
      console.error('Erro ao conectar Socket.io:', error);
      setSocketError(`Erro: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [connectionAttempts]);
```

### Passo 3: Função para desconectar

```typescript
  // Função para desconectar o Socket.io
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('Desconectando Socket.io');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);
```

### Passo 4: Gerenciamento do ciclo de vida com useEffect

```typescript
  // Manter a ref atualizada quando apiConfig mudar
  useEffect(() => {
    apiConfigRef.current = apiConfig;
  }, [apiConfig]);
  
  // useEffect para inicialização - executado apenas UMA vez
  useEffect(() => {
    console.log("=== MOUNT EFFECT ====");
    // Marcar componente como montado
    mountedRef.current = true;
    
    // Função para tentar conexão com delay
    const attemptConnection = () => {
      if (mountedRef.current && apiConfigRef.current && !hasInitializedRef.current) {
        console.log("=== TENTANDO INICIALIZAÇÃO ====");
        hasInitializedRef.current = true;
        connectSocket();
      }
    };
    
    // Tenta conexão após 2 segundos para garantir que tudo carregou
    console.log("Agendando tentativa de conexão após 2 segundos...");
    const timer = setTimeout(attemptConnection, 2000);
    
    return () => {
      console.log("=== UNMOUNT EFFECT ====");
      mountedRef.current = false;
      clearTimeout(timer);
      disconnectSocket();
    };
  }, []);  // <-- Dependencies vazias para executar apenas uma vez
  
  // Renderização do componente
  return (
    <div>
      {/* Interface do componente */}
      <div>Status: {isConnected ? 'Conectado' : 'Desconectado'}</div>
      {socketError && <div>Erro: {socketError}</div>}
    </div>
  );
};
```

### Pontos Importantes

1. **Uso de refs para evitar loops**:
   - `hasInitializedRef` - Controla se já inicializamos a conexão
   - `mountedRef` - Controla se o componente está montado
   - `apiConfigRef` - Mantém a configuração atual disponível para funções assincronas
   - `socketRef` - Mantém a referência ao socket

2. **Array de dependências vazio no useEffect principal**:
   - Evita execuções repetidas quando o estado mudar
   - Usa timeout para inicialização com delay

3. **Verificações robustas antes de conectar**:
   - Verifica API config
   - Limita tentativas de conexão
   - Verifica se componente está montado
   - Verifica conexão existente

4. **Sequência correta de operações**:
   - Verificar status HTTP primeiro
   - Conectar Socket.io depois
   - Configurar event listeners
   - Enviar comandos de subscribe
   
### Potenciais Problemas e Soluções

1. **Socket não conecta**:
   - Verifique se a URL, instância e apikey estão corretas
   - Confirme se o servidor aceita conexões WebSocket
   - Verifique CORS e configurações de proxy em desenvolvimento

2. **Recebendo erros de conexão**:
   - Adicione logs detalhados para eventos de erro
   - Verifique se os headers estão formatados corretamente
   - Confirme se a API está acessível com uma requisição HTTP simples

3. **Não recebe eventos**:
   - Confirme se o 'subscribe' foi enviado
   - Verifique se está escutando o evento correto
   - Confirme que o servidor está enviando os eventos

## Conclusão

O padrão implementado oferece uma solução robusta para integração de WebSockets em aplicações React, evitando loops de renderização e garantindo que a conexão seja estabelecida apenas uma vez durante o ciclo de vida do componente.

Essa abordagem pode ser reutilizada em outros componentes que necessitem de conexões em tempo real, garantindo estabilidade e performance.
