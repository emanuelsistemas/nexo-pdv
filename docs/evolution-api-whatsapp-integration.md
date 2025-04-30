# Documentação de Integração com Evolution API para WhatsApp

## Introdução

Este documento detalha a implementação da integração do Nexo PDV com a Evolution API para gerenciamento de conexões WhatsApp. A Evolution API é uma solução para automatizar e integrar WhatsApp a aplicações, permitindo a criação de instâncias, conexão via QR Code, envio de mensagens, e outras funcionalidades.

## Pré-requisitos

- Servidor Evolution API acessível em `https://apiwhatsapp.nexopdv.com`
- Chave de API válida para autenticação
- Supabase configurado para armazenamento das conexões

## Estrutura de Dados

### Tabela no Supabase
A tabela `whatsapp_connections` armazena as conexões WhatsApp com a seguinte estrutura:

| Campo         | Tipo     | Descrição                                        |
|---------------|----------|--------------------------------------------------|
| id            | UUID     | Identificador único da conexão                   |
| admin_id      | UUID     | ID do administrador que criou a conexão          |
| name          | String   | Nome amigável para a conexão                    |
| phone         | String   | Número de telefone associado                    |
| status        | Enum     | Status da conexão: 'active', 'inactive', 'connecting' |
| created_at    | Timestamp| Data/hora de criação                            |
| instance_name | String   | Nome da instância na Evolution API              |
| reseller_id   | UUID     | ID da revenda (opcional)                        |

### Interfaces TypeScript

```typescript
// Interface para conexões WhatsApp
interface WhatsAppConnection {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive' | 'connecting';
  created_at: string;
  instance_name?: string;
}

// Interface para instância da Evolution API
interface EvolutionInstance {
  instanceName: string;
  token: string;
  status: string;
  qrcode?: string;
  number?: string;
}

// Interface para resposta do QR Code
interface QRCodeResponse {
  qrcode: string;
  status: string;
}
```

## Fluxo de Operações

### 1. Carregamento de Conexões Existentes

```typescript
const loadWhatsAppConnections = async (adminId: string) => {
  try {
    setWhatsappLoading(true);
    
    // Buscar as conexões existentes na tabela do Supabase
    const { data, error } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('admin_id', adminId);
      
    if (error) {
      throw error;
    }
    
    if (data) {
      // Converter explicitamente para o tipo WhatsAppConnection
      const typedConnections: WhatsAppConnection[] = data.map((item: any) => ({
        id: item.id as string,
        name: item.name as string,
        phone: item.phone as string,
        status: (item.status as 'active' | 'inactive' | 'connecting') || 'inactive',
        created_at: item.created_at as string,
        instance_name: item.instance_name as string
      }));
      setWhatsappConnections(typedConnections);
    }
  } catch (error: any) {
    console.error('Erro ao carregar conexões WhatsApp:', error);
    toast.error('Erro ao carregar conexões: ' + error.message);
  } finally {
    setWhatsappLoading(false);
  }
};
```

### 2. Criação de Nova Instância

