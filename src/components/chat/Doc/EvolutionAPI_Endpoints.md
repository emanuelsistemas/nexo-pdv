# Documentação de Endpoints da Evolution API

## Endpoints Disponíveis

### 1. Obter Foto de Perfil

**Endpoint:** `/chat/fetchProfilePictureUrl/{instance}`

**Método:** POST

**Descrição:** Este endpoint permite obter a URL da foto de perfil de um contato do WhatsApp.

**Parâmetros da URL:**
- `{instance}`: Nome da instância do WhatsApp configurada na Evolution API (exemplo: "123")

**Headers:**
- `apikey`: Chave de API para autenticação
- `Content-Type`: application/json

**Body (JSON):**
```json
{
  "number": "5511987654321@c.us"
}
```
Observação: O número deve estar no formato WhatsApp com o sufixo `@c.us`.

**Resposta (JSON):**
```json
{
  "wuid": "5511987654321@s.whatsapp.net",
  "profilePictureUrl": "https://pps.whatsapp.net/v/t61.2..."
}
```

Se o usuário não tiver foto de perfil, `profilePictureUrl` será `null`.

**Exemplo de Implementação:**
```typescript
const getProfilePicture = async (number: string): Promise<string | null> => {
  try {
    // Adicionar '@c.us' ao número se não tiver
    const formattedNumber = number.includes('@c.us') 
      ? number 
      : `${number}@c.us`;
    
    const response = await axios.post(
      `${apiBaseUrl}/chat/fetchProfilePictureUrl/${instanceName}`,
      {
        number: formattedNumber
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        }
      }
    );
    
    return response.data?.profilePictureUrl || null;
  } catch (err) {
    console.error('Erro ao obter foto de perfil:', err);
    return null;
  }
};
```

**Dicas de Uso:**
- Implemente cache para evitar requisições repetidas para o mesmo número
- Prepare a interface para lidar com casos onde a foto não está disponível
- Considere implementar timeout para evitar que requisições lentas bloqueiem a interface
