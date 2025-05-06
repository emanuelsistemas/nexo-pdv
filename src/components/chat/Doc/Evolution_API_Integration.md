# Documentação de Integração com Evolution API

Esta documentação detalha os endpoints e eventos de Socket.io da Evolution API utilizados no sistema Nexo PDV para integração com WhatsApp.

## Configuração Básica

### Parâmetros Necessários
```typescript
{
  baseUrl: "https://evolution-api.example.com", // URL base da Evolution API
  instanceName: "instance123",                  // Nome da instância do WhatsApp
  apikey: "sua-chave-api-aqui"                  // Chave de API para autenticação
}
```

## Endpoints REST

### 1. Verificação de Status da Conexão

**Endpoint:** `GET /instance/connectionState/{instanceName}`

**Headers:**
```
Content-Type: application/json
apikey: sua-chave-api-aqui
```

**Resposta Bem-Sucedida:**
```json
{
  "status": "success",
  "state": "open",  // Possíveis valores: "open", "connecting", "closed"
  "instance": "instance123"
}
```

**Utilização no Código:**
```typescript
const statusUrl = `${baseUrl}/instance/connectionState/${instanceName}`;
const response = await axios.get(statusUrl, { 
  headers: { 
    'Content-Type': 'application/json',
    'apikey': apikey 
  }
});
```

### 2. Envio de Mensagem

**Endpoint:** `POST /message/text/{instanceName}`

**Headers:**
```
Content-Type: application/json
apikey: sua-chave-api-aqui
```

**Corpo da Requisição:**
```json
{
  "number": "5511999999999",
  "options": {
    "delay": 1200
  },
  "textMessage": {
    "text": "Sua mensagem aqui"
  }
}
```

**Resposta Bem-Sucedida:**
```json
{
  "status": "success",
  "response": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": true,
      "id": "BAE5F9400A87"
    },
    "message": {
      "extendedTextMessage": {
        "text": "Sua mensagem aqui"
      }
    }
  }
}
```

**Utilização no Código:**
```typescript
const sendUrl = `${baseUrl}/message/text/${instanceName}`;
const response = await axios.post(
  sendUrl,
  {
    number: phoneNumber, 
    options: { delay: 1200 },
    textMessage: { text: message }
  },
  {
    headers: {
      'apikey': apikey,
      'Content-Type': 'application/json'
    }
  }
);
```

### 3. Busca de Mensagens

**Endpoint (Opção 1):** `POST /chat/findMessages/{instanceName}`

**Headers:**
```
Content-Type: application/json
apikey: sua-chave-api-aqui
```

**Corpo da Requisição:**
```json
{
  "where": {},
  "count": 50
}
```

**Endpoint (Opção 2 - Alternativa):** `GET /chat/fetchAllChats/{instanceName}`

**Headers:**
```
Content-Type: application/json
apikey: sua-chave-api-aqui
```

**Utilização no Código:**
```typescript
// Opção 1
try {
  const response = await axios.post(
    `${baseUrl}/chat/findMessages/${instanceName}`, 
    { where: {}, count: 50 }, 
    { headers: { 'Content-Type': 'application/json', 'apikey': apikey } }
  );
  return response.data;
} catch (err) {
  // Opção 2 - Fallback
  const response2 = await axios.get(
    `${baseUrl}/chat/fetchAllChats/${instanceName}`, 
    { headers: { 'Content-Type': 'application/json', 'apikey': apikey } }
  );
  return response2.data;
}
```

### 4. Busca de Foto de Perfil

**Endpoint:** `GET /chat/profilePicture/{instanceName}`

**Parâmetros de Query:**
- `number`: Número de telefone no formato internacional (ex: 5511999999999)

**Headers:**
```
Content-Type: application/json
apikey: sua-chave-api-aqui
```

**Resposta Bem-Sucedida:**
```json
{
  "status": "success",
  "response": {
    "profilePictureUrl": "https://..."
  }
}
```

**Utilização no Código:**
```typescript
const profilePicUrl = `${baseUrl}/chat/profilePicture/${instanceName}?number=${phone}`;
const response = await axios.get(profilePicUrl, {
  headers: {
    'Content-Type': 'application/json',
    'apikey': apikey
  }
});
const pictureUrl = response.data?.response?.profilePictureUrl;
```

## Integração com Socket.io

### Configuração da Conexão

