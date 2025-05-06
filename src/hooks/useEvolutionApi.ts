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

  // Função simplificada para apenas devolver array vazio
  // Não tentamos mais buscar mensagens da API, apenas usamos o banco de dados
  // O Socket.io vai notificar sobre novas mensagens em tempo real
  const fetchMessages = useCallback(async (): Promise<FetchMessagesResult> => {
    // Sempre retornamos um array vazio já que carregamos do banco de dados, não da API
    console.log('Não carregando mensagens da API - usando banco de dados local como fonte da verdade');
    return { 
      messages: [], 
      loading: false, 
      error: null 
    };
  }, []);

  // Função para enviar mensagem
  const sendMessage = useCallback(async (
    number: string, 
    message: string
  ): Promise<boolean> => {
    if (!config) {
      setError('Configuração não encontrada');
      console.error('[useEvolutionApi] Falha no envio: configuração não encontrada');
      return false;
    }

    try {
      setLoading(true);
      
      // Verificar o formato do número - Suportar os dois formatos padrão do WhatsApp
      let formattedNumber;
      if (number.includes('@s.whatsapp.net') || number.includes('@c.us')) {
        formattedNumber = number;
      } else {
        // Formatar para o padrão @s.whatsapp.net que é usado pela Evolution API
        formattedNumber = `${number}@s.whatsapp.net`;
      }
      
      console.log(`[useEvolutionApi] Enviando mensagem para: ${formattedNumber}`);
      console.log(`[useEvolutionApi] Conteúdo: "${message}"`);
      console.log(`[useEvolutionApi] URL: ${config.baseUrl}/message/sendText/${config.instanceName}`);
      
      // Tentar enviar via API Evolution
      // Correção do endpoint para usar sendText em vez de text conforme documentação
      const response = await axios.post(
        `${config.baseUrl}/message/sendText/${config.instanceName}`,
        {
          number: formattedNumber,
          text: message
        },
        {
          headers: {
            'apikey': config.apikey,
            'Content-Type': 'application/json'
          }
        }
      );

      // Verificar se a resposta foi bem sucedida
      const success = response.data?.status === 'success';
      console.log(`[useEvolutionApi] Resposta do envio:`, response.data);
      console.log(`[useEvolutionApi] Mensagem enviada com sucesso: ${success ? 'SIM' : 'NÃO'}`);

      setLoading(false);
      setError(null);
      
      return success;
    } catch (err: any) {
      console.error('[useEvolutionApi] Erro ao enviar mensagem:', err);
      console.error('[useEvolutionApi] Detalhes do erro:', err.response?.data || err.message);
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
