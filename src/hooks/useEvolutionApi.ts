import { useState, useCallback, useEffect } from 'react';
import { EvolutionApiConfig } from '../types/chat';
import { loadEvolutionApiConfig } from '../services/storage';
import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';

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
      console.log('Buscando histórico completo de mensagens da API Evolution...');
      
      // Array para armazenar todas as mensagens de todas as tentativas
      let allMessages: any[] = [];
      let anyRequestSuccessful = false;
      
      // ESTRATÉGIA 1: Buscar mensagens com o método findMessages (permite buscar mais mensagens)
      try {
        console.log(`Tentativa 1: Buscando mensagens com /chat/findMessages/${config.instanceName}`);
        
        const response = await axios.post(
          `${config.baseUrl}/chat/findMessages/${config.instanceName}`,
          { 
            where: {},  // Sem filtro para pegar todas as mensagens
            count: 100, // Aumentando o limite para 100 mensagens
            sort: {
              messageTimestamp: -1 // Ordenar por mais recentes primeiro
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': config.apikey
            }
          }
        );
        
        if (response.data?.messages?.length > 0) {
          console.log(`Tentativa 1: Encontradas ${response.data.messages.length} mensagens via findMessages`);
          allMessages = [...allMessages, ...response.data.messages];
          anyRequestSuccessful = true;
        } else {
          console.log('Tentativa 1: Nenhuma mensagem encontrada ou formato inválido');
        }
      } catch (err1) {
        console.log('Falha na Tentativa 1:', err1);
      }
      
      // ESTRATÉGIA 2: Buscar todas as conversas (retorna outras informações úteis)
      try {
        console.log(`Tentativa 2: Buscando conversas com /chat/fetchAllChats/${config.instanceName}`);
        
        const response2 = await axios.get(
          `${config.baseUrl}/chat/fetchAllChats/${config.instanceName}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': config.apikey
            }
          }
        );
        
        if (response2.data?.messages?.length > 0) {
          console.log(`Tentativa 2: Encontradas ${response2.data.messages.length} mensagens via fetchAllChats`);
          
          // Verificar se essas mensagens já estão no array (para evitar duplicação)
          const newMessages = response2.data.messages.filter((msg: any) => {
            // Verificar se esta mensagem já existe no array por ID
            return !allMessages.some(existingMsg => 
              existingMsg.key?.id === msg.key?.id && 
              existingMsg.key?.remoteJid === msg.key?.remoteJid
            );
          });
          
          if (newMessages.length > 0) {
            console.log(`Adicionando ${newMessages.length} novas mensagens únicas de fetchAllChats`);
            allMessages = [...allMessages, ...newMessages];
          }
          
          anyRequestSuccessful = true;
        } else {
          console.log('Tentativa 2: Nenhuma mensagem encontrada ou formato inválido');
        }
      } catch (err2) {
        console.log('Falha na Tentativa 2:', err2);
      }
      
      // ESTRATÉGIA 3: Buscar histórico para cada conversa conhecida
      try {
        // Obtendo a lista de todas as conversas primeiro
        console.log(`Tentativa 3: Buscando lista de conversas com /chat/fetchChats/${config.instanceName}`);
        
        const chatsResponse = await axios.get(
          `${config.baseUrl}/chat/fetchChats/${config.instanceName}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': config.apikey
            }
          }
        );
        
        if (chatsResponse.data?.chats?.length > 0) {
          const chats = chatsResponse.data.chats;
          console.log(`Encontradas ${chats.length} conversas. Buscando histórico para cada uma...`);
          
          // Para cada conversa, buscar o histórico
          for (const chat of chats.slice(0, 10)) { // Limitando a 10 conversas para não sobrecarregar
            if (chat.id) {
              try {
                console.log(`Buscando histórico para conversa ${chat.id}`);
                const historyResponse = await axios.post(
                  `${config.baseUrl}/chat/fetchMessages/${config.instanceName}`,
                  {
                    chatId: chat.id,
                    count: 50 // Buscar até 50 mensagens por conversa
                  },
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': config.apikey
                    }
                  }
                );
                
                if (historyResponse.data?.messages?.length > 0) {
                  console.log(`Encontradas ${historyResponse.data.messages.length} mensagens para conversa ${chat.id}`);
                  
                  // Adicionar apenas mensagens únicas
                  const newMessages = historyResponse.data.messages.filter((msg: any) => {
                    return !allMessages.some(existingMsg => 
                      existingMsg.key?.id === msg.key?.id && 
                      existingMsg.key?.remoteJid === msg.key?.remoteJid
                    );
                  });
                  
                  if (newMessages.length > 0) {
                    allMessages = [...allMessages, ...newMessages];
                  }
                }
              } catch (err) {
                console.log(`Erro ao buscar histórico para conversa ${chat.id}:`, err);
              }
            }
          }
          
          anyRequestSuccessful = true;
        }
      } catch (err3) {
        console.log('Falha na Tentativa 3:', err3);
      }
      
      // Verificar se alguma tentativa teve sucesso
      if (!anyRequestSuccessful && allMessages.length === 0) {
        throw new Error(`Todas as tentativas de buscar mensagens para a instância ${config.instanceName} falharam`);
      }

      setLoading(false);
      setError(null);
      
      console.log(`TOTAL DE ${allMessages.length} MENSAGENS ENCONTRADAS NA API!`);
      
      return { 
        messages: allMessages, 
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

  // Nova função: Obter contador de mensagens não lidas de uma conversa
  const getUnreadCount = useCallback(async (chatId: string): Promise<number> => {
    if (!config) {
      console.error('Configuração não encontrada para buscar contador');
      return 0;
    }

    try {
      // Buscar informações da conversa usando a API do Evolution
      const response = await axios.get(
        `${config.baseUrl}/chat/fetchChats/${config.instanceName}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.apikey
          }
        }
      );

      if (response.data?.chats) {
        // Encontrar a conversa com o ID correspondente
        const chat = response.data.chats.find((c: any) => c.id === chatId || c.id?.includes(chatId) || chatId.includes(c.id));
        
        if (chat && chat.unreadCount !== undefined) {
          console.log(`[API] Contador de não lidas para ${chatId}: ${chat.unreadCount}`);
          return Number(chat.unreadCount);
        } else {
          console.log(`[API] Conversa ${chatId} não encontrada ou sem contador`);
        }
      }
      
      return 0;
    } catch (err) {
      console.error('Erro ao buscar contador de não lidas:', err);
      return 0;
    }
  }, [config]);

  // Nova função: Marcar conversa como lida
  const markAsRead = useCallback(async (chatId: string): Promise<boolean> => {
    if (!config) {
      console.error('Configuração não encontrada para marcar como lida');
      return false;
    }

    try {
      console.log(`[API] Marcando conversa ${chatId} como lida`);
      
      const response = await axios.post(
        `${config.baseUrl}/chat/markMessageAsRead/${config.instanceName}`,
        { 
          chatId: chatId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.apikey
          }
        }
      );

      console.log('[API] Resposta da marcação como lida:', response.data);
      
      // Verificar se a operação foi bem-sucedida
      if (response.data && response.data.success) {
        return true;
      }
      
      // Alternativa: tentar outro endpoint se o primeiro falhar
      console.log('[API] Tentando endpoint alternativo para marcar como lida...');
      
      const response2 = await axios.post(
        `${config.baseUrl}/chat/markConversationAsRead/${config.instanceName}`,
        { 
          chatId: chatId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.apikey
          }
        }
      );
      
      console.log('[API] Resposta da alternativa:', response2.data);
      return true;
    } catch (err) {
      console.error('Erro ao marcar conversa como lida:', err);
      return false;
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
    getUnreadCount,  // Nova função exportada
    markAsRead,      // Nova função exportada
  };
};

export default useEvolutionApi;
