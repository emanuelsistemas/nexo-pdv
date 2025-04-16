# Documentação: Implementação de Autopreenchimento de Endereço com API ViaCEP

Esta documentação detalha como implementar a funcionalidade de autopreenchimento de endereço utilizando a API ViaCEP em um projeto React com TypeScript.

## 1. Visão Geral

A API ViaCEP é um serviço gratuito que permite consultar CEPs brasileiros e obter informações de endereço como logradouro, bairro, cidade e estado. Esta implementação permite que, ao digitar um CEP válido e clicar em um botão de busca, os campos de endereço sejam automaticamente preenchidos com os dados retornados pela API.

## 2. Requisitos

- React com TypeScript
- Sistema de gerenciamento de estado (useState no exemplo)
- Sistema de notificação (react-hot-toast no exemplo, mas pode ser substituído)
- Ícones (lucide-react no exemplo, mas pode ser substituído)

## 3. Implementação Passo a Passo

### 3.1. Estrutura do Estado

Primeiro, defina o estado para armazenar os dados do formulário, incluindo os campos de endereço:

```typescript
import React, { useState, useRef } from 'react';
import { Search } from 'lucide-react'; // ou qualquer biblioteca de ícones
import { toast, Toaster } from 'react-hot-toast'; // ou qualquer biblioteca de notificações

function EnderecoForm() {
  const [formData, setFormData] = useState({
    // Outros campos do formulário...
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    // Outros campos do formulário...
  });

  // Estado para controlar o carregamento durante a busca do CEP
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Referência para focar no campo de número após o preenchimento automático
  const numeroInputRef = useRef<HTMLInputElement>(null);
  
  // Resto do componente...
}
```

### 3.2. Formatação do CEP

Implemente uma função para formatar o CEP enquanto o usuário digita:

```typescript
const formatCEP = (value: string) => {
  return value
    .replace(/\D/g, '')         // Remove caracteres não numéricos
    .replace(/(\d{2})(\d)/, '$1.$2')  // Adiciona ponto após os primeiros 2 dígitos
    .replace(/(\d{3})(\d)/, '$1-$2')  // Adiciona hífen após os próximos 3 dígitos
    .slice(0, 10);              // Limita o tamanho
};
```

### 3.3. Manipulação de Entrada

Implemente a função para lidar com as mudanças nos campos de entrada, aplicando a formatação do CEP:

```typescript
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  if (name === 'cep') {
    setFormData({ ...formData, [name]: formatCEP(value) });
  } else {
    setFormData({ ...formData, [name]: value });
  }
};
```

### 3.4. Função de Busca de CEP

Implemente a função que fará a requisição à API ViaCEP:

