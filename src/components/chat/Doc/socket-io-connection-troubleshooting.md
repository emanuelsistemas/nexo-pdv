# Solução de Problemas do Socket.io no ChatNexo

Este documento detalha o problema de conexão Socket.io enfrentado no componente Chat e como foi solucionado. É um guia de referência rápida para diagnosticar e corrigir problemas semelhantes no futuro.

## Problema: Falha na Conexão com Socket.io da Evolution API

### Sintomas
- Status "Desconectado" persistente na interface do chat
- Erro "Request failed with status code 404" no painel de status
- Nenhuma atualização em tempo real das mensagens
- Logs no console mostrando falha na verificação HTTP antes da tentativa de conexão WebSocket

### Diagnóstico

Ao revisar os logs do console, identificamos:

1. A aplicação estava tentando verificar o status da instância via HTTP antes de iniciar a conexão WebSocket:
   ```javascript
   const statusUrl = `${baseUrl}/instance/connectionState/${instanceName}`;
   ```

2. A requisição HTTP estava falhando com erro 404 (Not Found)
   ```
   GET https://apiwhatsapp.nexopdv.com/instance/connectionState/nexo 404 (Not Found)
   ```

3. Possíveis causas:
   - Endpoint incorreto `/instance/connectionState/` não existente na API
   - Instância incorreta (usando "nexo" quando deveria usar "123")
   - Configuração desatualizada no localStorage em vez do banco de dados

## Solução Implementada

### 1. Remoção da Verificação HTTP

Modificamos o componente `Chat.tsx` para pular a verificação HTTP que estava falhando e tentar conectar diretamente via Socket.io:

```typescript
// ANTES: Verificava status HTTP e então conectava Socket.io
const statusUrl = `${baseUrl}/instance/connectionState/${instanceName}`;
const response = await axios.get(statusUrl, { headers });
if (response.status !== 200) {
  throw new Error(`Erro ao verificar status: ${response.status}`);
}
// Somente então conectava o Socket.io

// DEPOIS: Conexão direta ao Socket.io
console.log('Pulando verificação HTTP (que retorna erro 404) e indo direto para Socket.io');
console.log(`Usando configuração para conexão Socket.io:
  - URL: ${baseUrl}
  - Instância: ${instanceName}
  - API Key: ${apikey ? '***' + apikey.substring(apikey.length - 4) : 'não definida'}
`);
// Conecta o Socket.io diretamente
```

### 2. Eliminação da Dependência do localStorage

Modificamos o hook `useWhatsAppInstance.ts` para evitar o uso de configurações potencialmente desatualizadas do localStorage:

```typescript
// ANTES: Verificava e usava configuração do localStorage
const savedConfig = localStorage.getItem('nexochat_config');
if (savedConfig) {
  try {
    const config = JSON.parse(savedConfig);
    // Usava a configuração do localStorage
    // ...
  } catch (e) {
    console.error('Erro ao processar configuração do localStorage:', e);
  }
}

// DEPOIS: Remove configuração do localStorage e força busca do banco
console.log('Removendo nexochat_config do localStorage para forçar busca do banco');
localStorage.removeItem('nexochat_config');
// Busca configuração do banco diretamente
```

### 3. Exibição da Instância na Interface

Modificamos o componente `ConnectionStatus.tsx` para mostrar a instância conectada:

```typescript
// ANTES: Apenas status conectado/desconectado
<span className={socketConnected ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
  {socketConnected ? "Conectado" : "Desconectado"}
</span>

// DEPOIS: Status + instância conectada
<span className={socketConnected ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
  {socketConnected ? "Conectado" : "Desconectado"}
  {socketConnected && socketInstance && (
    <span className="text-xs ml-1 text-gray-400">
      (Instância: {socketInstance})
    </span>
  )}
</span>
```

## Como Diagnosticar Problemas Semelhantes

1. **Verificar Console do Navegador**:
   - Abra o console do desenvolvedor (F12)
   - Procure por erros HTTP 404, 403, 500, etc.
   - Observe os logs do Socket.io (eventos "connect", "disconnect", "connect_error")

2. **Verificar Status da Instância**:
   - Observe o painel de status no chat para ver qual instância está ativa
   - Compare com a instância usada na conexão Socket.io

3. **Verificar Configurações**:
   - Examine `localStorage.getItem('nexochat_config')` no console
   - Verifique se a instância e URL coincidem com as configurações atuais

## Soluções Rápidas para Problemas Comuns

1. **Para erros de conexão após alterar a API ou instância**:
   ```javascript
   // No console do navegador
   localStorage.removeItem('nexochat_config');
   window.location.reload();
   ```

2. **Para loop de reconexão ou alto consumo de CPU**:
   - Verifique se há múltiplos hooks de useEffect acionando conexões
   - Use refs (`useRef`) em vez de estado (`useState`) para controlar o estado da conexão

3. **Para problemas de inconsistência entre instâncias**:
   - Verifique a tabela `nexochat_config` no banco de dados
   - Certifique-se de que a instância configurada para a revenda existe e está ativa

## Conclusão

O problema foi solucionado removendo uma etapa de verificação HTTP desnecessária que estava falhando, enquanto mantivemos toda a lógica principal de conexão Socket.io.

Também melhoramos a robustez do sistema forçando o uso da configuração do banco de dados, em vez de potencialmente usar dados desatualizados do localStorage.

Por fim, melhoramos a experiência do usuário adicionando informações mais detalhadas sobre a instância conectada na interface.

**Data da documentação:** 05 de Maio de 2025  
**Autor:** Emanuel
