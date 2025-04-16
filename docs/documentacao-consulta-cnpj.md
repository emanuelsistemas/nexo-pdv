# Documentação: Implementação de Consulta de CNPJ com BrasilAPI

Esta documentação descreve como implementar a funcionalidade de consulta de CNPJ utilizando a BrasilAPI em aplicações React, similar à implementação no componente `RegistrationForm.tsx`.

## Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Implementação Passo a Passo](#implementação-passo-a-passo)
   - [Validação de CNPJ](#validação-de-cnpj)
   - [Consulta à API](#consulta-à-api)
   - [Integração com o Formulário](#integração-com-o-formulário)
4. [Tratamento de Erros](#tratamento-de-erros)
5. [Considerações de UX](#considerações-de-ux)
6. [Código Completo](#código-completo)
7. [Referências](#referências)

## Visão Geral

A funcionalidade de consulta de CNPJ permite que usuários preencham automaticamente informações de empresas em formulários a partir do número de CNPJ. Isso melhora a experiência do usuário, reduz erros de digitação e garante dados mais precisos.

A implementação utiliza:
- Validação local do formato e dígitos verificadores do CNPJ
- Consulta à BrasilAPI para obter dados oficiais da empresa
- Preenchimento automático dos campos do formulário com os dados retornados

## Pré-requisitos

- Projeto React (pode ser usado com Next.js, Vite, Create React App, etc.)
- Dependências recomendadas:
  - `react-input-mask` (para máscaras de input)
  - Biblioteca de UI (opcional, como Tailwind CSS, Material UI, etc.)

## Implementação Passo a Passo

### Validação de CNPJ

Primeiro, implemente a função de validação de CNPJ que verifica:
1. Se o CNPJ tem 14 dígitos (após remover caracteres não numéricos)
2. Se não contém apenas dígitos repetidos
3. Se os dígitos verificadores são válidos

```javascript
function isValidCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  // Validação dos dígitos verificadores
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}
```

### Consulta à API

Em seguida, implemente a função para consultar a BrasilAPI:

```javascript
async function consultarCNPJ(cnpj) {
  setIsLoading(true);
  setError(null);
  
  try {
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
    
    if (!isValidCNPJ(cnpjLimpo)) {
      setError('CNPJ inválido. Verifique os números digitados.');
      setIsLoading(false);
      return;
    }
    
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        setError('CNPJ não encontrado na base de dados.');
      } else {
        setError('Erro ao consultar CNPJ. Tente novamente mais tarde.');
      }
      setIsLoading(false);
      return;
    }
    
    const data = await response.json();
    
    // Preencher os campos do formulário com os dados retornados
    setCompanyName(data.razao_social || '');
    setTradingName(data.nome_fantasia || '');
    setEmail(data.email || '');
    
    // Lógica adicional para mapear outros campos se necessário
    
  } catch (err) {
    console.error('Erro ao consultar CNPJ:', err);
    setError('Erro ao processar a consulta. Verifique sua conexão e tente novamente.');
  } finally {
    setIsLoading(false);
  }
}
```

### Integração com o Formulário

Integre a funcionalidade ao seu formulário React:

1. Configure os estados necessários:

```javascript
const [document, setDocument] = useState('');
const [companyName, setCompanyName] = useState('');
const [tradingName, setTradingName] = useState('');
const [email, setEmail] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
```

2. Adicione o campo de CNPJ com máscara e botão de consulta:

```jsx
<div className="relative">
  <label>CNPJ</label>
  <InputMask
    mask="99.999.999/9999-99"
    value={document}
    onChange={(e) => setDocument(e.target.value)}
    className="form-input"
    placeholder="00.000.000/0000-00"
  />
  <button
    type="button"
    onClick={() => consultarCNPJ(document)}
    disabled={isLoading || !document}
    className="search-button"
  >
    {isLoading ? (
      <Loader className="animate-spin" />
    ) : (
      <Search />
    )}
  </button>
</div>
```

3. Adicione a exibição de erros:

```jsx
{error && (
  <div className="error-message">
    <p>{error}</p>
  </div>
)}
```

4. Adicione os campos que serão preenchidos automaticamente:

```jsx
<div>
  <label>Razão Social</label>
  <input
    type="text"
    value={companyName}
    onChange={(e) => setCompanyName(e.target.value)}
    className="form-input"
  />
</div>

<div>
  <label>Nome Fantasia</label>
  <input
    type="text"
    value={tradingName}
    onChange={(e) => setTradingName(e.target.value)}
    className="form-input"
  />
</div>

<div>
  <label>E-mail</label>
  <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="form-input"
  />
</div>
```

## Tratamento de Erros

A implementação inclui tratamento para diferentes cenários de erro:

1. CNPJ com formato inválido (validação local)
2. CNPJ não encontrado na base de dados (status 404)
3. Erros de API (outros códigos de status)
4. Erros de rede ou exceções durante a consulta

Cada erro exibe uma mensagem específica para orientar o usuário sobre como proceder.

## Considerações de UX

Para melhorar a experiência do usuário:

1. **Indicador de carregamento**: Mostre um spinner durante a consulta
2. **Feedback visual claro**: Exiba mensagens de erro em destaque
3. **Botão de consulta desabilitado**: Desabilite o botão quando não houver CNPJ ou durante o carregamento
4. **Máscara de input**: Use máscara para facilitar a digitação no formato correto
5. **Campos editáveis**: Permita que o usuário edite os campos preenchidos automaticamente, caso necessário

## Código Completo

Aqui está um exemplo completo de um componente React com a funcionalidade de consulta de CNPJ:

```jsx
import { useState } from 'react';
import InputMask from 'react-input-mask';
import { Search, Loader } from 'your-icon-library'; // Substitua pela sua biblioteca de ícones

function CNPJForm() {
  const [document, setDocument] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Função para validar CNPJ
  function isValidCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]/g, '');
    
    if (cnpj.length !== 14) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cnpj)) return false;
    
    // Validação dos dígitos verificadores
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;
    
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) return false;
    
    return true;
  }

  // Função para consultar CNPJ na BrasilAPI
  async function consultarCNPJ(cnpj) {
    setIsLoading(true);
    setError(null);
    
    try {
      const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
      
      if (!isValidCNPJ(cnpjLimpo)) {
        setError('CNPJ inválido. Verifique os números digitados.');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('CNPJ não encontrado na base de dados.');
        } else {
          setError('Erro ao consultar CNPJ. Tente novamente mais tarde.');
        }
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Preencher os campos do formulário com os dados retornados
      setCompanyName(data.razao_social || '');
      setTradingName(data.nome_fantasia || '');
      setEmail(data.email || '');
      
    } catch (err) {
      console.error('Erro ao consultar CNPJ:', err);
      setError('Erro ao processar a consulta. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Lógica para enviar o formulário
    console.log({
      document,
      companyName,
      tradingName,
      email
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Campo de CNPJ com botão de consulta */}
      <div className="relative">
        <label className="block mb-1">CNPJ</label>
        <div className="flex">
          <InputMask
            mask="99.999.999/9999-99"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="00.000.000/0000-00"
          />
          <button
            type="button"
            onClick={() => consultarCNPJ(document)}
            disabled={isLoading || !document}
            className="ml-2 p-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {isLoading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Campos preenchidos automaticamente */}
      <div>
        <label className="block mb-1">Razão Social</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block mb-1">Nome Fantasia</label>
        <input
          type="text"
          value={tradingName}
          onChange={(e) => setTradingName(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block mb-1">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <button
        type="submit"
        className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Enviar
      </button>
    </form>
  );
}

export default CNPJForm;
```

## Referências

- [BrasilAPI - Documentação da API de CNPJ](https://brasilapi.com.br/docs#tag/CNPJ)
- [React Input Mask](https://github.com/sanniassin/react-input-mask)
- [Algoritmo de validação de CNPJ](https://www.geradorcnpj.com/algoritmo_do_cnpj.htm)