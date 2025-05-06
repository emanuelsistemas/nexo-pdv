# Documentação: Integração de Avatares com Evolution API

## Visão Geral

Este documento descreve a implementação da funcionalidade de avatares (fotos de perfil) de contatos do WhatsApp no Nexo PDV, utilizando a Evolution API v2.2.3.

## Endpoints da Evolution API

Após extensivos testes, identificamos o endpoint correto para buscar avatares:

```
POST /chat/fetchProfilePictureUrl/{instance}
```

**Parâmetros:**
- `instance`: Nome da instância do WhatsApp (Ex: "123")
- Body: `{ "number": "55XXXXXXXXXXX@s.whatsapp.net" }`

**Headers:**
- `Content-Type: application/json`
- `apikey: SUA_API_KEY`

**Exemplo de requisição:**

```bash
curl --request POST \
  --url https://apiwhatsapp.nexopdv.com/chat/fetchProfilePictureUrl/123 \
  --header 'Content-Type: application/json' \
  --header 'apikey: 429683C4C977415CAAFCCE10F7D57E11' \
  --data '{ "number": "5512996807562@s.whatsapp.net" }'
```

**Resposta:**

```json
{
  "wuid": "5512996807562@s.whatsapp.net",
  "profilePictureUrl": "https://pps.whatsapp.net/v/t61.24694-24/486418798_2783341408517086_5430540270000304751_n.jpg?ccb=11-4&oh=01_Q5Aa1QFDYDemBjdezQ0lDNNN3VMS-W9wbE1Vk7Kg1sgBySehJg&oe=68275491&_nc_sid=5e03e0&_nc_cat=106"
}
```

## Implementação

Nossa implementação adota uma abordagem híbrida com múltiplas camadas de persistência:

1. **Carregamento direto da API**: Componente Avatar busca a foto diretamente da Evolution API
2. **Cache em localStorage**: As URLs das fotos são armazenadas localmente para acesso rápido
3. **Banco de dados**: As URLs também são salvas no banco para persistência entre dispositivos

### Fluxo de dados

1. Quando o componente Avatar é renderizado, ele verifica:
   - Se existe uma URL no banco de dados, usa esta URL
   - Se não, verifica se existe uma URL no localStorage
   - Se não, busca a URL diretamente da API Evolution

2. Após obter a URL da API, ela é:
   - Usada imediatamente para exibir o avatar
   - Salva no localStorage com timestamp para uso futuro
   - (Opcionalmente) Salva no banco de dados pelo processo periódico de atualização de avatares

### Componentes Principais

1. **Avatar component (ConversationList.tsx)**
   - Responsável por exibir a foto do perfil
   - Busca a foto diretamente da API quando necessário
   - Utiliza um ícone padrão quando não há foto disponível

2. **fetchProfilePictureUrl (avatarService.ts)**
   - Função para buscar a URL da foto na API Evolution
   - Lida com formatação de números e tratamento de erros

3. **saveAvatarToLocalStorage (ConversationList.tsx)**
   - Armazena as URLs das fotos no localStorage para acesso rápido
   - Inclui timestamp para controle de validade do cache

## Vantagens desta Abordagem

1. **Carregamento em tempo real**: As fotos são carregadas instantaneamente, sem depender do banco de dados
2. **Resiliência**: O sistema continua funcionando mesmo sem conexão com o banco de dados
3. **Performance**: Uso de cache local reduz a quantidade de chamadas à API
4. **Experiência do usuário**: Minimização da latência percebida pelo usuário

## Solução de Problemas

Se as fotos de perfil não estiverem aparecendo:

1. Verifique se o endpoint está correto (/chat/fetchProfilePictureUrl/{instance})
2. Confirme que a instância e a API key estão corretas
3. Verifique a formatação do número de telefone (deve incluir @s.whatsapp.net)
4. Limpe o localStorage e recarregue a página
5. Verifique os logs no console do navegador para erros específicos
