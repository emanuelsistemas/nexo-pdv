# Documentação: Fluxo de Conexão WhatsApp no Nexo PDV

Este documento descreve o processo de verificação automática de status e atualização de QR code no modal de conexão WhatsApp do Nexo PDV.

## Visão Geral

O sistema de conexão WhatsApp implementa dois processos automáticos principais:

1. **Verificação automática de status da conexão** - Verifica a cada 2 segundos se o usuário escaneou o QR code e conectou o WhatsApp
2. **Atualização automática do QR code** - Atualiza o QR code automaticamente a cada 30 segundos para evitar expiração

## Componentes Principais

### 1. Referências para Intervalos

```typescript
// Referência para o intervalo de atualização do QR Code
const qrCodeIntervalRef = useRef<NodeJS.Timeout | null>(null);

// Referência para o intervalo de verificação do status da conexão
const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
```

Estas referências são usadas para controlar os intervalos de tempo que executam as verificações automáticas. É importante manter estas referências para poder limpar os intervalos quando o modal for fechado.

### 2. Função de Verificação de Status

```typescript
// Função para verificar o status da conexão
const checkConnectionStatus = async (instanceName: string, connectionId: string) => {
  if (!instanceName || !userInfo.id) return;
  
  setCheckingStatus(true);
  try {
    // Chamada à API Evolution para verificar o status da conexão
    const response = await fetch(`https://apiwhatsapp.nexopdv.com/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '429683C4C977415CAAFCCE10F7D57E11'
      }
    });
    
    // Processamento da resposta...
    // Detecção do status de conexão...
    
    if (isConnected) {
      // Atualizar status no banco de dados e na interface
      // Fechar modal após um pequeno delay
      setTimeout(() => {
        closeQRModal();
        // ...
      }, 2000);
    } else {
      setConnectionStatus('pending');
    }
  } catch (error) {
    // Tratamento de erros...
  } finally {
    setCheckingStatus(false);
  }
};
```

Esta função é o coração do sistema de verificação. Ela recebe dois parâmetros explícitos (nome da instância e ID da conexão) e faz uma requisição à API para verificar o status atual da conexão WhatsApp.

### 3. Inicialização dos Intervalos

```typescript
// Iniciar verificação automática ao abrir o modal
const handleConnectExistingInstance = (connectionId: string, instanceName: string) => {
  // ...configuração inicial...
  
  // Inicia a verificação periódica do status
  // Primeiro verificamos imediatamente
  checkConnectionStatus(instanceName, connectionId);
  
  // E depois a cada 2 segundos
  statusCheckIntervalRef.current = setInterval(() => {
    checkConnectionStatus(instanceName, connectionId);
  }, 2000); // Verificar a cada 2 segundos
  
  // Configurar atualização automática do QR code a cada 30 segundos
  qrCodeIntervalRef.current = setInterval(() => {
    if (connectionStatus !== 'connected') {
      getQRCodeForExistingInstance(instanceName, connectionId);
    } else {
      // Se estiver conectado, parar de atualizar o QR code
      if (qrCodeIntervalRef.current) {
        clearInterval(qrCodeIntervalRef.current);
        qrCodeIntervalRef.current = null;
      }
    }
  }, 30000); // Atualizar QR code a cada 30 segundos
};
```

Esta função configura os dois intervalos críticos quando o modal é aberto:
- Um intervalo para verificar o status a cada 2 segundos
- Um intervalo para atualizar o QR code a cada 30 segundos

### 4. Limpeza dos Intervalos

```typescript
// Função para fechar o modal de QR Code e limpar intervalos
const closeQRModal = () => {
  // Limpar o intervalo de verificação de status
  if (statusCheckIntervalRef.current) {
    clearInterval(statusCheckIntervalRef.current);
    statusCheckIntervalRef.current = null;
  }
  
  // Limpar o intervalo de atualização do QR code
  if (qrCodeIntervalRef.current) {
    clearInterval(qrCodeIntervalRef.current);
    qrCodeIntervalRef.current = null;
  }
  
  setShowQRModal(false);
};
```

Esta função é crucial para evitar vazamentos de memória e comportamentos inesperados. Ela garante que todos os intervalos são limpos adequadamente quando o modal é fechado.

## Fluxo Completo

1. **Criação de Instância**
   - Usuário preenche o nome da instância e clica em "Criar"
   - O sistema cria a instância na API Evolution e no banco de dados
   - O modal é fechado e uma mensagem orienta o usuário a clicar em "Conectar" na tabela

2. **Conexão de Instância Existente**
   - Usuário clica no botão "Conectar" na linha da instância desejada
   - O sistema gera um QR code para a instância
   - Inicia a verificação automática de status a cada 2 segundos
   - Configura a atualização automática do QR code a cada 30 segundos

3. **Verificação Automática de Status**
   - A cada 2 segundos, o sistema verifica o status da conexão
   - Se o WhatsApp for conectado, o sistema:
     - Atualiza o status no banco de dados e na interface
     - Mostra um feedback visual de sucesso
     - Fecha o modal automaticamente após 2 segundos
     - Para todos os intervalos de verificação

4. **Atualização Automática do QR Code**
   - A cada 30 segundos, se o WhatsApp ainda não estiver conectado:
     - O sistema gera um novo QR code para evitar expiração
   - Se o WhatsApp estiver conectado:
     - O sistema para de atualizar o QR code

5. **Fechamento do Modal**
   - Quando o modal é fechado (manualmente ou após conexão):
     - Todos os intervalos são limpos para evitar vazamentos de memória
     - Os estados são reiniciados para uso futuro

## Dicas de Manutenção

1. **Parâmetros Explícitos**: Ao modificar a função `checkConnectionStatus`, sempre mantenha os parâmetros explícitos (`instanceName` e `connectionId`) em vez de depender de estados do componente.

2. **Limpeza de Intervalos**: Sempre limpe todos os intervalos quando o modal for fechado usando a função `closeQRModal`.

3. **Verificação Imediata**: Ao abrir o modal, sempre execute uma verificação imediata de status antes de iniciar o intervalo para evitar atrasos.

4. **Feedback Visual**: Mantenha indicadores visuais para mostrar quando a verificação está em andamento e quando a conexão é bem-sucedida.

## Pontos de Atenção

- A API Evolution pode retornar o status em diferentes formatos (`data.instance.state` ou `data.state`). O código deve lidar com ambos os formatos.
- Se a API estiver indisponível ou retornar erro, o sistema deve mostrar mensagens de erro e permitir novas tentativas.
- Os intervalos devem ser sempre limpos ao fechar o modal, caso contrário, continuarão executando em segundo plano.

## Conclusão

O sistema de verificação automática implementado segue o mesmo padrão do componente `WhatsConnector` que funciona corretamente. As modificações mantêm consistência com esse componente comprovado, garantindo a confiabilidade do processo de conexão WhatsApp.
