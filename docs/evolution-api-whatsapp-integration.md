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

```typescript
const checkConnectionStatus = async () => {
  try {
    // Verificar o status da conexão na Evolution API
    const response = await fetch(`https://apiwhatsapp.nexopdv.com/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '429683C4C977415CAAFCCE10F7D57E11'
      }
    });
    
    const data = await response.json();
    
    // Verificar se a conexão está estabelecida
    const isConnected = data.state === 'open' || 
                        data.state === 'connected' || 
                        data.connected === true;
    
    if (isConnected) {
      // Se conectado, obter informações da instância para salvar no banco
      try {
        const infoResponse = await fetch(`https://apiwhatsapp.nexopdv.com/instance/fetchInstances/${instanceName}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': '429683C4C977415CAAFCCE10F7D57E11'
          }
        });
        
        const infoData = await infoResponse.json();
        const instance = infoData.instance || infoData;
        const phone = instance.phone || instance.number || '';
        
        // Salvar ou atualizar a conexão no banco de dados
        const { error } = await supabase
          .from('whatsapp_connections')
          .insert([
            {
              admin_id: userInfo.id,
              name: `WhatsApp ${phone}`,
              phone: phone,
              status: 'active',
              instance_name: instanceName
            }
          ]);
          
        if (error) {
          console.error('Erro ao salvar conexão:', error);
          toast.error('Erro ao salvar conexão: ' + error.message);
        } else {
          toast.success('WhatsApp conectado com sucesso!');
          loadWhatsAppConnections(userInfo.id); // Recarregar as conexões
          closeWhatsAppModal();
        }
      } catch (infoError) {
        console.error('Erro ao obter informações da conexão:', infoError);
      }
    }
  } catch (error: any) {
    console.error('Erro ao verificar status da conexão:', error);
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
