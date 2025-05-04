import { useState, useCallback } from 'react';
import { EvolutionApiConfig } from '../types/chat';
import { loadEvolutionApiConfig } from '../services/storage';
import axios from 'axios';

interface FetchMessagesResult {
  messages: any[];
  loading: boolean;
  error: string | null;
}

const useEvolutionApi = () => {
  const [config, setConfig] = useState<EvolutionApiConfig | null>(loadEvolutionApiConfig());
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
      const response = await axios.get(
        `${config.baseUrl}/message/fetch/${config.instanceName}`,
        {
          headers: {
            'apikey': config.apikey
          }
        }
      );

      setLoading(false);
      setError(null);
      
      return { 
        messages: response.data?.messages || [], 
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

  return {
    config,
    loading,
    error,
    connectionStatus,
    checkConnectionStatus,
    fetchMessages,
    sendMessage,
    updateConfig
  };
};

export default useEvolutionApi;