```typescript
const createInstance = async () => {
  if (!instanceName.trim()) {
    setConnectionError('Nome da instância é obrigatório');
    return;
  }
  
  try {
    setLoadingQRCode(true);
    setConnectionError('');
    
    console.log('Tentando criar instância:', instanceName.trim());
    
    // Verificar primeiro se a instância já existe
    try {
      const checkResponse = await fetch(`https://apiwhatsapp.nexopdv.com/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '429683C4C977415CAAFCCE10F7D57E11'
        }
      });
      
      const checkData = await checkResponse.json();
      console.log('Instâncias existentes:', checkData);
    } catch (checkError) {
      console.error('Erro ao verificar instâncias:', checkError);
    }
    
    // Criar a instância na Evolution API - formato validado via curl
    const response = await fetch('https://apiwhatsapp.nexopdv.com/instance/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '429683C4C977415CAAFCCE10F7D57E11'
      },
      body: JSON.stringify({
        instanceName: instanceName.trim(),
        integration: 'WHATSAPP-BAILEYS'
      })
    });
    
    console.log('Status da resposta:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('Resposta bruta:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Erro ao analisar JSON:', parseError);
      throw new Error(`Erro no formato da resposta: ${responseText.substring(0, 100)}...`);
    }
    
    if (!response.ok) {
      console.error('Erro detalhado:', data);
      throw new Error(data.message || data.error || 'Erro ao criar instância');
    }
    
    setInstanceCreated(true);
    toast.success('Instância criada com sucesso! Gerando QR Code...');
    
    // Agora vamos buscar o QR Code
    getQRCode();
  } catch (error: any) {
    console.error('Erro ao criar instância:', error);
    setConnectionError(error.message || 'Erro ao criar instância');
    setLoadingQRCode(false);
  }
};
```

### 3. Obtenção do QR Code

```typescript
const getQRCode = async () => {
  try {
    setLoadingQRCode(true);
    setConnectionError('');
    
    // Buscar o QR Code da Evolution API
    const response = await fetch(`https://apiwhatsapp.nexopdv.com/instance/qrcode?instanceName=${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '429683C4C977415CAAFCCE10F7D57E11'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro ao obter QR Code');
    }
    
    if (data.qrcode) {
      setQRCodeData(data.qrcode);
    } else {
      throw new Error('QR Code não disponível');
    }
    
  } catch (error: any) {
    console.error('Erro ao obter QR Code:', error);
    setConnectionError(error.message || 'Erro ao obter QR Code');
  } finally {
    setLoadingQRCode(false);
  }
};
```

### 4. Verificação do Status da Conexão

#### Endpoint Correto e Formato de Resposta

Após testes extensivos com diferentes endpoints da Evolution API, identificamos que o endpoint mais confiável para verificar o status da conexão é `/instance/connectionState/{instanceName}`. Este endpoint retorna consistentemente o estado da conexão no formato:

```json
{"instance":{"instanceName":"nome-da-instancia","state":"open"}}
```

Quando o valor de `state` é `"open"`, indica que a conexão foi estabelecida com sucesso.

#### Implementação Funcional

A seguir está a implementação que funciona corretamente para verificar o status da conexão WhatsApp:

```typescript
const checkConnectionStatus = async (instanceName: string, connectionId: string) => {
  try {
    setCheckingStatus(true);
    
    console.log('Verificando status da conexão WhatsApp:', instanceName);
    
    // Usar diretamente o endpoint que sabemos que funciona
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao verificar status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Estado da conexão:', data);
    
    // Verificar o formato da resposta para extrair o estado
    let state = '';
    let isConnected = false;
    
    if (data.instance && data.instance.state) {
      // Formato: {"instance":{"instanceName":"2","state":"open"}}
      state = data.instance.state;
      isConnected = state === 'open' || state === 'connected';
    } else if (data.state) {
      // Formato alternativo direto: {"state":"open"}
      state = data.state;
      isConnected = state === 'open' || state === 'connected';
    }
    
    console.log(`Status da conexão: ${state} (Conectado: ${isConnected})`);
    
    if (isConnected) {
      console.log('CONEXÃO DETECTADA! WhatsApp conectado com sucesso!');
      setConnectionStatus('connected');
      
      // Atualizar o status da conexão no banco de dados
      await updateConnectionStatus(connectionId);
      
      // Parar de verificar o status após conectar
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
      
      return true;
    }
    
    return false; // Não conectado
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return false;
  } finally {
    setCheckingStatus(false);
  }
};
```

#### Implementação de Polling para Detecção Automática

Para detectar automaticamente quando a conexão é estabelecida, implementamos um sistema de polling que verifica o status a cada 5 segundos:

```typescript
// Iniciar a verificação de status ao abrir o modal
const handleShowQRCode = (connection: WhatsAppConnection) => {
  // Configurar conexão atual
  setCurrentConnection(connection);
  setConnectionStatus('connecting');
  setShowQRCodeModal(true);
  
  // Carregar QR Code
  setLoadingQRCode(true);
  getQRCodeForExistingInstance(connection.instance_name || '');
  
  // Verificar status imediatamente e depois a cada 5 segundos
  const instanceNameStr = connection.instance_name || '';
  if (instanceNameStr) {
    checkConnectionStatus(instanceNameStr, connection.id);
    statusCheckIntervalRef.current = setInterval(() => {
      checkConnectionStatus(instanceNameStr, connection.id);
    }, 5000);
  }
};

// Garantir limpeza do intervalo ao fechar o modal
const handleCloseQRCodeModal = () => {
  if (statusCheckIntervalRef.current) {
    clearInterval(statusCheckIntervalRef.current);
    statusCheckIntervalRef.current = null;
  }
  setShowQRCodeModal(false);
};
```

#### Obtenção e Atualização do Número de Telefone

Após a conexão ser detectada, o sistema obtem e atualiza automaticamente o número de telefone do WhatsApp no banco de dados:

```typescript
// Dentro da função checkConnectionStatus, quando detecta conexão:
if (isConnected) {
  console.log('CONEXÃO DETECTADA! WhatsApp conectado com sucesso!');
  setConnectionStatus('connected');
  
  // Buscar informações adicionais da instância para obter o número do telefone
  try {
    // Obter informações pelo endpoint fetchInstances
    const infoResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    if (!infoResponse.ok) {
      throw new Error('Não foi possível obter informações da instância');
    }
    
    const infoData = await infoResponse.json();
    
    // Encontrar a instância correspondente e extrair o número de telefone
    let phoneNumber = '';
    if (Array.isArray(infoData)) {
      const instance = infoData.find(inst => inst.name === instanceName);
      if (instance) {
        // Tentar obter o número de telefone de vários campos possíveis
        phoneNumber = instance.number || 
                     instance.phone || 
                     (instance.ownerJid ? instance.ownerJid.split('@')[0] : '') ||
                     '';
      }
    }
    
    // Atualizar o status e o número de telefone no banco de dados
    await updateConnectionStatus(connectionId, phoneNumber);
  } catch (infoError) {
    // Mesmo com erro, ainda atualizamos o status da conexão
    await updateConnectionStatus(connectionId);
  }
}
```

#### Formatação e Atualização no Banco de Dados

A função `updateConnectionStatus` foi aprimorada para atualizar o número de telefone e o nome da conexão:

```typescript
const updateConnectionStatus = async (connectionId: string, phoneNumber?: string) => {
  try {
    // Prepara os dados para atualização
    const updateData = { 
      status: 'active' 
    };
    
    // Adiciona o número de telefone se estiver disponível
    if (phoneNumber) {
      updateData.phone = phoneNumber;
      
      // Formatar o número para exibição
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      let formattedPhone = phoneNumber;
      
      if (cleanPhone.length >= 11) {
        // Formato DDI + DDD + número
        formattedPhone = cleanPhone.replace(/^(\d{2})(\d{2})(\d+)$/, '+$1 ($2) $3');
      } else if (cleanPhone.length >= 10) {
        // Apenas DDD + número
        formattedPhone = cleanPhone.replace(/^(\d{2})(\d+)$/, '($1) $2');
      }
      
      updateData.name = `WhatsApp ${formattedPhone}`;
    }
    
    // Atualizar no Supabase
    const { error } = await supabase
      .from('whatsapp_connections')
      .update(updateData)
      .eq('id', connectionId);
      
    if (!error) {
      // Recarregar as conexões para atualizar a interface
      loadWhatsAppConnections(adminId);
    }
  } catch (error) {
    console.error('Erro ao atualizar conexão:', error);
  }
};
```

## Funcionamento da Interface

### Modal de Adição/Conexão

O modal de gerenciamento de conexão WhatsApp possui os seguintes componentes:

1. Campo para inserir o nome da instância
2. Botão para criar nova instância
3. Área de exibição do QR Code
4. Indicadores de status de carregamento
5. Área de exibição de erros

### Fluxo do Usuário

1. **Adição de nova conexão**:
   - Usuário clica no botão "Adicionar Conexão"
   - Modal é exibido com campo para nome da instância
   - Usuário insere o nome da instância e clica em "Criar Instância"
   - Sistema cria a instância na Evolution API
   - QR Code é exibido para o usuário escanear com o WhatsApp
   - Sistema verifica periodicamente o status da conexão
   - Quando conectado, o sistema salva os dados no Supabase e fecha o modal

2. **Gerenciamento de conexões existentes**:
   - Lista de conexões é exibida com nome, telefone, instância, status e ações
   - Botões de ação permitem conectar ou desconectar a instância
   - Status visual indica se a conexão está ativa, inativa ou em processo de conexão

## Endpoints da Evolution API

| Endpoint | Método | Descrição | Parâmetros |
|----------|--------|-----------|------------|
| `/instance/create` | POST | Cria uma nova instância | `instanceName`, `integration` |
| `/instance/qrcode` | GET | Obtém o QR Code para conexão | `instanceName` (query param) |
| `/instance/connectionState/{instanceName}` | GET | Verifica o estado da conexão | `instanceName` (path param) |
| `/instance/fetchInstances` | GET | Lista todas as instâncias | - |
| `/instance/fetchInstances/{instanceName}` | GET | Obtém detalhes de uma instância específica | `instanceName` (path param) |

## Segurança

- A autenticação com a Evolution API é feita via cabeçalho `apikey`
- A chave de API é armazenada diretamente no código (nota: em ambiente de produção, deveria ser armazenada em variáveis de ambiente)
- As conexões são vinculadas ao ID do administrador no Supabase para garantir isolamento de dados

## Limitações e Melhorias Futuras

1. **Atualização automática do QR Code**: O QR Code fornecido pode expirar após um tempo. Uma melhoria seria implementar a atualização automática.

2. **Detecção em tempo real de conexão**: Implementar webhooks para receber notificações em tempo real quando o status da conexão muda.

3. **Separação do código**: Refatorar para componentes isolados, movendo a lógica de conexão para fora da página Settings.

4. **Segurança aprimorada**: Mover chaves de API para variáveis de ambiente ou armazenamento seguro.

5. **Tratamento de reconexão**: Implementar mecanismos para reconectar automaticamente instâncias que foram desconectadas.

6. **Melhor gerenciamento de erros**: Implementar tratamento mais robusto de erros e tentativas de reconexão.

## Conclusão

A integração com a Evolution API permite que o Nexo PDV ofereça funcionalidades de conexão WhatsApp diretamente na aplicação. A implementação atual fornece o básico necessário para criar instâncias, conectar via QR Code e monitorar o status das conexões.

O código foi estruturado para ser funcional, mas com oportunidades claras de refatoração para maior modularidade e robustez, especialmente considerando a criação de uma página dedicada para gerenciamento de conexões WhatsApp.