```typescript
const searchCep = async () => {
  if (formData.cep.length < 8) {
    toast.error('Por favor, digite um CEP válido');
    return;
  }

  setIsSearchingCep(true);

  try {
    // Remove caracteres não numéricos e formata conforme esperado pela API
    const cepNumbers = formData.cep.replace(/\D/g, '');
    
    // Verifica se temos dígitos suficientes
    if (cepNumbers.length !== 8) {
      toast.error('CEP deve conter 8 dígitos');
      return;
    }

    const response = await fetch(`https://viacep.com.br/ws/${cepNumbers}/json/`);
    const data = await response.json();

    if (data.erro) {
      toast.error('CEP não encontrado');
      return;
    }

    // Atualiza o formulário com os dados de endereço
    setFormData(prev => ({
      ...prev,
      endereco: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf
    }));

    // Foca no campo de número
    setTimeout(() => {
      if (numeroInputRef.current) {
        numeroInputRef.current.focus();
      }
    }, 100);

    toast.success('Endereço preenchido com sucesso');
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    toast.error('Erro ao buscar CEP. Verifique sua conexão.');
  } finally {
    setIsSearchingCep(false);
  }
};
```

### 3.5. Componente de Interface

Implemente os campos de formulário com o botão de busca de CEP:

```tsx
return (
  <div className="container mx-auto p-4">
    <Toaster position="top-center" />
    <form className="space-y-4">
      {/* Outros campos do formulário... */}
      
      <div className="relative">
        <input
          type="tel"
          inputMode="numeric"
          name="cep"
          placeholder="CEP *"
          className="w-full px-4 py-3 text-base rounded-lg border focus:outline-none focus:border-blue-400 pr-10"
          value={formData.cep}
          onChange={handleInputChange}
          maxLength={10}
          required
        />
        <button
          type="button"
          onClick={searchCep}
          disabled={isSearchingCep || formData.cep.length < 8}
          className="absolute right-3 top-3.5 cursor-pointer"
        >
          <Search className={`w-5 h-5 ${isSearchingCep ? 'text-gray-500' : 'text-blue-400'}`} />
        </button>
      </div>

      <input
        type="text"
        name="endereco"
        placeholder="Endereço *"
        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:border-blue-400"
        value={formData.endereco}
        onChange={handleInputChange}
        required
      />

      <input
        type="tel"
        inputMode="numeric"
        name="numero"
        placeholder="Número *"
        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:border-blue-400"
        value={formData.numero}
        onChange={handleInputChange}
        required
        ref={numeroInputRef}
      />

      <input
        type="text"
        name="bairro"
        placeholder="Bairro *"
        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:border-blue-400"
        value={formData.bairro}
        onChange={handleInputChange}
        required
      />

      <input
        type="text"
        name="cidade"
        placeholder="Cidade *"
        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:border-blue-400"
        value={formData.cidade}
        onChange={handleInputChange}
        required
      />

      <input
        type="text"
        name="estado"
        placeholder="Estado *"
        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:border-blue-400"
        value={formData.estado}
        onChange={handleInputChange}
        required
      />
      
      {/* Outros campos do formulário... */}
      
      <button type="submit" className="w-full py-3 bg-blue-500 text-white rounded-lg">
        Enviar
      </button>
    </form>
  </div>
);
```

## 4. Detalhes da API ViaCEP

### 4.1. Endpoint

```
https://viacep.com.br/ws/{cep}/json/
```

Onde `{cep}` deve ser substituído pelo CEP que deseja consultar, apenas com números.

### 4.2. Resposta da API

A API retorna um objeto JSON com os seguintes campos:

```json
{
  "cep": "01001-000",
  "logradouro": "Praça da Sé",
  "complemento": "lado ímpar",
  "bairro": "Sé",
  "localidade": "São Paulo",
  "uf": "SP",
  "ibge": "3550308",
  "gia": "1004",
  "ddd": "11",
  "siafi": "7107"
}
```

Os campos mais relevantes para o preenchimento de endereço são:
- `logradouro`: Nome da rua, avenida, etc.
- `bairro`: Nome do bairro
- `localidade`: Nome da cidade
- `uf`: Sigla do estado

### 4.3. Tratamento de Erros

A API retorna um objeto com a propriedade `erro: true` quando o CEP não é encontrado:

```json
{
  "erro": true
}
```

## 5. Boas Práticas

1. **Validação do CEP**: Sempre valide se o CEP possui 8 dígitos antes de fazer a requisição.
2. **Feedback Visual**: Forneça feedback visual durante a busca (como um ícone de carregamento).
3. **Tratamento de Erros**: Trate os erros adequadamente e informe o usuário.
4. **Foco Automático**: Após o preenchimento automático, direcione o foco para o campo de número, que geralmente é o único que precisa ser preenchido manualmente.
5. **Formatação**: Formate o CEP para melhorar a experiência do usuário (ex: 12.345-678).

## 6. Exemplo Completo

Aqui está um exemplo completo de um componente React com TypeScript que implementa a busca de CEP:

```tsx
import React, { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

interface FormData {
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
}

function EnderecoForm() {
  const [formData, setFormData] = useState<FormData>({
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: ''
  });
  
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const numeroInputRef = useRef<HTMLInputElement>(null);

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1-$2')
      .slice(0, 10);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cep') {
      setFormData({ ...formData, [name]: formatCEP(value) });
    } else if (name === 'numero') {
      setFormData({ ...formData, [name]: value.replace(/\D/g, '') });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const searchCep = async () => {
    if (formData.cep.length < 8) {
      toast.error('Por favor, digite um CEP válido');
      return;
    }

    setIsSearchingCep(true);

    try {
      const cepNumbers = formData.cep.replace(/\D/g, '');
      
      if (cepNumbers.length !== 8) {
        toast.error('CEP deve conter 8 dígitos');
        return;
      }

      const response = await fetch(`https://viacep.com.br/ws/${cepNumbers}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setFormData(prev => ({
        ...prev,
        endereco: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf
      }));

      setTimeout(() => {
        if (numeroInputRef.current) {
          numeroInputRef.current.focus();
        }
      }, 100);

      toast.success('Endereço preenchido com sucesso');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP. Verifique sua conexão.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica para enviar o formulário
    console.log('Dados do formulário:', formData);
    toast.success('Formulário enviado com sucesso!');
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Toaster position="top-center" />
      <h1 className="text-2xl font-bold mb-6 text-center">Formulário de Endereço</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor="cep" className="block text-sm font-medium mb-1">CEP</label>
          <input
            id="cep"
            type="tel"
            inputMode="numeric"
            name="cep"
            placeholder="Digite o CEP"
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            value={formData.cep}
            onChange={handleInputChange}
            maxLength={10}
            required
          />
          <button
            type="button"
            onClick={searchCep}
            disabled={isSearchingCep || formData.cep.replace(/\D/g, '').length < 8}
            className="absolute right-3 top-8 cursor-pointer"
            aria-label="Buscar CEP"
          >
            <Search className={`w-5 h-5 ${isSearchingCep ? 'text-gray-400' : 'text-blue-500'}`} />
          </button>
        </div>

        <div>
          <label htmlFor="endereco" className="block text-sm font-medium mb-1">Endereço</label>
          <input
            id="endereco"
            type="text"
            name="endereco"
            placeholder="Rua, Avenida, etc."
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.endereco}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <label htmlFor="numero" className="block text-sm font-medium mb-1">Número</label>
          <input
            id="numero"
            type="tel"
            inputMode="numeric"
            name="numero"
            placeholder="Número"
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.numero}
            onChange={handleInputChange}
            required
            ref={numeroInputRef}
          />
        </div>

        <div>
          <label htmlFor="bairro" className="block text-sm font-medium mb-1">Bairro</label>
          <input
            id="bairro"
            type="text"
            name="bairro"
            placeholder="Bairro"
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.bairro}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <label htmlFor="cidade" className="block text-sm font-medium mb-1">Cidade</label>
          <input
            id="cidade"
            type="text"
            name="cidade"
            placeholder="Cidade"
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.cidade}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <label htmlFor="estado" className="block text-sm font-medium mb-1">Estado</label>
          <input
            id="estado"
            type="text"
            name="estado"
            placeholder="Estado"
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.estado}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

export default EnderecoForm;
```

## 7. Considerações Adicionais

### 7.1. Compatibilidade com Bibliotecas de Formulários

Se você estiver usando bibliotecas como React Hook Form ou Formik, a implementação pode ser adaptada. Por exemplo, com React Hook Form:

```tsx
import { useForm } from 'react-hook-form';

// Dentro do componente
const { register, setValue, handleSubmit, watch } = useForm();
const cep = watch('cep');

const searchCep = async () => {
  // Lógica similar à anterior
  
  // Ao invés de setFormData, use:
  setValue('endereco', data.logradouro);
  setValue('bairro', data.bairro);
  setValue('cidade', data.localidade);
  setValue('estado', data.uf);
};
```

### 7.2. Implementação com Hooks Personalizados

Para reutilização em vários componentes, você pode criar um hook personalizado:

```tsx
// hooks/useCepSearch.ts
import { useState } from 'react';

interface AddressData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export function useCepSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCep = async (cep: string): Promise<AddressData | null> => {
    if (!cep || cep.replace(/\D/g, '').length !== 8) {
      setError('CEP deve conter 8 dígitos');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cepNumbers = cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cepNumbers}/json/`);
      const data = await response.json();

      if (data.erro) {
        setError('CEP não encontrado');
        return null;
      }

      return data;
    } catch (err) {
      setError('Erro ao buscar CEP. Verifique sua conexão.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { searchCep, isLoading, error };
}
```

Uso do hook:

```tsx
// No componente
const { searchCep, isLoading, error } = useCepSearch();

const handleSearchCep = async () => {
  const data = await searchCep(formData.cep);
  if (data) {
    setFormData(prev => ({
      ...prev,
      endereco: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf
    }));
    
    // Foca no campo de número
    if (numeroInputRef.current) {
      numeroInputRef.current.focus();
    }
  }
};
```

## 8. Conclusão

A implementação da busca de CEP com a API ViaCEP é uma maneira eficiente de melhorar a experiência do usuário em formulários que exigem endereço. Ao seguir esta documentação, você poderá implementar essa funcionalidade em seus projetos React com TypeScript.