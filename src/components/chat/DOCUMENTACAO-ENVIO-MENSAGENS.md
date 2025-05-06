# Documentação: Envio de Mensagens através da Evolution API

## Visão Geral

Este documento descreve a implementação do sistema de envio de mensagens WhatsApp utilizando a Evolution API v2.2.3 no Nexo PDV. O sistema suporta múltiplas instâncias para diferentes usuários e revenda.

## Endpoint Correto

Após extensivos testes, identificamos o endpoint correto para envio de mensagens de texto:

```
POST /message/sendText/{instance}
```

> **Atenção**: O endpoint `/message/text/{instance}` que estava sendo usado anteriormente não existe na API Evolution v2.

## Parâmetros de Requisição

### URL
- `{instance}`: Nome da instância do WhatsApp (Ex: "123")

### Headers
- `Content-Type: application/json`
- `apikey: SUA_API_KEY`

### Body
O corpo da requisição deve seguir este formato simplificado:

```json
{
  "number": "5512996807562@s.whatsapp.net",
  "text": "Sua mensagem aqui"
}
```

**Observações importantes:**
- O número deve incluir o código do país e o formato `@s.whatsapp.net`
- Não é necessário incluir as propriedades `options` ou `textMessage`

## Exemplo de Requisição

### cURL
```bash
curl --request POST \
  --url "https://apiwhatsapp.nexopdv.com/message/sendText/123" \
  --header "Content-Type: application/json" \
  --header "apikey: 429683C4C977415CAAFCCE10F7D57E11" \
  --data '{
    "number": "5512996807562@s.whatsapp.net",
    "text": "Teste de mensagem via Evolution API"
  }'
```

### JavaScript/TypeScript usando Axios
```typescript
import axios from 'axios';

const sendWhatsAppMessage = async (
  baseUrl: string,
  instanceName: string,
  apikey: string,
  number: string,
  message: string
): Promise<boolean> => {
  try {
    // Formatar número para padrão WhatsApp se necessário
    const formattedNumber = number.includes('@s.whatsapp.net') 
      ? number 
      : `${number}@s.whatsapp.net`;

    // Enviar mensagem
    const response = await axios.post(
      `${baseUrl}/message/sendText/${instanceName}`,
      {
        number: formattedNumber,
        text: message
      },
      {
        headers: {
          'apikey': apikey,
          'Content-Type': 'application/json'
        }
      }
    );

    // Verificar se a resposta foi bem sucedida
    return response.data?.status === 'success';
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    return false;
  }
};
```

## Implementação no Nexo PDV

No Nexo PDV, a implementação é feita através do hook personalizado `useEvolutionApi`, que gerencia o estado, tratamento de erros e formatação dos números telefônicos.

### Fluxo de Envio de Mensagens

1. O usuário digita uma mensagem no `MessageInput`
2. O componente chama a função `onSendMessage` passada via props
3. Esta função chama `handleSendMessage` no componente `Chat`
4. `handleSendMessage` usa o hook `useEvolutionApi` para enviar a mensagem
5. A mensagem é armazenada localmente (feedback visual imediato)
6. A mensagem é enviada para a API Evolution
7. Após confirmação, a mensagem é armazenada no banco de dados Supabase

### Armazenamento de Mensagens

Após o envio bem-sucedido, as mensagens são armazenadas na tabela `whatsapp_revenda_mensagens` com os seguintes campos:

```sql
INSERT INTO whatsapp_revenda_mensagens (
  revenda_id,
  phone,
  mensagem,
  direcao,
  data_hora,
  status
) VALUES (
  'id_da_revenda',
  'numero_do_telefone',
  'conteúdo_da_mensagem',
  'saida',
  '2025-05-06T14:30:00Z',
  'enviado'
);
```

## Tratamento de Erros

O sistema implementa os seguintes tratamentos de erro:

1. **Validação pré-envio**: Verificação se a conversa está selecionada
2. **Tratamento de erros de rede**: Captura de exceções durante o envio
3. **Feedback visual**: Atualização do estado da conversa independente do resultado
4. **Logs detalhados**: Registro de erros e sucessos no console para depuração

## Solução de Problemas

Se as mensagens não estiverem sendo enviadas:

1. Verifique se a URL base está correta (`https://apiwhatsapp.nexopdv.com`)
2. Confirme que a instância e a API key estão corretas
3. Verifique a formatação do número de telefone (deve incluir `@s.whatsapp.net`)
4. Verifique se o endpoint está correto (`/message/sendText/{instance}`)
5. Verifique os logs no console do navegador para erros específicos

## Notas de Implementação

1. O formato do número é crítico - sempre use o formato `@s.whatsapp.net`
2. O sistema suporta múltiplas instâncias, portanto sempre use a instância específica do usuário
3. Prefira utilizar o ID completo da conversa (que já contém o formato correto)
4. Implemente feedback visual imediato para melhorar a experiência do usuário
