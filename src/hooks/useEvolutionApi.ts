import { useState, useCallback, useEffect } from 'react';
import { EvolutionApiConfig } from '../types/chat';
import { loadEvolutionApiConfig } from '../services/storage';
import axios from 'axios';

interface FetchMessagesResult {
  messages: any[];
  loading: boolean;
  error: string | null;
}

const useEvolutionApi = (externalConfig?: EvolutionApiConfig | null) => {
  // Usar configuração externa ou carregar do localStorage
  const [config, setConfig] = useState<EvolutionApiConfig | null>(externalConfig || loadEvolutionApiConfig());
  
  // Atualizar configuração quando a externa mudar
  useEffect(() => {
    if (externalConfig) {
      setConfig(externalConfig);
    }
  }, [externalConfig]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

  // Função para verificar o status da conexão
  const checkConnectionStatus = useCallback(async () => {
    if (!config) {
      setConnectionStatus('disconnected');
      setError('Configuração não encontrada');
      return false;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `${config.baseUrl}/instance/connectionState/${config.instanceName}`,
        {
          headers: {
            'apikey': config.apikey
          }
        }
      );

      const connected = 
        response.data?.state === 'open' ||
        response.data?.state === 'connected';
      
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      setError(null);
      setLoading(false);
      
      return connected;
    } catch (err: any) {
      console.error('Erro ao verificar status da conexão:', err);
      setConnectionStatus('disconnected');
      setError(`Erro ao verificar conexão: ${err.message}`);
      setLoading(false);
      return false;
    }
  }, [config]);

  // Função para buscar mensagens
  const fetchMessages = useCallback(async (): Promise<FetchMessagesResult> => {
    if (!config) {
      return { messages: [], loading: false, error: 'Configuração não encontrada' };
    }

    try {
      setLoading(true);
      // Implementando a mesma estratégia de fallback do ChatNexo
      // O ChatNexo tenta dois endpoints diferentes em sequência
      let responseData: any = null;
      
      try {
        // Tentativa 1: /chat/findMessages (como no ChatNexo)
        console.log(`Tentativa 1: Buscando mensagens com /chat/findMessages/${config.instanceName}`);
        
        const response = await axios.post(
          `${config.baseUrl}/chat/findMessages/${config.instanceName}`,
          { 
            where: {},
            count: 50
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': config.apikey
            }
          }
        );
        
        console.log('Resposta da API (/chat/findMessages) Tentativa 1:', response.data);
        responseData = response.data;
      } catch (err1) {
        console.log('Falha na Tentativa 1, tentando alternativa...');
        
        // Tentativa 2: /chat/fetchAllChats (como no ChatNexo)
        try {
          console.log(`Tentativa 2: Buscando mensagens com /chat/fetchAllChats/${config.instanceName}`);
          
          const response2 = await axios.get(
            `${config.baseUrl}/chat/fetchAllChats/${config.instanceName}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'apikey': config.apikey
              }
            }
          );
          
          console.log('Resposta da API (/chat/fetchAllChats) Tentativa 2:', response2.data);
          responseData = response2.data;
        } catch (err2) {
          console.error('Falha na Tentativa 2:', err2);
          throw new Error(`Todas as tentativas de buscar mensagens para a instância ${config.instanceName} falharam`);
        }
      }

      setLoading(false);
      setError(null);
      
      return { 
        messages: responseData?.messages || [], 
        loading: false, 
        error: null 
      };
    } catch (err: any) {
      console.error('Erro ao buscar mensagens:', err);
      setLoading(false);
      setError(`Erro ao buscar mensagens: ${err.message}`);
      
      return { 
        messages: [], 
        loading: false, 
        error: err.message 
      };
    }
  }, [config]);

  // Função para enviar mensagem
  const sendMessage = useCallback(async (
    number: string, 
    message: string
  ): Promise<boolean> => {
    if (!config) {
      setError('Configuração não encontrada');
      return false;
    }

    try {
      setLoading(true);
      
      // Adicionar '@c.us' ao número se não tiver
      const formattedNumber = number.includes('@c.us') 
        ? number 
        : `${number}@c.us`;

      const response = await axios.post(
        `${config.baseUrl}/message/text/${config.instanceName}`,
        {
          number: formattedNumber,
          options: {
            delay: 1200,
            presence: 'composing'
          },
          textMessage: {
            text: message
          }
        },
        {
          headers: {
            'apikey': config.apikey,
            'Content-Type': 'application/json'
          }
        }
      );

      setLoading(false);
      setError(null);
      
      return response.data?.status === 'success';
    } catch (err: any) {
      console.error('Erro ao enviar mensagem:', err);
      setLoading(false);
      setError(`Erro ao enviar mensagem: ${err.message}`);
      return false;
    }
  }, [config]);

  // Função para atualizar a configuração da API
  const updateConfig = useCallback((
    newConfig: EvolutionApiConfig
  ) => {
    setConfig(newConfig);
    // Salvar no localStorage usando a função do serviço
    localStorage.setItem('evolution_api_config', JSON.stringify(newConfig));
  }, []);

  // Função para obter a URL da foto de perfil de um contato
  const getProfilePicture = useCallback(async (
    number: string
  ): Promise<string | null> => {
    if (!config) {
      setError('Configuração não encontrada');
      return null;
    }

    try {
      // Adicionar '@c.us' ao número se não tiver
      const formattedNumber = number.includes('@c.us') 
        ? number 
        : `${number}@c.us`;

      console.log(`Buscando foto de perfil para ${formattedNumber}`);
      
      const response = await axios.post(
        `${config.baseUrl}/chat/fetchProfilePictureUrl/${config.instanceName}`,
        {
          number: formattedNumber
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.apikey
          }
        }
      );

      console.log('Resposta da API (foto de perfil):', response.data);
      
      return response.data?.profilePictureUrl || null;
    } catch (err: any) {
      console.error('Erro ao obter foto de perfil:', err);
      return null;
    }
  }, [config]);

  return {
    config,
    loading,
    error,
    connectionStatus,
    checkConnectionStatus,
    fetchMessages,
    sendMessage,
    updateConfig,
    getProfilePicture
  };
};

export default useEvolutionApi;