```typescript
const socket = io(baseUrl, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Configurar após conexão estabelecida
socket.on('connect', () => {
  // Configurar parâmetros
  socket.io.opts.query = { instance: instanceName };
  socket.io.opts.extraHeaders = { 'apikey': apikey };
  
  // Enviar subscribe
  const subscribeMessage = {
    action: 'subscribe',
    instance: instanceName
  };
  socket.emit('subscribe', subscribeMessage);
  
  // Formato alternativo
  socket.emit('subscribe', instanceName);
});
```

### Eventos Principais

#### 1. Recebimento de Novas Mensagens

**Evento:** `messages.upsert`

**Dados Recebidos:**
```json
{
  "event": "messages.upsert",
  "instance": "instance123",
  "data": {
    "messages": [
      {
        "key": {
          "remoteJid": "5511999999999@s.whatsapp.net",
          "fromMe": false,
          "id": "3EB0789ABCDEF"
        },
        "message": {
          "conversation": "Mensagem de texto"
        },
        "messageTimestamp": 1650000000
      }
    ]
  }
}
```

**Processamento no Código:**
```typescript
socket.on('messages.upsert', (data) => {
  if (data && data.messages) {
    data.messages.forEach(async (msg) => {
      if (!msg || !msg.key || !msg.key.remoteJid) return;
      
      const remoteJid = msg.key.remoteJid;
      const fromMe = msg.key.fromMe;
      const timestamp = msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000) : new Date();
      
      // Extrair conteúdo com base no tipo de mensagem
      let content = '';
      let messageType = 'text';
      
      if (msg.message?.conversation) {
        content = msg.message.conversation;
      } else if (msg.message?.extendedTextMessage?.text) {
        content = msg.message.extendedTextMessage.text;
      } else if (msg.message?.imageMessage) {
        content = msg.message.imageMessage.caption || '[image]';
        messageType = 'image';
      }
      // ... processar outros tipos de mensagem
      
      // Salvar no banco de dados
      await whatsappStorage.saveMessage({
        id: msg.key.id,
        content: content,
        sender: fromMe ? 'me' : 'them',
        timestamp: timestamp,
        message_type: messageType
      }, revendaId, remoteJid.split('@')[0], remoteJid);
    });
  }
});
```

#### 2. Atualização de Chats

**Evento:** `chats.update`

**Dados Recebidos:**
```json
{
  "event": "chats.update",
  "instance": "instance123",
  "data": [
    {
      "id": "5511999999999@s.whatsapp.net",
      "unreadCount": 3,
      "timestamp": 1650000000
    }
  ]
}
```

#### 3. Atualização de Contatos

**Evento:** `contacts.update`

**Dados Recebidos:**
```json
{
  "event": "contacts.update",
  "instance": "instance123",
  "data": [
    {
      "id": "5511999999999@s.whatsapp.net",
      "name": "Nome do Contato"
    }
  ]
}
```

## Boas Práticas de Implementação

1. **Tratamento de Erro Robusto**
   - Sempre implemente fallbacks para endpoints alternativos
   - Defina timeouts adequados para todas as requisições
   - Adicione retry logic para operações importantes

2. **Gestão de Conexão Socket.io**
   - Configure a inicialização do Socket de forma sequencial
   - Primeiro estabeleça a conexão, depois configure parâmetros
   - Use delays de segurança para garantir que eventos sejam enviados após a conexão estar estável

3. **Persistência de Dados**
   - Use o banco de dados Supabase como fonte única de verdade
   - Utilize o Socket.io apenas para interceptar novas mensagens
   - Salve todas as mensagens recebidas via Socket.io no banco de dados

4. **Monitoramento**
   - Implemente logs detalhados para depuração
   - Monitore o status da conexão e reconecte automaticamente quando necessário
   - Registre métricas de uso para identificar gargalos ou problemas

## Resolução de Problemas Comuns

| Problema | Possível Causa | Solução |
|----------|----------------|---------|
| Erro 502 Bad Gateway | Problema na comunicação entre proxy e servidor | Implementar inicialização sequencial do Socket.io |
| Loop infinito de requisições | Falta de controle de estado para evitar requisições repetidas | Adicionar flags como `initialLoadAttempted` para evitar execuções repetidas |
| Mensagens não sendo salvas | Problemas na formatação ou envio para o banco de dados | Verificar formatação dos dados e implementar logs detalhados |
| Conexão instável | Tentativa de configuração antes da conexão estar estabelecida | Configurar Socket.io após o evento de conexão |
